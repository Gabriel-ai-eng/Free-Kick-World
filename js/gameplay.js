"use strict";
// =========================================================================
// GAMEPLAY — movimento, pulo, chute, física da bola e gol
// =========================================================================
// =========================================================================
//  LÓGICA
// =========================================================================
function moveVec(){
  let mx=0,my=0;
  if(keys['a']||keys['arrowleft'])mx-=1; if(keys['d']||keys['arrowright'])mx+=1;
  if(keys['w']||keys['arrowup'])my-=1;   if(keys['s']||keys['arrowdown'])my+=1;
  mx+=stickVec.x; my+=stickVec.y;
  const l=Math.hypot(mx,my); if(l>1){mx/=l;my/=l;}
  return {x:mx,y:my,l:Math.min(1,l)};
}
const JUMP_V=340, GRAV=980;     // velocidade inicial e gravidade do pulo (px/s)
function jump(){
  if(state.scene!=='game'||!state.running) return;
  if(player.kicking || player.jumping) return;   // não interrompe chute/pulo em andamento
  player.jumping=true; player.jumpT=0;            // toca a animação de pulo
}
function kick(){
  if(state.scene!=='game'||!state.running) return;
  if(player.kicking) return;                         // já está no meio de um chute
  const m=moveVec();
  let ax=m.x, ay=m.y;
  if(Math.hypot(ax,ay)<0.2){ ax=0; ay=-1; }          // sem direção: chuta pro gol (fundo)
  else { const n=Math.hypot(ax,ay); ax/=n; ay/=n; }

  // PARADO: toca a animação de chute parado e gruda a bola no ponto do pé.
  if(!player.moving){
    player.kicking=true; player.kickT=0; kickFired=false;
    for(const ev of KICK_EVENTS) ev.done=false;   // re-arma os eventos de animação
    kickDir={ x:ax, y:ay };
    if(ax>0.05) player.face=1; else if(ax<-0.05) player.face=-1;
    // Se a bola está por perto, posiciona-a exatamente onde o pé encosta no contato
    // (à frente do jogador, no chão). Ela espera ali até o quadro de contato.
    const du=ball.u-player.u, dv=ball.v-player.v;
    kickBall = (Math.hypot(du, dv*1.4) < 0.20);
    if(kickBall){
      // mesma largura com que o quadro é DESENHADO (render.js normaliza por CH)
      const w = depthScale(player.v)*(KICK_SH.FW/KICK_SH.CH);
      const fieldW = Math.abs(uvToScreen(1,player.v).x - uvToScreen(0,player.v).x) || 1;
      ball.u = player.u + player.face*KICK_FOOT_DX*w/fieldW;
      ball.v = player.v;
      ball.vu = 0; ball.vv = 0;
    }
    return;
  }

  // EM MOVIMENTO: chute instantâneo atual (a folha de chute andando/correndo virá depois).
  const du=ball.u-player.u, dv=ball.v-player.v;
  if(Math.hypot(du,dv*1.4) < 0.085){
    ball.vu = ax*1.35; ball.vv = ay*1.35;
  }
}

function update(dt){
  if(state.scene!=='game' || isPortrait()) return;

  // ANIMAÇÃO DE CHUTE PARADO: roda a folha de chute; no quadro de contato a bola
  // (se estiver por perto) é lançada e sai rolando pelo campo. Movimento fica travado.
  if(player.kicking){
    player.moving=false; player.running=false;
    const prevT=player.kickT;
    player.kickT += dt*KICK_FPS;
    // dispara os EVENTOS DE ANIMACAO cruzados neste passo (ex.: contato com a bola)
    for(const ev of KICK_EVENTS){
      if(!ev.done && prevT < ev.frame && player.kickT >= ev.frame){ ev.done=true; ev.action(); }
    }
    // antes do contato, a bola fica parada grudada no ponto do pé
    if(kickBall && !kickFired){ ball.vu=0; ball.vv=0; }
    // gravidade (caso esteja no ar) e fim da animação
    player.vz -= GRAV*dt; player.z += player.vz*dt; if(player.z<0){ player.z=0; player.vz=0; }
    if(player.kickT >= KICK_SH.frames){ player.kicking=false; }
    ballPhysics(dt);
    return;
  }

  // ANIMAÇÃO DE PULO: toca a folha de pulo; a altura (z) é gerada por código e
  // sincronizada com a animação — sobe na decolagem e zera na aterrissagem.
  if(player.jumping){
    player.moving=false; player.running=false;
    player.jumpT += dt*JUMP_FPS;
    const f=player.jumpT;
    if(f>=JUMP_TO && f<=JUMP_LD){
      const ph=(f-JUMP_TO)/(JUMP_LD-JUMP_TO);            // 0..1 do tempo no ar
      player.z = depthScale(player.v)*JUMP_Z * Math.sin(Math.PI*ph);
    } else {
      player.z = 0;                                       // agachado/recuperando: no chão
    }
    if(player.jumpT >= JUMP_SH.frames){ player.jumping=false; player.z=0; }
    ballPhysics(dt);
    return;
  }

  const m=moveVec();
  player.moving = m.l>0.12;
  if(player.moving){
    // direção normalizada + intensidade (0..1) do quanto o joystick foi empurrado
    const dirx=m.x/(m.l||1), diry=m.y/(m.l||1);
    // Joystick perto da borda (intensidade alta) → CORRE; pouco empurrão → ANDA.
    // Histerese: entra em corrida em 0.88 e só sai abaixo de 0.66, p/ NÃO ficar
    // piscando a troca de sprite (andar↔correr) quando o joystick fica no limiar.
    const RUN_THR=0.82, WALK=0.14, RUN=0.28;
    if (m.l>=0.88) player.running=true; else if (m.l<=0.66) player.running=false;
    const speed = m.l<RUN_THR
      ? WALK*(m.l/RUN_THR)                                  // anda: devagar→normal
      : WALK + (RUN-WALK)*((m.l-RUN_THR)/(1-RUN_THR));      // corre: acelera no talo
    // deslocamento real neste frame (no espaço do campo)
    const du = dirx*speed*dt, dv = diry*speed*0.95*dt;
    player.u += du;
    player.v += dv;
    if(dirx> 0.05) player.face= 1; else if(dirx<-0.05) player.face=-1;
    // Cadência da animação por TEMPO (não por distância): garante pernas/braços/tronco
    // sempre fluidos, sem "travar" em passos lentos. Levemente proporcional ao empurrão
    // do joystick p/ manter a velocidade natural de caminhada de um jogador. O loop é
    // infinito (módulo nº de quadros), passando por TODOS os quadros em sequência.
    const animFps = player.running ? (9 + 5*m.l) : (9 + 5*(m.l/RUN_THR));
    player.anim += dt * animFps;
  } else {
    player.running = false;
  }
  // Limites do campo: o jogador alcança as LINHAS BRANCAS (0..1). Dentro da boca
  // do gol, pode entrar na trave (v abaixo de 0, até -GOAL_NET).
  player.u = Math.max(0, Math.min(1, player.u));
  const pInGoal = player.u > GOAL.uMin && player.u < GOAL.uMax;
  player.v = Math.max(pInGoal ? -GOAL_NET : 0, Math.min(1, player.v));

  // pulo: altura (z) em px na tela, com gravidade
  player.vz -= GRAV*dt;
  player.z  += player.vz*dt;
  if(player.z<0){ player.z=0; player.vz=0; }

  // DRIBLE por CONTATO REAL do pé com a bola.
  // Modela a passada a partir da folha em uso (WALK_SH ao andar, RUN_SH ao correr):
  // o pé da frente avança (reach) na direção em que o jogador olha e SOBE/DESCE
  // (footLift) conforme o quadro. Como o pé erguido fica fisicamente mais alto que
  // a bola (no chão), só há contato — e portanto arrasto — quando um pé BAIXO e
  // ADIANTADO encosta nela. Nada de empurrar a bola de longe.
  if(state.running && player.moving && player.z<6 && Math.hypot(ball.vu,ball.vv)<0.9){
    const sheet = player.running ? RUN_SH : WALK_SH;          // folha de corrida/caminhada
    const pf = uvToScreen(player.u, player.v);                // base = pés do jogador
    const charH = depthScale(player.v);
    const charW = charH * (sheet.FW / (sheet.CH||sheet.FH));   // largura DESENHADA (render.js)
    // fase do passo: 2 passadas (um pé de cada vez) por ciclo completo da folha
    const phase = (player.anim / sheet.frames) * 4 * Math.PI;
    const swing = Math.max(0, Math.sin(phase));              // avanço do pé da frente (0..1)
    // pé da frente: parte da base e estica na passada, na direção em que o jogador olha
    const footX = pf.x + player.face * (0.08 + (player.running ? 0.26 : 0.18) * swing) * charW;
    // o pé SOBE conforme avança e DESCE ao plantar: quando está no ar (alto) não
    // alcança a bola (que está no chão), então só há contato com o pé baixo.
    const footLift = (player.running ? 0.14 : 0.10) * charH * swing;
    const footY = pf.y - footLift;
    const footR = charW * 0.30;                              // raio de contato dos pés
    // bola na tela (mesma projeção/zoom do jogador)
    const pb = uvToScreen(ball.u, ball.v);
    const ballR = Math.max(3, depthScale(ball.v) * 0.085);
    const dxp = pb.x - footX, dyp = (pb.y - ballR) - footY;
    if(Math.hypot(dxp, dyp) < footR + ballR){
      ball.vu = m.x * 0.85; ball.vv = m.y * 0.80;            // arrasta na direção do movimento
    }
  }

  ballPhysics(dt);
}

// Física da bola (integração + atrito + paredes + linha de fundo/gol). Numa função
// própria para rodar tanto no fluxo normal quanto durante a animação de chute.
function ballPhysics(dt){
  ball.u+=ball.vu*dt; ball.v+=ball.vv*dt;
  const fr=Math.pow(0.20,dt); ball.vu*=fr; ball.vv*=fr;
  if(Math.abs(ball.vu)<0.01) ball.vu=0; if(Math.abs(ball.vv)<0.01) ball.vv=0;
  // paredes laterais (linhas brancas)
  if(ball.u<0){ball.u=0; ball.vu*=-0.7;} if(ball.u>1){ball.u=1; ball.vu*=-0.7;}
  // linha de frente (perto)
  if(ball.v>1){ball.v=1; ball.vv*=-0.7;}
  // linha de fundo: dentro da boca a bola ENTRA na trave (e é GOL); fora, bate na linha
  if(ball.v<0){
    if(ball.u>GOAL.uMin && ball.u<GOAL.uMax){
      if(ball.v<-GOAL_NET){ ball.v=-GOAL_NET; ball.vv*=-0.5; }       // fundo da rede
      if(!goalScored && ball.v<-0.015){ goalScored=true; scoreGoal(); } // entrou na trave → gol
    } else { ball.v=0; ball.vv*=-0.7; }                              // bate na linha de fundo
  }
}

let goalFlash=0;
function scoreGoal(){
  state.score++; document.getElementById('score').textContent=state.score;
  flashMsg('GOOOOL!'); goalFlash=1; state.running=false;
  scheduleSave();   // persiste o novo placar
  setTimeout(()=>{ if(state.scene==='game'){ resetPositions(); state.running=true; } },1000);
}
const msgEl=document.getElementById('msg');
function flashMsg(t){ msgEl.textContent=t; msgEl.style.opacity=1; setTimeout(()=>msgEl.style.opacity=0,1000); }


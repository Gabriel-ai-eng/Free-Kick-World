"use strict";
// =========================================================================
// RENDER — câmera na tela, desenho do estádio, do jogador e da bola
// =========================================================================
// =========================================================================
//  RENDER
// =========================================================================
function render(){
  ctx.clearRect(0,0,CW,CH);
  layoutStadium();
  // transição suave Longe <-> Perto
  cam.prog += ((cam.near?1:0) - cam.prog) * 0.15;
  const t = cam.prog;

  // fundo (fora da imagem do estádio)
  ctx.fillStyle='#05080f'; ctx.fillRect(0,0,CW,CH);

  const inGame = (state.scene==='game' || state.scene==='end');
  // Câmera-perseguição: no Perto centraliza o personagem e o mantém sempre do
  // mesmo tamanho (zoom dinâmico). No Longe (t=0) volta ao enquadramento normal.
  ctx.save();
  cam.spriteScale = 1;
  if(inGame){
    const p = uvToScreen(player.u, player.v);     // pés do personagem (base)
    const charH = depthScale(player.v);           // altura do sprite (base, zoom 1)
    // --- LONGE (t=0): visão geral com o CAMPO INTEIRO o maior possível na tela ---
    // Cantos do campo em px de tela; encaixe "contain" (o campo todo cabe).
    const c00=uvToScreen(0,0), c10=uvToScreen(1,0), c01=uvToScreen(0,1), c11=uvToScreen(1,1);
    const fL=Math.min(c00.x,c10.x,c01.x,c11.x), fR=Math.max(c00.x,c10.x,c01.x,c11.x);
    const fT=Math.min(c00.y,c10.y,c01.y,c11.y), fB=Math.max(c00.y,c10.y,c01.y,c11.y);
    const fcx=(fL+fR)/2, fcy=(fT+fB)/2;           // centro do campo
    const zFar = Math.max(1, Math.min(CW/(fR-fL), CH/(fB-fT)) * FIELD_FILL);
    // --- PERTO (t=1): zoom dinâmico p/ o personagem ocupar CHAR_ON_SCREEN ---
    const zNear = Math.max(1, Math.min(8, (CH*CHAR_ON_SCREEN)/charH));
    // zoom da transição Longe↔Perto, multiplicado pelo zoom livre do usuário (pinça)
    const zoom  = lerp(zFar, zNear, t) * cam.userZoom;
    // ponto do MUNDO que vai p/ o centro: centro do campo (Longe) → meio do corpo (Perto)
    const wx = lerp(fcx, p.x, t), wy = lerp(fcy, p.y - charH*0.5, t);
    // esse ponto sempre vai para o CENTRO da tela
    ctx.translate(CW/2, CH/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-wx, -wy);
    // Contra-escala do sprite: no Longe o campo cresce por zFar, mas o personagem
    // deve manter o MESMO tamanho na tela → desenhamos o sprite 1/zFar menor.
    // No Perto isso vira 1 (o zNear já dimensiona o personagem).
    cam.spriteScale = lerp(1/zFar, 1, t);
  }

  // estádio PROCEDURAL MODULAR (camadas estáticas blitadas do offscreen)
  Stadium.draw(ctx, img.dx, img.dy, img.dw, img.dh);

  // gramado VIVO: vento + marcas de deformação onde jogador/bola passaram
  // (js/turf.js) — desenhado sobre a grama e SOB o jogador/bola.
  Turf.draw(ctx);

  if(inGame){
    // ordena por profundidade (v) p/ sobreposição correta
    const ents=[
      {v:ball.v,    d:drawBall},
      {v:player.v,  d:drawPlayer},
    ].sort((a,b)=>a.v-b.v);
    ents.forEach(e=>e.d());
  }

  ctx.restore();

  // vinheta suave: dá profundidade e aspecto "cinematográfico" em alta resolução
  const vg=ctx.createRadialGradient(CW/2, CH*0.55, CH*0.25, CW/2, CH*0.55, CH*0.95);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.42)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,CW,CH);

  if(goalFlash>0){ goalFlash-=0.03;
    ctx.fillStyle=`rgba(252,211,77,${Math.max(0,goalFlash)*0.30})`; ctx.fillRect(0,0,CW,CH); }

  // CAMADA CLIMÁTICA (chuva/neve/névoa) — dinâmica, por cima de tudo
  if(state.scene==='game' || state.scene==='end') Stadium.weather(ctx);
}

function shadow(x,y,w){ ctx.imageSmoothingEnabled=true; ctx.fillStyle='rgba(0,0,0,0.30)';
  ctx.beginPath(); ctx.ellipse(x,y,w,w*0.35,0,0,Math.PI*2); ctx.fill(); }

function drawPlayer(){
  const p=uvToScreen(player.u,player.v);
  // Chutando parado usa a folha de CHUTE; andando a de CAMINHADA; correndo a de CORRIDA.
  const jumping = player.jumping;
  const kicking = player.kicking && !jumping;
  const run = !kicking && !jumping && player.running && player.moving;
  // PARADO com animação de idle (se a folha já carregou); senão, cai no quadro 0
  // da caminhada. A folha idle é enquadrada igual à caminhada (mesma altura/pés).
  const idleReady = (typeof A.idle!=='undefined') && A.idle.complete && A.idle.naturalWidth>0 && typeof IDLE_SH!=='undefined';
  const idle = !jumping && !kicking && !player.moving && idleReady;
  const sheet = jumping ? JUMP_SH : kicking ? KICK_SH : idle ? IDLE_SH : (run ? RUN_SH : WALK_SH);
  const sprite = jumping ? A.jump : kicking ? A.kick : idle ? A.idle : (run ? A.runner : A.walk);
  const ss=cam.spriteScale||1;                    // contra-escala p/ manter o tamanho na tela
  // hChar = altura do CORPO na tela (igual em todas as folhas). O QUADRO é
  // desenhado FH/CH maior, compensando a folga transparente de cada arte —
  // assim correndo, andando, pulando ou chutando o jogador tem o MESMO tamanho.
  const hChar=depthScale(player.v)*ss;
  const h=hChar*(sheet.FH/(sheet.CH||sheet.FH)), w=h*(sheet.FW/sheet.FH);
  const pz=player.z*ss;                            // altura do pulo acompanha a contra-escala
  // sombra fica menor quanto mais alto está o pulo; baseada na ALTURA do corpo
  // (a largura do quadro varia por folha e fazia a sombra pular de tamanho)
  const sj=1/(1+pz/Math.max(20,hChar*0.6));
  shadow(p.x, p.y, hChar*0.23*sj);
  // quadro de animação
  // A folha de caminhada é um ciclo contínuo (18 quadros): andando, passamos por
  // TODOS em sequência (loop). Parado (sem a folha de idle) cai no quadro 0.
  let f;
  if(jumping){
    f = Math.min(sheet.frames-1, Math.max(0, Math.floor(player.jumpT)));
  } else if(kicking){
    f = Math.min(sheet.frames-1, Math.max(0, Math.floor(player.kickT)));
  } else if(idle){
    f = Math.floor(performance.now()/IDLE_MS) % IDLE_SH.frames;   // loop por tempo
  } else if(!player.moving){
    f = 0;   // fallback: idle não carregou → quadro parado da caminhada
  } else {
    f = Math.floor(player.anim) % sheet.frames;
  }
  const col=f%sheet.cols, row=Math.floor(f/sheet.cols);
  ctx.imageSmoothingEnabled=true;        // filtragem suave (alta qualidade, sem serrilhado)
  ctx.imageSmoothingQuality='high';
  ctx.save();
  ctx.translate(p.x, p.y - pz);               // levanta o sprite na altura do pulo
  if(player.face<0) ctx.scale(-1,1);          // espelha p/ esquerda
  ctx.drawImage(sprite, col*sheet.FW,row*sheet.FH,sheet.FW,sheet.FH, -w/2,-h, w,h);
  ctx.restore();
}

let spin=0;
function drawBall(){
  const p=uvToScreen(ball.u,ball.v);
  const r=Math.max(3, depthScale(ball.v)*0.085*(cam.spriteScale||1));
  spin+=(Math.abs(ball.vu)+Math.abs(ball.vv))*0.3;
  shadow(p.x,p.y, r*1.1);
  // Bola nova (imagem): desenha o sprite girando conforme a velocidade.
  if(typeof ballImg!=='undefined' && ballImg.complete && ballImg.naturalWidth>0){
    ctx.save();
    ctx.translate(p.x, p.y-r);
    ctx.rotate(spin);
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(ballImg, -r, -r, r*2, r*2);
    ctx.restore();
    return;
  }
  // Fallback procedural (enquanto a imagem carrega / se faltar): bola branca
  // com um ponto escuro girando.
  ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,p.y-r,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=Math.max(1,r*0.18); ctx.stroke();
  ctx.fillStyle='#1f2937';
  ctx.beginPath(); ctx.arc(p.x+Math.cos(spin)*r*0.4, p.y-r+Math.sin(spin)*r*0.4, r*0.32,0,Math.PI*2); ctx.fill();
}
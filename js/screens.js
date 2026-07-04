"use strict";
// =========================================================================
// SCREENS — navegação, telas/HUD, tela cheia, início/fim de partida e cronômetro
// =========================================================================
// Botão Voltar:
//  • dentro do jogo / fim / tabela  → volta para a TELA INICIAL (Jogar bola / Ver tabela);
//  • já na tela inicial              → sai para a Home do Alps OS (salva antes de navegar).
function goToTitle(){
  // Se saiu no meio de uma PARTIDA, marca como pausada para poder RETOMAR no
  // ponto exato (posição do jogador/bola, placar e tempo) ao tocar em Jogar.
  if(state.scene==='game') state.paused=true;
  state.running=false; clearInterval(timerId);
  hud.classList.remove('on'); pad.classList.remove('on');
  state.scene='title'; show('title');
  saveNow();   // salva o estado (inclusive a partida pausada)
}
// Sai do jogo para a Home do Alps OS (salva antes, com um teto de 600ms).
function goHome(){
  const go=()=>{ window.location.href='/home'; };
  Promise.race([ saveNow(), new Promise(r=>setTimeout(r,600)) ]).finally(go);
}
document.getElementById('backBtn').onclick=()=>{
  if(state.scene==='title') goHome();
  else goToTitle();
};
// "Cancelar" na tela "VIRE O CELULAR": volta direto para a Home.
const rotateCancel=document.getElementById('rotateCancel');
if(rotateCancel) rotateCancel.onclick=goHome;

// =========================================================================
//  TELAS
// =========================================================================
const scr={title:document.getElementById('scrTitle'),end:document.getElementById('scrEnd'),tabela:document.getElementById('scrTabela')};
const hud=document.getElementById('hud'), pad=document.getElementById('pad');
const backBtn=document.getElementById('backBtn');
if(backBtn) backBtn.style.display='none';   // a HOME é a 1ª tela; show() cuida do resto
// Mostra a tela pedida (esconde as outras). Na HOME o próprio menu tem o botão
// VOLTAR, então escondemos o "← Voltar" do topo para não sobrepor a arte.
function show(n){ for(const k in scr) scr[k].classList.add('hidden'); if(scr[n]) scr[n].classList.remove('hidden');
  if(backBtn) backBtn.style.display = (n==='title') ? 'none' : ''; }

// Toast rápido "em breve" para as áreas ainda não implementadas.
const toastEl=document.getElementById('toast'); let toastId=null;
function toast(t){ if(!toastEl) return; toastEl.textContent=t; toastEl.classList.add('on');
  clearTimeout(toastId); toastId=setTimeout(()=>toastEl.classList.remove('on'),1400); }

// Clique com "pulinho": o botão salta/aumenta (classe .pop no hotspot) e a
// ação roda 170ms depois — tempo de ver o retorno visual antes da tela mudar.
// (A tela cheia não quebra: o pointerdown global já pede fullscreen no toque.)
function popGo(id, fn){
  const el=document.getElementById(id); if(!el) return;
  el.onclick=()=>{ el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); setTimeout(fn,170); };
}

// "Bounce press" do botão JOGAR: microanimação de feedback com SÓ escala e glow,
// pivot exatamente no centro (transform-origin 50% 50%). Usa o próprio sprite/UI
// do botão (a janela espelhada), sem recriar nada.
//   • pointer down → escala 1.00→1.08 em ~80ms (easeOutBack, "salto") + glow +20%
//   • segurando    → mantém 1.08 e o glow reforçado
//   • pointer up   → 1.08→1.00 com pequeno overshoot em 1.03 (~120ms, elástico)
// A ação roda logo após soltar, para o bounce ser visível antes da tela mudar
// (a tela cheia é preservada pelo pointerdown global, que já pede fullscreen).
function pressGo(id, fn){
  const el=document.getElementById(id); if(!el) return;
  el.style.transformOrigin='50% 50%';
  let raf=0, held=false;
  const easeOutBack=t=>{ const c1=1.70158, c3=c1+1; return 1 + c3*Math.pow(t-1,3) + c1*Math.pow(t-1,2); };
  const curScale=()=>{ const m=/scale\(([\d.]+)\)/.exec(el.style.transform); return m?parseFloat(m[1]):1; };
  function anim(dur, sample, done){
    cancelAnimationFrame(raf);
    const t0=performance.now();
    (function frame(now){
      let p=(now-t0)/dur; if(p>1) p=1;
      el.style.transform='scale('+sample(p).toFixed(4)+')';
      if(p<1) raf=requestAnimationFrame(frame); else { raf=0; if(done) done(); }
    })(performance.now());
  }
  function press(){
    if(held) return; held=true;
    el.classList.add('pressed'); el.style.zIndex='3';
    const from=curScale();
    anim(80, p=> from + (1.08-from)*easeOutBack(p));   // salto até 1.08 (easeOutBack)
  }
  function release(runAction){
    if(!held) return; held=false;
    el.classList.remove('pressed');
    const from=curScale();                              // normalmente 1.08
    anim(120, p=>{                                      // 1.08 → 1.00 → 1.03 → 1.00
      if(p<0.5)  return from + (1.00-from)*(p/0.5);
      if(p<0.78) return 1.00 + 0.03*((p-0.5)/0.28);
      return 1.03 - 0.03*((p-0.78)/0.22);
    }, ()=>{ el.style.transform='scale(1)'; el.style.zIndex=''; });
    if(runAction) setTimeout(fn, 130);
  }
  el.addEventListener('pointerdown', press);
  el.addEventListener('pointerup',   ()=>release(true));
  el.addEventListener('pointercancel', ()=>release(false));
  el.addEventListener('pointerleave', ()=>release(false));
  // Teclado (acessibilidade): mesmo bounce ao acionar por Enter/Espaço.
  el.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); press(); } });
  el.addEventListener('keyup',   e=>{ if(e.key==='Enter'||e.key===' '){ release(true); } });
}

// "JOGAR": bounce press. "INICIAR": mantém o pop simples.
// Se há uma partida pausada (o jogador saiu no meio), RETOMA de onde parou;
// senão, inicia uma partida nova.
pressGo('startGame', ()=>{ if(state.paused) resumeMatch(); else startMatch('full'); });
popGo('startQuick', ()=>{ if(state.paused) resumeMatch(); else startMatch('quick'); });
// "RANKING": abre a tela de classificação (placeholder por enquanto).
popGo('btnRanking', ()=>{ show('tabela'); state.scene='tabela'; });
// "VOLTAR" (menu da home): sai para a Home do Alps OS (salva antes).
popGo('btnVoltar', goHome);
// Áreas ainda não implementadas: só avisam "em breve".
popGo('btnPersonaliza', ()=>toast('Personalização em breve 👕'));
popGo('btnEvento',      ()=>toast('Evento especial em breve ✨'));
popGo('btnEstadio',     ()=>toast('Mais estádios em breve 🏟️'));
popGo('btnSettings',    ()=>toast('Configurações em breve ⚙️'));
popGo('btnChat',        ()=>toast('Chat em breve 💬'));
// "JOGAR DE NOVO" (tela de fim): a partida acabou, então começa uma nova.
document.getElementById('playAgain').onclick=()=>startMatch(state.mode);
// Tela de RANKING (placeholder por enquanto)
document.getElementById('tabelaBack').onclick=()=>{ show('title'); state.scene='title'; };

// AUTOMÁTICO ao girar: assim que o celular fica na HORIZONTAL (paisagem) e ainda
// não está em tela cheia, tenta entrar em tela cheia e travar em paisagem — para
// que o jogo já comece cheio na mesma hora (igual ao Projeto Armor). Escuta
// orientationchange, resize e o matchMedia de paisagem. O setTimeout dá um
// instante para o layout assentar antes de checar a orientação.
function autoTelaCheiaPaisagem(){ if(!isPortrait() && !isFullscreen()) goFullscreen(); }
// IMPORTANTE: chamamos goFullscreen SÍNCRONO dentro dos handlers para preservar o
// "gesto do usuário" (ex.: tocar no botão de girar do navegador conta como gesto).
// Um setTimeout aqui QUEBRARIA esse gesto e o navegador bloquearia a tela cheia.
// O retry atrasado é só um reforço para quando o layout ainda não assentou.
window.addEventListener('orientationchange', ()=>{ autoTelaCheiaPaisagem(); setTimeout(autoTelaCheiaPaisagem, 120); });
window.addEventListener('resize', autoTelaCheiaPaisagem);
const mqPaisagem = window.matchMedia('(orientation: landscape)');
if(mqPaisagem.addEventListener) mqPaisagem.addEventListener('change', autoTelaCheiaPaisagem);
else if(mqPaisagem.addListener) mqPaisagem.addListener(autoTelaCheiaPaisagem); // Safari antigo
// ESSENCIAL: o Chromium (Chrome/Opera/Edge) só libera requestFullscreen SEM
// toque enquanto dispara o evento 'change' do screen.orientation — girar o
// celular só conta como gesto dentro dele. Os listeners acima (resize,
// orientationchange, matchMedia) NÃO carregam essa permissão; sem esta linha
// a tela cheia automática ao girar era bloqueada em silêncio. É o mesmo
// listener que faz o Projeto Armor entrar em tela cheia só de virar.
try { screen.orientation.addEventListener('change', autoTelaCheiaPaisagem); } catch(_){}

// PLANO B (gesto do usuário): a maioria dos navegadores mobile só libera tela
// cheia a partir de um toque. Quando a rotação não conta como gesto, o
// requestFullscreen automático acima falha em silêncio — então o primeiro toque
// na tela (em paisagem) entra em tela cheia. O toque em qualquer lugar serve.
document.addEventListener('pointerdown', ()=>{ if(!isPortrait() && !isFullscreen()) goFullscreen(); });

// Pede tela cheia (e tenta travar em paisagem). Nunca age com o celular em pé.
function goFullscreen(){
  if(isPortrait()) return;
  const el=document.documentElement;
  const req=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;
  try { const r=req&&req.call(el); if(r&&r.catch) r.catch(()=>{}); } catch(_){}
  try { if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); } catch(_){}
}
function isFullscreen(){ return !!(document.fullscreenElement || document.webkitFullscreenElement); }
document.addEventListener('fullscreenchange', resize);
document.addEventListener('webkitfullscreenchange', resize);

function startMatch(mode){
  state.mode = (mode==='full') ? 'full' : 'quick';
  state.paused=false;   // partida NOVA: não é retomada
  goFullscreen();
  show(null); state.scene='game'; state.score=0; state.running=true;
  hud.classList.add('on'); pad.classList.add('on');
  document.getElementById('score').textContent='0';
  const halfEl=document.getElementById('half');
  if(state.mode==='full'){
    // Partida completa: 1º tempo, cronômetro em 00:00 subindo até 45:00.
    state.half=1; state.clock=0;
    halfEl.style.display=''; halfEl.textContent='1º TEMPO';
    document.getElementById('time').textContent=fmtClock(0);
  } else {
    // Partida rápida: contagem regressiva de 60s (como antes).
    state.time=60;
    halfEl.style.display='none';
    document.getElementById('time').textContent='60';
  }
  resetPositions(); startTimer();
  scheduleSave();   // persiste a partida recém-iniciada
}
// Retoma uma partida PAUSADA no ponto EXATO: usa o jogador/bola/placar/tempo que
// já estão na memória (restaurados do Supabase, se veio de outra sessão). NÃO
// chama resetPositions — por isso tudo fica igual a quando o jogador saiu.
function resumeMatch(){
  state.paused=false;
  goFullscreen();
  show(null); state.scene='game'; state.running=true;
  hud.classList.add('on'); pad.classList.add('on');
  document.getElementById('score').textContent=state.score;
  const halfEl=document.getElementById('half');
  if(state.mode==='full'){
    halfEl.style.display=''; halfEl.textContent=(state.half===2?'2º TEMPO':'1º TEMPO');
    document.getElementById('time').textContent=fmtClock(state.clock);
  } else {
    halfEl.style.display='none';
    document.getElementById('time').textContent=state.time;
  }
  startTimer();     // sem resetPositions: continua de onde parou
  scheduleSave();
}
function resetPositions(){
  player.u=0.5; player.v=0.72; player.face=1; player.anim=0; player.running=false; player.z=0; player.vz=0;
  player.kicking=false; player.kickT=0; kickFired=false; kickBall=false;
  player.jumping=false; player.jumpT=0;
  ball.u=0.5; ball.v=0.58; ball.vu=0; ball.vv=0;
  goalScored=false;   // libera a contagem do próximo gol
}
let timerId=null;
function startTimer(){ clearInterval(timerId); timerId=setInterval(()=>{
  if(!state.running || isPortrait()) return;
  if(state.mode==='full'){
    // cronômetro crescente; ao chegar a 45 min troca de tempo / encerra
    state.clock++;
    if(state.clock>=HALF_SECONDS){
      if(state.half===1){
        // FIM DO 1º TEMPO → recomeça no 2º tempo, zera o cronômetro
        state.half=2; state.clock=0;
        document.getElementById('half').textContent='2º TEMPO';
        document.getElementById('time').textContent=fmtClock(0);
        flashMsg('2º TEMPO'); resetPositions(); scheduleSave();
      } else {
        endMatch(); return;   // fim do 2º tempo → fim de jogo
      }
    } else {
      document.getElementById('time').textContent=fmtClock(state.clock);
    }
  } else {
    state.time--; document.getElementById('time').textContent=state.time;
    if(state.time<=0) endMatch();
  }
},1000); }
function endMatch(){ state.running=false; state.paused=false; clearInterval(timerId);
  hud.classList.remove('on'); pad.classList.remove('on');
  document.getElementById('endScore').textContent=`Você marcou ${state.score} gol${state.score===1?'':'s'}!`;
  show('end'); state.scene='end';
  recordHistory(state.score);   // registra a partida no histórico
  saveNow();                    // salva o estado 'end' (placar final) p/ retomar na tela de fim
  loadBest();                   // atualiza o recorde mostrado no título
}


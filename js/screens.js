"use strict";
// =========================================================================
// SCREENS — navegação, telas/HUD, tela cheia, início/fim de partida e cronômetro
// =========================================================================
// Botão Voltar:
//  • dentro do jogo / fim / tabela  → volta para a TELA INICIAL (Jogar bola / Ver tabela);
//  • já na tela inicial              → sai para a Home do Alps OS (salva antes de navegar).
function goToTitle(){
  state.running=false; clearInterval(timerId);
  hud.classList.remove('on'); pad.classList.remove('on');
  state.scene='title'; show('title');
  saveNow();   // best-effort
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
function show(n){ for(const k in scr) scr[k].classList.add('hidden'); if(scr[n]) scr[n].classList.remove('hidden'); }
document.getElementById('startGame').onclick=()=>startMatch('full');    // "JOGAR" → partida completa (1º e 2º tempo)
document.getElementById('startQuick').onclick=()=>startMatch('quick');  // "INICIAR / partida rápida" → 60s (como está)
document.getElementById('playAgain').onclick=()=>startMatch(state.mode);// joga de novo no mesmo modo da partida anterior
// Tela de TABELA (placeholder por enquanto)
document.getElementById('tabelaBack').onclick=()=>{ show('title'); state.scene='title'; };

// Entra em tela cheia SOMENTE quando o celular está DEITADO (paisagem) E o
// usuário TOCA na tela. Não entra sozinho ao girar, nem com o celular em pé.
// O toque em qualquer lugar da tela cumpre o gesto exigido pelo navegador.
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
function endMatch(){ state.running=false; clearInterval(timerId);
  hud.classList.remove('on'); pad.classList.remove('on');
  document.getElementById('endScore').textContent=`Você marcou ${state.score} gol${state.score===1?'':'s'}!`;
  show('end'); state.scene='end';
  recordHistory(state.score);   // registra a partida no histórico
  saveNow();                    // salva o estado 'end' (placar final) p/ retomar na tela de fim
  loadBest();                   // atualiza o recorde mostrado no título
}


"use strict";
// =========================================================================
// PERSISTENCE — login e salvar/retomar o progresso no Supabase
// =========================================================================
// =========================================================================
//  PERSISTÊNCIA (Supabase) — salva o jogo do usuário e retoma de onde parou
// =========================================================================
// Mesma origem do app React → o supabase-js restaura sozinho a sessão guardada
// no localStorage. Sem login/sem config, o jogo segue funcionando sem salvar.
let sb=null, gameUser=null, saveQueued=false;

function snapshot(){
  return {
    scene: state.scene, score: state.score, time: state.time,
    mode: state.mode, half: state.half, clock: state.clock,
    // paused: havia uma partida em andamento (guardada) ao salvar; será
    // retomada no ponto exato quando o jogador tocar em Jogar.
    paused: !!state.paused,
    // Estado COMPLETO do jogador para retomar no lugar EXATO onde ele parou
    // (posição no campo, direção, animação, pulo e chute em andamento).
    player: {
      u:player.u, v:player.v, face:player.face, anim:player.anim,
      moving:player.moving, running:player.running,
      z:player.z, vz:player.vz,
      kicking:player.kicking, kickT:player.kickT,
      jumping:player.jumping, jumpT:player.jumpT,
    },
    ball:   { u:ball.u, v:ball.v, vu:ball.vu, vv:ball.vv },
    cam:    { near: cam.near, userZoom: cam.userZoom },
    savedAt: Date.now(),
  };
}

function scheduleSave(){
  if(!sb || !gameUser || saveQueued) return;
  saveQueued=true;
  setTimeout(()=>{ saveQueued=false; saveNow(); }, 800);   // debounce
}

async function saveNow(){
  if(!sb || !gameUser) return;
  try{
    await sb.from('fkw_game_state').upsert({
      user_id: gameUser.id, state: snapshot(), updated_at: new Date().toISOString(),
    });
  }catch(_){}
}

async function recordHistory(score){
  if(!sb || !gameUser) return;
  try{
    await sb.from('fkw_match_history').insert({ user_id: gameUser.id, score: score, duration: 60 });
  }catch(_){}
}

async function loadBest(){
  if(!sb || !gameUser) return;
  try{
    const { data } = await sb.from('fkw_match_history')
      .select('score').eq('user_id', gameUser.id).order('score',{ ascending:false }).limit(1);
    const best = (data && data[0]) ? data[0].score : 0;
    const el = document.getElementById('recorde');
    if(el) el.textContent = best>0 ? `🏆 Seu recorde: ${best} gol${best===1?'':'s'}` : '';
  }catch(_){}
}

// Lê o estado salvo do usuário no Supabase e retoma de onde parou (posição do
// jogador/bola, placar, tempo, cena). Sem isso, o jogo sempre começava do zero.
async function loadState(){
  if(!sb || !gameUser) return;
  try{
    const { data } = await sb.from('fkw_game_state')
      .select('state').eq('user_id', gameUser.id).limit(1);
    const row = data && data[0];
    if(row && row.state) applySnapshot(row.state);
  }catch(_){ /* offline/sem estado: começa na tela inicial */ }
}

function applySnapshot(s){
  if(!s || state.scene!=='title') return;   // não sobrescreve se o usuário já começou
  if(s.player) Object.assign(player, s.player);
  if(s.ball)   Object.assign(ball, s.ball);
  if(s.cam){
    cam.near=!!s.cam.near;
    if(typeof s.cam.userZoom==='number') cam.userZoom=Math.max(USER_ZOOM_MIN, Math.min(USER_ZOOM_MAX, s.cam.userZoom));
    updateCamBtn();
  }
  // Partida em andamento salva (pausada, ou a aba foi fechada no meio do jogo):
  // restaura TUDO na memória (posição já aplicada acima; aqui o placar, tempo e
  // modo) e deixa PRONTA para retomar. Fica na tela inicial — ao tocar em Jogar,
  // resumeMatch() continua no ponto EXATO onde o jogador parou.
  if(s.paused || s.scene==='game'){
    state.mode = (s.mode==='full') ? 'full' : 'quick';
    state.score = s.score||0;
    if(state.mode==='full'){ state.half=s.half||1; state.clock=s.clock||0; }
    else { state.time=(typeof s.time==='number'?s.time:60); }
    state.paused = true;
    show('title'); state.scene='title';
  } else if(s.scene==='end'){
    state.scene='end'; state.score=s.score||0;
    document.getElementById('endScore').textContent=`Você marcou ${state.score} gol${state.score===1?'':'s'}!`;
    show('end');
  }
}

// Cria o cliente supabase uma única vez (necessário já na tela de login).
function ensureClient(){
  if(sb) return sb;
  const C = window.__ALPS_SB__;
  if(!C || !C.url || !C.anonKey || !window.supabase) return null;
  sb = window.supabase.createClient(C.url, C.anonKey);
  return sb;
}

// Vai SEMPRE direto para a tela inicial do jogo. Não há tela de login nem chip de
// conta: se o jogador já tem sessão do Alps (mesma origem), reaproveitamos ela
// em silêncio para salvar o progresso; sem sessão, apenas joga sem salvar.
async function initPersistence(){
  try{
    if(!ensureClient()){ show('title'); state.scene='title'; return; } // sem config: joga sem salvar
    const { data } = await sb.auth.getUser();
    gameUser = (data && data.user) ? data.user : null;
    show('title'); state.scene='title';
    if(gameUser){ await loadBest(); await loadState(); }
  }catch(_){ show('title'); state.scene='title'; } // offline: segue sem persistência
}

// Autosave periódico durante a partida + salvar ao ocultar/sair a aba.
setInterval(()=>{ if(state.scene==='game' && state.running) scheduleSave(); }, 3000);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') saveNow(); });
window.addEventListener('pagehide', ()=>{ saveNow(); });

// Se o Supabase está configurado, esconde o título até sabermos se há sessão
// (initPersistence decide entre 'login' e 'title'). Sem config, joga direto.
(function(){ const C=window.__ALPS_SB__; if(C && C.url && C.anonKey) show(null); })();
initPersistence();


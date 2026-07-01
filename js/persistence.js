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
    player: { u:player.u, v:player.v, face:player.face, anim:player.anim, running:player.running },
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
  if(s.scene==='game'){
    state.scene='game'; state.score=s.score||0; state.running=true;
    state.mode = (s.mode==='full') ? 'full' : 'quick';
    document.getElementById('score').textContent=state.score;
    const halfEl=document.getElementById('half');
    if(state.mode==='full'){
      state.half=s.half||1; state.clock=s.clock||0;
      halfEl.style.display=''; halfEl.textContent=(state.half===2?'2º TEMPO':'1º TEMPO');
      document.getElementById('time').textContent=fmtClock(state.clock);
    } else {
      state.time=(typeof s.time==='number'?s.time:60);
      halfEl.style.display='none';
      document.getElementById('time').textContent=state.time;
    }
    show(null); hud.classList.add('on'); pad.classList.add('on');
    startTimer();
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

// Reflete o estado de login na UI (chip "Sair" no topo direito).
function updateAuthUI(){
  const chip=document.getElementById('authStatus'), em=document.getElementById('authEmail');
  if(gameUser){ if(em) em.textContent=gameUser.email||'conta'; if(chip) chip.classList.remove('hidden'); }
  else { if(chip) chip.classList.add('hidden'); }
}

// Traduz os erros mais comuns do Supabase Auth para PT-BR.
function traduzErroAuth(err){
  const m=(err && err.message ? err.message : '').toLowerCase();
  if(m.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if(m.includes('email not confirmed')) return 'E-mail ainda não confirmado. Confirme pelo app Alps.';
  if(m.includes('network')||m.includes('fetch')||m.includes('failed to fetch')) return 'Sem conexão. Tente de novo.';
  return (err && err.message) ? err.message : 'Não foi possível entrar.';
}

async function initPersistence(){
  try{
    if(!ensureClient()){ show('title'); return; }     // sem config: joga sem salvar
    const { data } = await sb.auth.getUser();
    gameUser = (data && data.user) ? data.user : null;
    if(gameUser){ updateAuthUI(); await loadBest(); show('title'); state.scene='title'; await loadState(); }
    else { show('login'); }                            // sem sessão: pede login
  }catch(_){ show('title'); }                          // offline: segue sem persistência
}

// ---- Login / logout na própria origem do jogo (mesmas contas do Alps) ----
const loginForm=document.getElementById('loginForm');
if(loginForm) loginForm.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const email=(document.getElementById('loginEmail').value||'').trim().toLowerCase();
  const pass=document.getElementById('loginPass').value||'';
  const errEl=document.getElementById('loginErr'), btn=document.getElementById('loginBtn');
  errEl.textContent='';
  if(!ensureClient()){ errEl.textContent='Configuração do Supabase ausente.'; return; }
  if(!email || !pass){ errEl.textContent='Preencha e-mail e senha.'; return; }
  btn.disabled=true; btn.textContent='ENTRANDO…';
  try{
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error) throw error;
    gameUser = (data && data.user) ? data.user : null;
    updateAuthUI(); await loadBest();
    document.getElementById('loginPass').value='';
    show('title'); state.scene='title'; await loadState();
  }catch(err){ errEl.textContent=traduzErroAuth(err); }
  finally{ btn.disabled=false; btn.textContent='ENTRAR'; }
});

// Jogar como convidado (sem salvar).
const guestBtn=document.getElementById('playGuest');
if(guestBtn) guestBtn.onclick=()=>{ gameUser=null; updateAuthUI(); show('title'); state.scene='title'; };

// Sair: salva o que der, encerra a sessão e volta para o login.
const authStatusBtn=document.getElementById('authStatus');
if(authStatusBtn) authStatusBtn.onclick=async ()=>{
  try{ await saveNow(); }catch(_){}
  try{ if(sb) await sb.auth.signOut(); }catch(_){}
  gameUser=null; updateAuthUI(); show('login'); state.scene='title';
};

// Autosave periódico durante a partida + salvar ao ocultar/sair a aba.
setInterval(()=>{ if(state.scene==='game' && state.running) scheduleSave(); }, 3000);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') saveNow(); });
window.addEventListener('pagehide', ()=>{ saveNow(); });

// Se o Supabase está configurado, esconde o título até sabermos se há sessão
// (initPersistence decide entre 'login' e 'title'). Sem config, joga direto.
(function(){ const C=window.__ALPS_SB__; if(C && C.url && C.anonKey) show(null); })();
initPersistence();


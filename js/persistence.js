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

// ---------- JOGOS SEPARADOS ----------
// "Jogar" (partida completa) e "Partida Rápida" são JOGOS INDEPENDENTES: cada
// um tem suas PRÓPRIAS tabelas no Supabase e seu próprio save — pausar/terminar
// um não mexe no save do outro.
//   full  (Jogar)          → fkw_game_state       / fkw_match_history
//   quick (Partida Rápida) → fkw_quick_game_state / fkw_quick_match_history
const SAVE_TABLES = {
  full:  { state:'fkw_game_state',       history:'fkw_match_history' },
  quick: { state:'fkw_quick_game_state', history:'fkw_quick_match_history' },
};
// Save de cada jogo carregado/atualizado na memória. O save de um jogo só entra
// em campo quando o jogador toca no botão DAQUELE jogo (playMode em screens.js).
const savedGames = { full:null, quick:null };
const modeKey = m => (m==='full' ? 'full' : 'quick');

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
  // Na tela inicial (ou nas Configurações) sem partida pausada em memória não
  // há nada novo a salvar — e escrever aqui sobrescreveria o save (ainda não
  // retomado) daquele jogo.
  if((state.scene==='title'||state.scene==='settings') && !state.paused) return;
  const mode=modeKey(state.mode);
  const snap=snapshot();
  savedGames[mode]=snap;               // memória primeiro: vale mesmo sem login
  if(!sb || !gameUser) return;
  try{
    await sb.from(SAVE_TABLES[mode].state).upsert({
      user_id: gameUser.id, state: snap, updated_at: new Date().toISOString(),
    });
  }catch(_){}
}

async function recordHistory(score){
  if(!sb || !gameUser) return;
  const mode=modeKey(state.mode);
  const dur = (mode==='full' && typeof HALF_SECONDS!=='undefined') ? HALF_SECONDS*2 : 60;
  try{
    await sb.from(SAVE_TABLES[mode].history)
      .insert({ user_id: gameUser.id, score: score, duration: dur, mode: mode });
  }catch(_){}
}

async function loadBest(){
  if(!sb || !gameUser) return;
  try{
    // Recorde geral = melhor placar entre os DOIS jogos (cada um no seu banco).
    const q = t => sb.from(t).select('score').eq('user_id', gameUser.id)
                     .order('score',{ ascending:false }).limit(1);
    const [f, k] = await Promise.all([ q(SAVE_TABLES.full.history), q(SAVE_TABLES.quick.history) ]);
    const best = Math.max(
      (f.data && f.data[0]) ? f.data[0].score : 0,
      (k.data && k.data[0]) ? k.data[0].score : 0);
    const el = document.getElementById('recorde');
    if(el) el.textContent = best>0 ? `🏆 Seu recorde: ${best} gol${best===1?'':'s'}` : '';
  }catch(_){}
}

// Lê o save de CADA jogo (Jogar e Partida Rápida) para a memória. NADA entra em
// campo ainda: o save de um jogo só é aplicado quando o jogador toca no botão
// daquele jogo (playMode → applyMatchSnapshot → resumeMatch).
async function loadState(){
  if(!sb || !gameUser) return;
  try{
    const read = t => sb.from(t).select('state').eq('user_id', gameUser.id).limit(1)
      .then(r => (r.data && r.data[0]) ? r.data[0].state : null, () => null);
    const rows = await Promise.all([ read(SAVE_TABLES.full.state), read(SAVE_TABLES.quick.state) ]);
    // Compatibilidade: um save antigo de Partida Rápida pode estar na tabela do
    // Jogar (era compartilhada antes da separação). Classifica cada snapshot
    // pelo MODO gravado nele; em duplicidade, fica o mais recente.
    for(const s of rows){
      if(!s) continue;
      const m=modeKey(s.mode);
      if(!savedGames[m] || (s.savedAt||0) > (savedGames[m].savedAt||0)) savedGames[m]=s;
    }
    // Preferências de câmera e possível tela de fim: do save mais recente.
    const rec=[savedGames.full, savedGames.quick].filter(Boolean)
      .sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))[0];
    if(rec && rec.cam){
      cam.near=!!rec.cam.near;
      if(typeof rec.cam.userZoom==='number') cam.userZoom=Math.max(USER_ZOOM_MIN, Math.min(USER_ZOOM_MAX, rec.cam.userZoom));
      updateCamBtn();
    }
    if(rec && rec.scene==='end' && !rec.paused && state.scene==='title'){
      state.scene='end'; state.score=rec.score||0; state.mode=modeKey(rec.mode);
      document.getElementById('endScore').textContent=`Você marcou ${state.score} gol${state.score===1?'':'s'}!`;
      show('end');
    }
  }catch(_){ /* offline/sem estado: começa na tela inicial */ }
}

// Coloca em campo o save de UM jogo — chamado na hora de retomar aquele jogo
// (toque no botão do modo). Restaura posição do jogador/bola, placar e tempo,
// e marca como pausado: resumeMatch() continua do ponto EXATO.
function applyMatchSnapshot(s){
  if(!s) return;
  if(s.player) Object.assign(player, s.player);
  if(s.ball)   Object.assign(ball, s.ball);
  state.mode = modeKey(s.mode);
  state.score = s.score||0;
  if(state.mode==='full'){ state.half=s.half||1; state.clock=s.clock||0; }
  else { state.time=(typeof s.time==='number'?s.time:60); }
  state.paused = true;
}

// ---------- Cache local da foto (aparece na hora, sem esperar a consulta) ----------
// A URL da última foto vista fica guardada no aparelho: assim que o jogo abre,
// ela já é aplicada (cfgSetFoto), antes mesmo da sessão/consulta ao Supabase
// responderem — corrige sozinha depois se a foto real for outra. Puramente
// cosmético (evita a silhueta piscar antes da foto de verdade chegar); quem
// manda é sempre o banco.
const AVATAR_CACHE_KEY = 'fkw_avatar_url';
function avatarCacheGet(){ try{ return localStorage.getItem(AVATAR_CACHE_KEY) || null; }catch(_){ return null; } }
function avatarCacheSet(url){ try{ if(url) localStorage.setItem(AVATAR_CACHE_KEY, url); }catch(_){} }
(function(){
  const cached = avatarCacheGet();
  if(cached && typeof cfgSetFoto==='function') cfgSetFoto(cached);
})();

// ---------- Foto de perfil (compartilhada com o AlpsPrime-OS / Projeto Armor) ----------
// Mesma tabela `usuarios` (coluna profile_picture_url) e mesmo bucket de
// Storage ("uploads", pasta avatars/<uid>/) que o Projeto Armor já usa — MESMA
// conta, mesmo projeto Supabase. Se o jogador já tem foto lá, ela aparece
// aqui também; trocar a foto por aqui atualiza para os outros apps também.
async function carregarFotoPerfil(){
  if(!sb || !gameUser) return null;
  try{
    const { data, error } = await sb.from('usuarios').select('profile_picture_url').eq('id', gameUser.id).maybeSingle();
    if(error) throw error;
    return (data && data.profile_picture_url) || null;
  }catch(_){ return null; }
}

// Recorta em quadrado (centralizado) e comprime antes de subir — evita mandar
// a foto de 12MB da câmera do celular direto pro Storage.
const AVATAR_LADO = 400;
async function prepararAvatar(file){
  const bitmap = await createImageBitmap(file);
  const lado = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width-lado)/2, sy = (bitmap.height-lado)/2;
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_LADO; canvas.height = AVATAR_LADO;
  canvas.getContext('2d').drawImage(bitmap, sx, sy, lado, lado, 0, 0, AVATAR_LADO, AVATAR_LADO);
  const blob = await new Promise(resolve=>canvas.toBlob(resolve, 'image/webp', 0.85));
  if(!blob) throw new Error('falha ao comprimir imagem');
  return blob;
}

// Envia a foto nova: comprime, sobe pro Storage e grava a URL em `usuarios`
// (mesma política de RLS do Projeto Armor: só o dono da conta, com acesso
// pago, pode gravar em avatars/<uid>/). Retorna a URL nova ou lança erro.
async function enviarFotoPerfil(file){
  if(!sb || !gameUser) throw new Error('sem sessão');
  if(!file || !file.type || !file.type.startsWith('image/')) throw new Error('escolha um arquivo de imagem');
  const blob = await prepararAvatar(file);
  const caminho = `avatars/${gameUser.id}/avatar-${Date.now()}.webp`;
  const { error: erroUpload } = await sb.storage.from('uploads').upload(caminho, blob, { contentType:'image/webp', upsert:true });
  if(erroUpload) throw erroUpload;
  const { data: pub } = sb.storage.from('uploads').getPublicUrl(caminho);
  const url = pub && pub.publicUrl;
  if(!url) throw new Error('falha ao obter URL pública');
  const { error: erroSalvar } = await sb.from('usuarios')
    .upsert({ id: gameUser.id, profile_picture_url: url, updated_date: new Date().toISOString() }, { onConflict:'id' });
  if(erroSalvar) throw erroSalvar;
  return url;
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
    if(gameUser){
      await loadBest(); await loadState();
      // E-mail da conta (mesmo login do Alps OS): já vem no user da sessão,
      // sem precisar de outra consulta.
      if(typeof cfgSetEmail==='function') cfgSetEmail(gameUser.email);
      // Busca à parte (não faz parte do `state` da partida) — não precisa
      // esperar para a home aparecer; atualiza o avatar assim que chegar (e
      // guarda no cache local para aparecer na hora na PRÓXIMA entrada).
      carregarFotoPerfil().then(url=>{
        if(url && typeof cfgSetFoto==='function'){ cfgSetFoto(url); avatarCacheSet(url); }
      });
    }
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


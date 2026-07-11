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
// Durante a PARTIDA o botão abre o painel de pausa (Continuar/Sair) em vez de
// sair direto — nas outras telas (fim/tabela) mantém o comportamento antigo.
const pauseOverlay=document.getElementById('pauseOverlay');
document.getElementById('backBtn').onclick=()=>{
  if(state.scene==='title') goHome();
  else if(state.scene==='game') pauseOverlay.classList.remove('hidden');
  else goToTitle();
};
pauseOverlay.addEventListener('click', e=>{ if(e.target===pauseOverlay) pauseOverlay.classList.add('hidden'); });
document.getElementById('pauseContinuar').onclick=()=> pauseOverlay.classList.add('hidden');
document.getElementById('pauseSair').onclick=()=>{ pauseOverlay.classList.add('hidden'); goToTitle(); };
// "Cancelar" na tela "VIRE O CELULAR": volta direto para a Home.
const rotateCancel=document.getElementById('rotateCancel');
if(rotateCancel) rotateCancel.onclick=goHome;

// Segurar o dedo (long-press) sobre a arte da tela inicial abria o menu do
// navegador (Google Lens / salvar imagem / compartilhar…). Como é um jogo,
// bloqueamos esse menu de contexto em qualquer lugar — assim o toque longo
// não interrompe mais a experiência.
document.addEventListener('contextmenu', e=>e.preventDefault());

// =========================================================================
//  TELAS
// =========================================================================
const scr={title:document.getElementById('scrTitle'),end:document.getElementById('scrEnd'),tabela:document.getElementById('scrTabela'),settings:document.getElementById('scrSettings')};
const hud=document.getElementById('hud'), pad=document.getElementById('pad');
const backBtn=document.getElementById('backBtn');
const bootCover=document.getElementById('bootCover');
if(backBtn) backBtn.style.display='none';   // a HOME é a 1ª tela; show() cuida do resto
// Mostra a tela pedida (esconde as outras). Na HOME o próprio menu tem o botão
// VOLTAR, então escondemos o "← Voltar" do topo para não sobrepor a arte.
function show(n){ for(const k in scr) scr[k].classList.add('hidden'); if(scr[n]) scr[n].classList.remove('hidden');
  // Sem o "← Voltar" do topo na HOME (o menu tem o próprio VOLTAR) e nas
  // CONFIGURAÇÕES (a arte já tem a seta de voltar, com hotspot próprio).
  if(backBtn) backBtn.style.display = (n==='title'||n==='settings') ? 'none' : '';
  // Some para sempre assim que a PRIMEIRA tela real é exibida (n é uma tela
  // de verdade, não o show(null) que só esconde tudo enquanto a sessão ainda
  // está carregando — ver comentário no index.html/#bootCover).
  if(n && bootCover) bootCover.classList.add('hidden'); }

// ---------- AUTOALINHAMENTO DOS BOTÕES COM ARTE PRÓPRIA (btnimg) ----------
// O fundo (#titleImg) usa object-fit:cover; quando a tela não tem a proporção
// ~2.2 da arte, o cover corta as sobras e os botões desenhados saem do lugar
// fixo em %. Aqui projetamos o retângulo de cada botão — medido em PIXELS da
// arte original (6400×2900) — para a tela com a MESMA matemática do cover
// (escala = max, sobra centralizada). Assim o PNG transparente de cada botão
// assenta pixel a pixel sobre o botão desenhado em QUALQUER proporção de tela,
// sem distorcer (o retângulo projetado preserva a proporção da arte).
const ART_W=6400, ART_H=2900;
const BTN_ART = {                       // [x, y, w, h] em px da arte
  startGame:      [ 320.0, 1184.9, 1360.0, 330.0],
  btnPersonaliza: [ 320.0, 1564.3, 1360.0, 299.6],
  btnRanking:     [ 320.0, 1881.2, 1360.0, 299.6],
  btnVoltar:      [ 320.0, 2233.6, 1360.0, 302.8],
  startQuick:     [4924.8, 2020.0, 1132.8, 379.9],
};
function alignBtnArt(){
  const vw=window.innerWidth, vh=window.innerHeight;
  const s=Math.max(vw/ART_W, vh/ART_H);           // escala do object-fit:cover
  const ox=(vw-ART_W*s)/2, oy=(vh-ART_H*s)/2;     // sobra cortada, centralizada
  for(const id in BTN_ART){
    const el=document.getElementById(id); if(!el) continue;
    const r=BTN_ART[id];
    el.style.left =(ox+r[0]*s)+'px'; el.style.top   =(oy+r[1]*s)+'px';
    el.style.width=(r[2]*s)+'px';    el.style.height=(r[3]*s)+'px';
  }
}
window.addEventListener('resize', alignBtnArt);
window.addEventListener('orientationchange', alignBtnArt);
alignBtnArt();

// ---- HUD sobre a arte: perfil (topo-esq) + números de moeda/diamante ----
// Mesma projeção cover dos botões. Os retângulos estão em px da arte 6400×2900:
//   • fkwPerfil: faixa de céu livre acima do logo FKW.
//   • fkwMoedas/fkwGemas: na folga entre o ícone (já desenhado na arte) e o "+".
// O font-size é proporcional à altura projetada (o conteúdo interno usa `em`).
const HUD_ART = {
  fkwPerfil: [  75,  22, 1430, 288],
  fkwMoedas: [4150,  66,  520, 188],
  fkwGemas:  [5025,  66,  560, 188],
};
function alignHud(){
  const vw=window.innerWidth, vh=window.innerHeight;
  const s=Math.max(vw/ART_W, vh/ART_H);
  const ox=(vw-ART_W*s)/2, oy=(vh-ART_H*s)/2;
  for(const id in HUD_ART){
    const el=document.getElementById(id); if(!el) continue;
    const r=HUD_ART[id];
    el.style.left =(ox+r[0]*s)+'px'; el.style.top   =(oy+r[1]*s)+'px';
    el.style.width=(r[2]*s)+'px';    el.style.height=(r[3]*s)+'px';
    const h=r[3]*s;
    el.style.fontSize=(id==='fkwPerfil' ? h*0.2 : h*0.55)+'px';
  }
}
window.addEventListener('resize', alignHud);
window.addEventListener('orientationchange', alignHud);
alignHud();

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
// Clique SEM pulo: só roda a ação (usado nos botões ainda não implementados
// que não devem saltar ao serem tocados).
function justGo(id, fn){
  const el=document.getElementById(id); if(!el) return;
  el.onclick=fn;
}

// ---------- ONDA / EFEITO PIANO DOS BOTÕES DO MENU (igual ao Projeto Armor) ----------
// Segurar e deslizar o dedo pelos botões da tela inicial cria uma "onda": cada
// botão ACENDE e salta (.is-ativo) e, quando o dedo passa para o próximo, ele
// SOLTA com um pulso que se acalma (.is-onda → keyframe fkwOnda no CSS). Um toque
// limpo — sem vaguear para outro botão — aciona a ação daquele botão (com o mesmo
// pulso de retorno). Também vale para o clicar-e-segurar: o botão fica aceso
// enquanto o dedo está pressionado e aciona ao soltar.
//   • O botão sob o dedo é achado por elementFromPoint. O pointer fica "capturado"
//     no botão onde o gesto começou (setPointerCapture), então o pointermove
//     continua chegando aqui mesmo quando o dedo desliza para os vizinhos —
//     exatamente como o menu do Projeto Armor.
//   • A escala + o glow são aplicados na ARTE (.btnimg via classe no hotspot); o
//     hotspot não se mexe, então o alvo do toque fica estável durante o gesto.
function setupMenuWave(acoes){
  const arrasto = { ativo:false, atual:null, inicio:null, vagou:false };
  const acender = id=>{ const el=document.getElementById(id); if(!el) return;
    el.classList.remove('is-onda'); el.classList.add('is-ativo'); };
  const soltarOnda = id=>{ const el=document.getElementById(id); if(!el) return;
    el.classList.remove('is-ativo','is-onda'); void el.offsetWidth; el.classList.add('is-onda'); };
  const botaoSob = (x,y)=>{ const alvo=document.elementFromPoint(x,y);
    const btn=(alvo&&alvo.closest)?alvo.closest('.hotspot'):null;
    return (btn && acoes[btn.id]) ? btn.id : null; };
  const down = (e,id)=>{ try{ e.currentTarget.setPointerCapture(e.pointerId); }catch(_){}
    arrasto.ativo=true; arrasto.atual=id; arrasto.inicio=id; arrasto.vagou=false; acender(id); };
  const move = e=>{ if(!arrasto.ativo) return;
    const id=botaoSob(e.clientX,e.clientY);
    if(!id || id===arrasto.atual) return;   // ainda no mesmo botão (ou entre eles)
    if(arrasto.atual) soltarOnda(arrasto.atual);   // o anterior sai numa onda
    acender(id); arrasto.atual=id; arrasto.vagou=true; };
  const up = ()=>{ if(!arrasto.ativo) return;
    const { atual, inicio, vagou } = arrasto;
    if(atual) soltarOnda(atual);
    arrasto.ativo=false; arrasto.atual=null; arrasto.inicio=null; arrasto.vagou=false;
    // Toque limpo (não vagou e soltou no MESMO botão) → aciona após 130ms, tempo
    // de ver o pulso antes de a tela mudar.
    if(!vagou && inicio && inicio===atual) setTimeout(acoes[inicio], 130); };
  const fimAnim = e=>{ if(e.animationName==='fkwOnda') e.currentTarget.classList.remove('is-onda'); };
  for(const id in acoes){ const el=document.getElementById(id); if(!el) continue;
    el.addEventListener('pointerdown', e=>down(e,id));
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('animationend', fimAnim);
    // Teclado (acessibilidade): Enter/Espaço acende e aciona com o mesmo pulso.
    el.addEventListener('keydown', e=>{ if((e.key==='Enter'||e.key===' ')&&!e.repeat){ e.preventDefault(); acender(id); } });
    el.addEventListener('keyup',   e=>{ if(e.key==='Enter'||e.key===' '){ soltarOnda(id); setTimeout(acoes[id],130); } });
  }
}

// "JOGAR" e "INICIAR PARTIDA RÁPIDA" são JOGOS SEPARADOS, cada um com seu
// próprio save (tabelas próprias no Supabase — ver persistence.js). O botão de
// um modo retoma a partida pausada DAQUELE modo (na memória ou vinda do banco)
// ou começa uma partida nova dele; nunca mexe no save do outro jogo.
function playMode(mode){
  if(state.paused && state.mode===mode){ resumeMatch(); return; }   // pausada agora há pouco
  const s=(typeof savedGames!=='undefined') ? savedGames[mode] : null;
  if(s && (s.paused || s.scene==='game')){ applyMatchSnapshot(s); resumeMatch(); return; }
  startMatch(mode);
}
// Os 5 botões da tela inicial (arte PNG própria) usam o efeito ONDA + ação no
// toque limpo. JOGAR e INICIAR são jogos SEPARADOS (ver playMode); RANKING abre a
// classificação; PERSONALIZAR avisa "em breve"; VOLTAR sai para a Home do Alps OS.
setupMenuWave({
  startGame:      ()=>playMode('full'),
  startQuick:     ()=>playMode('quick'),
  btnRanking:     ()=>{ show('tabela'); state.scene='tabela'; },
  btnPersonaliza: ()=>toast('Personalização em breve 👕'),
  btnVoltar:      goHome,
});
// btnEvento ("O Chute de Ouro") e btnEstadio ("Estádio Urbano"): sem ação —
// só decorativos por enquanto, não saltam nem mostram "Em breve".
popGo('btnAmigos',      ()=>toast('Em breve'));
popGo('btnSettings',    ()=>{ show('settings'); state.scene='settings'; });
justGo('btnChat',       ()=>toast('Em breve'));

// =========================================================================
//  CONFIGURAÇÕES — arte própria (fkw-settings.webp) + controles reais
// =========================================================================
// A arte já traz desenhados o cabeçalho, o perfil e as linhas/cartões. Aqui
// ficam apenas os elementos INTERATIVOS, projetados sobre a arte com a MESMA
// matemática cover dos botões da home (retângulos em px da arte 6400×2900):
//   • cfgVoltar  → hotspot sobre a seta "voltar" desenhada no topo;
//   • cfgAvatar / cfgNome / cfgNivel → perfil recriado em código (a arte v2
//     deixa o painel vazio); mesmos lugares da arte antiga;
//   • cfgToggle  → interruptor da linha "Notificações";
//   • cfgMusica / cfgEfeitos → barras de volume (trilha + bolinha + %).
const CFG_ART = {
  cfgVoltar:  [  75,  65,  320, 305],
  cfgAvatar:  [ 520,  466,  838, 838],
  cfgNome:    [1526,  648, 1150, 190],
  cfgNivel:   [1526,  904,  510, 166],
  cfgEmail:   [1460, 1807, 1600, 130],
  cfgToggle:  [2928, 2158,  270, 132],
  cfgMusica:  [3890, 1668, 2350, 135],
  cfgEfeitos: [3890, 2242, 2350, 135],
};
function alignCfg(){
  const vw=window.innerWidth, vh=window.innerHeight;
  const s=Math.max(vw/ART_W, vh/ART_H);           // escala do object-fit:cover
  const ox=(vw-ART_W*s)/2, oy=(vh-ART_H*s)/2;     // sobra cortada, centralizada
  for(const id in CFG_ART){
    const el=document.getElementById(id); if(!el) continue;
    const r=CFG_ART[id];
    const x=ox+r[0]*s, y=oy+r[1]*s;
    el.style.left=x+'px';        el.style.top=y+'px';
    el.style.width=(r[2]*s)+'px'; el.style.height=(r[3]*s)+'px';
    el.style.fontSize=(r[3]*s)+'px';    // tamanhos internos usam `em`
    // Janela espelhada do Voltar: cola a cópia da arte no fundo (offset = -posição)
    const m=el.querySelector('.mirror');
    if(m){ m.style.left=(-x)+'px'; m.style.top=(-y)+'px'; }
  }
}
window.addEventListener('resize', alignCfg);
window.addEventListener('orientationchange', alignCfg);
alignCfg();

// Preferências do jogador (interruptor + volumes). Guardadas no aparelho
// (localStorage): valem também sem login e não mexem no save das partidas.
const CFG_KEY='fkw_prefs';
const cfgPrefs = Object.assign(
  { notificacoes:true, volumeMusica:70, volumeEfeitos:85, nome:'' },
  (()=>{ try{ return JSON.parse(localStorage.getItem(CFG_KEY))||{}; }catch(_){ return {}; } })()
);
function cfgSave(){ try{ localStorage.setItem(CFG_KEY, JSON.stringify(cfgPrefs)); }catch(_){} }

// Interruptor (linha "Notificações")
const cfgToggle=document.getElementById('cfgToggle');
function cfgPaintToggle(){
  cfgToggle.classList.toggle('on', !!cfgPrefs.notificacoes);
  cfgToggle.setAttribute('aria-checked', String(!!cfgPrefs.notificacoes));
}
cfgToggle.addEventListener('click', ()=>{ cfgPrefs.notificacoes=!cfgPrefs.notificacoes; cfgPaintToggle(); cfgSave(); });
cfgPaintToggle();

// Barras de volume: tocar/arrastar na barra move a bolinha e atualiza o %.
// O pointer fica capturado na barra, então o arrasto segue o dedo mesmo
// saindo dela (igual ao joystick do jogo).
function cfgSlider(id, pref){
  const el=document.getElementById(id);
  const track=el.querySelector('.cfg-track'), fill=el.querySelector('.cfg-fill'),
        knob=el.querySelector('.cfg-knobbar'), pct=el.querySelector('.cfg-pct');
  const paint=v=>{ fill.style.width=v+'%'; knob.style.left=v+'%'; pct.textContent=v+'%'; };
  paint(cfgPrefs[pref]);
  let drag=false;
  const setFrom=cx=>{ const r=track.getBoundingClientRect();
    const v=Math.round(Math.max(0, Math.min(1,(cx-r.left)/r.width))*100);
    cfgPrefs[pref]=v; paint(v); };
  el.addEventListener('pointerdown', e=>{ drag=true;
    try{ el.setPointerCapture(e.pointerId); }catch(_){}
    setFrom(e.clientX); });
  el.addEventListener('pointermove', e=>{ if(drag) setFrom(e.clientX); });
  const solta=()=>{ if(!drag) return; drag=false; cfgSave(); };
  el.addEventListener('pointerup', solta);
  el.addEventListener('pointercancel', solta);
}
cfgSlider('cfgMusica','volumeMusica');
cfgSlider('cfgEfeitos','volumeEfeitos');

// Nome do jogador: editável, salvo no aparelho (como as demais preferências
// acima). É o "nome de jogo" exibido aqui — não é o nome da conta do Alps.
// O MESMO nome (e a MESMA foto, logo abaixo) aparece também no cartão de
// perfil da tela inicial (fkwPerfil) — as duas telas refletem uma só fonte.
const cfgNomeInput=document.getElementById('cfgNomeInput');
const fkwNomeEl=document.getElementById('fkwNome');

function aplicarNome(nome){
  const exibido = (nome && nome.trim()) ? nome.trim() : 'FKW PLAYER';
  if(fkwNomeEl) fkwNomeEl.textContent = exibido;
}

cfgNomeInput.value = cfgPrefs.nome || '';
aplicarNome(cfgPrefs.nome);
cfgNomeInput.addEventListener('input', ()=>{
  cfgPrefs.nome=cfgNomeInput.value; cfgSave(); aplicarNome(cfgPrefs.nome);
});

// Nível do jogador: ainda não existe progressão real (sem XP), então é 0 nas
// DUAS telas — mesma fonte única, para não ficarem dessincronizadas quando a
// progressão de verdade for implementada.
const NIVEL_JOGADOR = 0;
const cfgNivelSpan=document.querySelector('#cfgNivel span');
const fkwNivelEl=document.querySelector('.fkw-perfil-nivel');
function aplicarNivel(n){
  const texto = `NÍVEL ${n}`;
  if(cfgNivelSpan) cfgNivelSpan.textContent = texto;
  if(fkwNivelEl) fkwNivelEl.textContent = texto;
}
aplicarNivel(NIVEL_JOGADOR);

// E-mail da conta: MESMO e-mail com que o jogador entrou no Alps OS (sessão
// do Supabase reaproveitada — ver gameUser em persistence.js). Chamado assim
// que a sessão é lida; sem login, a linha fica em branco (como a arte já
// prevê, já que ninguém pode editar/ver esse valor mesmo).
const cfgEmailEl=document.getElementById('cfgEmailTexto');
function cfgSetEmail(email){
  if(cfgEmailEl) cfgEmailEl.textContent = email || '';
}

// ---------- Foto de perfil (Supabase — MESMA conta do AlpsPrime-OS/Armor) ----------
// carregarFotoPerfil()/enviarFotoPerfil() vivem em persistence.js (onde o
// cliente Supabase e o usuário logado já existem); aqui só a UI.
const cfgFotoImg=document.getElementById('cfgFotoImg');
const cfgSilhueta=document.getElementById('cfgSilhueta');
const cfgFotoBtn=document.getElementById('cfgFotoBtn');
const cfgFotoInput=document.getElementById('cfgFotoInput');
const cfgFotoCarregando=document.getElementById('cfgFotoCarregando');
const fkwFotoImg=document.getElementById('fkwFotoImg');
const fkwSilhueta=document.getElementById('fkwSilhueta');

// Chamada assim que a foto (se existir) chega do banco, e de novo após subir
// uma nova — troca a silhueta padrão pela foto real nas DUAS telas
// (Configurações e o cartão de perfil da tela inicial).
function cfgSetFoto(url){
  cfgFotoImg.src = url;
  cfgFotoImg.style.display = '';
  cfgSilhueta.style.display = 'none';
  if(fkwFotoImg){
    fkwFotoImg.src = url;
    fkwFotoImg.style.display = '';
    if(fkwSilhueta) fkwSilhueta.style.display = 'none';
  }
}

cfgFotoBtn.addEventListener('click', ()=>{ if(!cfgFotoBtn.disabled) cfgFotoInput.click(); });

cfgFotoInput.addEventListener('change', async ()=>{
  const file = cfgFotoInput.files && cfgFotoInput.files[0];
  cfgFotoInput.value='';   // permite escolher o mesmo arquivo de novo depois
  if(!file) return;
  cfgFotoBtn.disabled = true;
  cfgFotoCarregando.style.display = 'flex';
  try{
    const url = await enviarFotoPerfil(file);
    cfgSetFoto(url);
    if(typeof avatarCacheSet==='function') avatarCacheSet(url);
  }catch(_){
    toast('Não deu pra enviar a foto. Tenta de novo.');
  }finally{
    cfgFotoCarregando.style.display = 'none';
    cfgFotoBtn.disabled = false;
  }
});

// Voltar (seta desenhada na arte, com o mesmo "pulinho" dos botões da home)
popGo('cfgVoltar', ()=>{ show('title'); state.scene='title'; });

// Aquecer o cache da arte das Configurações depois que a home carregou, para a
// tela abrir sem "piscar" na primeira vez (o <img> dela é loading="lazy").
setTimeout(()=>{ const i=new Image(); i.src='assets/fkw-settings.webp?v=3'; }, 2500);
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
// EXCEÇÃO: o botão da câmera (trocar foto de perfil) também depende desse
// MESMO toque para abrir o seletor de arquivo nativo — e o navegador só deixa
// uma dessas ações "gastar" o gesto por vez. Pedir tela cheia aqui bloquearia
// o seletor em silêncio; por isso pulamos a tela cheia nesse botão específico
// (o próximo toque em qualquer outro lugar já entra em tela cheia normalmente).
document.addEventListener('pointerdown', (e)=>{
  if(isPortrait() || isFullscreen()) return;
  if(e.target.closest('#cfgFotoBtn')) return;
  goFullscreen();
});

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


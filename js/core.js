"use strict";
// =========================================================================
// CORE — canvas, contexto 2D, redimensionamento (DPR/retina) e orientação
// =========================================================================
// FREE KICK WORLD — Canvas 2D, sem dependências. O jogo é dividido por assunto
// em vários arquivos js/*.js, carregados em ordem no fim do index.html. Todos
// compartilham o mesmo escopo global (scripts clássicos), como se fosse um só.

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

let CW=0, CH=0, DPR=1;
function resize(){
  // Renderiza na densidade real da tela (retina) → alta resolução, nada de "serrilhado".
  DPR = Math.min(window.devicePixelRatio || 1, 3);
  CW = Math.floor(window.innerWidth);
  CH = Math.floor(window.innerHeight);
  cv.width  = Math.floor(CW * DPR);
  cv.height = Math.floor(CH * DPR);
  cv.style.width  = CW + 'px';
  cv.style.height = CH + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);   // desenhamos em px de CSS; o canvas escala sozinho
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', resize);
resize();

// Em retrato mostramos o aviso "vire o celular" e pausamos a partida.
const isPortrait = () => window.matchMedia('(orientation: portrait)').matches;


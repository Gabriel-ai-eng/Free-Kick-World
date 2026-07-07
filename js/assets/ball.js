"use strict";
// =========================================================================
// assets/ball.webp — a BOLA do jogo (fundo transparente).
// -------------------------------------------------------------------------
// Carregada à parte; enquanto não estiver pronta (ou se faltar), o desenho da
// bola cai no procedural de fallback em drawBall() (js/render.js). Vale para os
// dois modos (JOGAR e partida rápida), pois drawBall é o mesmo para ambos.
const ballImg = new Image();
ballImg.src = 'assets/ball.webp';

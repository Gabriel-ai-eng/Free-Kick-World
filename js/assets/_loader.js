"use strict";
// =========================================================================
// ASSETS / LOADER — infraestrutura compartilhada dos assets.
// -------------------------------------------------------------------------
// Cada IMAGEM tem o SEU próprio arquivo aqui em js/assets/, com o MESMO nome do
// arquivo lá em assets/. Ex.: assets/goal-left.webp  ↔  js/assets/goal-left.js.
// Nesse arquivo fica: ONDE a imagem é carregada, ONDE ela se posiciona e QUAL o
// tamanho dos quadros. O DESENHO em si (como a grama e os gols são pintados no
// campo) continua em js/stadium.js; o desenho do jogador em js/render.js.
// (A arte da tela inicial, assets/fkw-title.webp, é uma <img> direta no
//  index.html, então não tem arquivo de código aqui.)
// =========================================================================

// Contador de carregamento dos 4 sprites do JOGADOR. O loop principal (loop.js)
// só começa a desenhar quando A.loaded >= A.need. As imagens do ESTÁDIO (grama e
// gols) carregam à parte, sem travar o início do jogo.
const A = { loaded:0, need:4 };
function onPlayerSprite(){ A.loaded++; }

// Quando uma imagem do estádio termina de carregar, repinta as camadas fixas
// (grama/gols entram no lugar do desenho procedural de fallback).
function onStadiumAsset(){ if (Stadium && Stadium.built) Stadium.rebuild(); }

// Âncoras das traves, preenchidas por goal-left.js e goal-right.js.
const GOAL_ANCH = {};

"use strict";
// =========================================================================
// assets/player_idle.png — sprite sheet do jogador PARADO (idle animation).
// -------------------------------------------------------------------------
// Carregada à parte (NÃO conta em A.need, para não travar o início do jogo):
// enquanto não chega — ou se faltar — o "parado" cai no quadro 0 da folha de
// caminhada (fallback em render.js/drawPlayer). Enquadrada igual à caminhada
// (mesma altura de personagem e pés na base), então a troca parado↔andando não
// muda o tamanho nem a posição. Lida da esquerda p/ a direita, de cima p/ baixo.
A.idle = new Image();
// ?v=2 força o navegador a buscar a folha nova: a grade mudou (140x276, 202
// quadros) e um player_idle.png antigo em cache, com a grade velha, desmontaria
// o desenho. Ao trocar a arte, mude a folha E suba esse número junto.
A.idle.src = 'assets/player_idle.webp?v=3';
const IDLE_SH = { FW:140, FH:276, cols:10, rows:21, frames:202 };
const IDLE_MS = 40;   // ms por quadro (~8s de loop calmo e suave)

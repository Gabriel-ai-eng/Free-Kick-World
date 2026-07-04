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
A.idle.src = 'assets/player_idle.png';
const IDLE_SH = { FW:114, FH:184, cols:10, rows:6, frames:60 };
const IDLE_MS = 60;   // ms por quadro (~3.6s de loop calmo)

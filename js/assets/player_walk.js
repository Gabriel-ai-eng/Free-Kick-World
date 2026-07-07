"use strict";
// =========================================================================
// assets/player_walk.png — sprite sheet de CAMINHADA do jogador.
// =========================================================================
A.walk = new Image();
A.walk.src = 'assets/player_walk.webp';
A.walk.onload = typeof onPlayerSprite !== 'undefined' ? onPlayerSprite : null;

const WALK_SH = { 
  FW: 170, 
  FH: 332, 
  cols: 9, 
  rows: 5, 
  frames: 43,
  // NOVA PROPRIEDADE: Fator de velocidade da animação. 
  // Diminua (ex: 0.2) para mais lento, aumente (ex: 0.8) para mais rápido.
  animSpeedFactor: 0.35 
};

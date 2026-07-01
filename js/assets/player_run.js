"use strict";
// =========================================================================
// assets/player_run.png — sprite sheet de CORRIDA do jogador.
// =========================================================================
// Alta resolução (quadro 430x608) → personagem nítido e suave, sem serrilhado.
A.runner = new Image();
A.runner.src = 'assets/player_run.png';
A.runner.onload = onPlayerSprite;
const RUN_SH = { FW:430, FH:608, cols:5, rows:4, frames:20 };

"use strict";
// =========================================================================
// assets/player_run.webp — sprite sheet de CORRIDA do jogador.
// =========================================================================
// Alta resolução (quadro 430x608) → personagem nítido e suave, sem serrilhado.
A.runner = new Image();
A.runner.src = 'assets/player_run.webp';
A.runner.onload = onPlayerSprite;
// CH = altura do personagem (px) no quadro neutro — normaliza o tamanho na
// tela entre as folhas (ver render.js).
const RUN_SH = { FW:215, FH:304, cols:5, rows:4, frames:20, CH:297 };

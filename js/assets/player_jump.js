"use strict";
// =========================================================================
// assets/player_jump.webp — sprite sheet de PULO do jogador.
// =========================================================================
// 15 colunas x 14 linhas = 200 quadros (perfil p/ direita). O arco vertical do
// pulo NÃO está embutido: a altura (z) é gerada por código e sincronizada com a
// animação (decolagem JUMP_TO → aterrissagem JUMP_LD).
A.jump = new Image();
A.jump.src = 'assets/player_jump.webp';
A.jump.onload = onPlayerSprite;
const JUMP_SH = { FW:86, FH:145, cols:15, rows:14, frames:200 };
const JUMP_FPS = 185;        // velocidade de reproducao da animacao de pulo
const JUMP_TO = 57;          // frame de DECOLAGEM (pes saem do chao)
const JUMP_LD = 168;         // frame de ATERRISSAGEM (pes tocam o chao)
const JUMP_Z = 0.6;          // altura do pulo: fracao da altura do personagem

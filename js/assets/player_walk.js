"use strict";
// =========================================================================
// assets/player_walk.webp — sprite sheet de CAMINHADA do jogador.
// =========================================================================
// FW/FH = tamanho de cada quadro DENTRO do PNG; cols/rows = colunas/linhas da
// grade; frames = quantos quadros usar. Folha ORIGINAL, como desenhada (perfil
// p/ direita): lida da esquerda p/ a direita e, ao fim da linha, na de baixo.
A.walk = new Image();
A.walk.src = 'assets/player_walk.webp?v=2';
A.walk.onload = onPlayerSprite;
const WALK_SH = { FW:365, FH:673, cols:10, rows:2, frames:18 };
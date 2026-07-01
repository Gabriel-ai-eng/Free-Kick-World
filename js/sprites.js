"use strict";
// =========================================================================
// SPRITES — folhas de sprite do personagem (andar, correr, chutar, pular)
// =========================================================================
// Sprite sheet de CAMINHADA: folha ORIGINAL, exatamente como desenhada.
// 5 colunas x 9 linhas = 42 quadros (perfil p/ direita). Lidos da esquerda p/ a
// direita; ao fim da linha, segue na linha de baixo. Sem reorganizar/cortar/inverter.
const WALK_SH = { FW:340, FH:664, cols:9, rows:5, frames:43 };
// Sprite sheet de CORRIDA: 5 colunas x 4 linhas = 20 quadros (perfil p/ direita)
// Alta resolução (quadro 430x608) → personagem nítido e suave, sem serrilhado.
const RUN_SH = { FW:430, FH:608, cols:5, rows:4, frames:20 };
// Sprite sheet de CHUTE PARADO: 12 colunas x 15 linhas = 180 quadros (perfil p/
// direita), alinhados pelo tronco (estavel) com os pes na base.
const KICK_SH = { FW:273, FH:273, cols:12, rows:15, frames:180 };
const KICK_FPS = 140;        // velocidade de reproducao da animacao de chute
const KICK_CONTACT = 122;    // FRAME EXATO do contato: o pe encosta na bola (evento de animacao)
const KICK_FOOT_DX = 0.406;  // posicao do pe NESSE frame: fracao da largura do sprite a frente do centro
// Sprite sheet de PULO: 15 colunas x 14 linhas = 200 quadros (perfil p/ direita),
// alinhados pelo tronco e pes na base. O arco vertical do pulo NAO esta embutido:
// a altura (z) e gerada por codigo e sincronizada com a animacao (decolagem ->
// aterrissagem) atraves de um EVENTO de animacao por frame.
const JUMP_SH = { FW:172, FH:291, cols:15, rows:14, frames:200 };
const JUMP_FPS = 185;        // velocidade de reproducao da animacao de pulo
const JUMP_TO = 57;          // frame de DECOLAGEM (pes saem do chao)
const JUMP_LD = 168;         // frame de ATERRISSAGEM (pes tocam o chao)
const JUMP_Z = 0.6;          // altura do pulo: fracao da altura do personagem


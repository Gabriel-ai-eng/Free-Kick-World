"use strict";
// =========================================================================
// assets/player_kick.png — sprite sheet de CHUTE PARADO do jogador.
// =========================================================================
// 12 colunas x 15 linhas = 180 quadros (perfil p/ direita), alinhados pelo
// tronco com os pés na base. O contato do pé com a bola é um EVENTO no frame
// exato (KICK_CONTACT): só então a bola ganha velocidade.
A.kick = new Image();
A.kick.src = 'assets/player_kick.png';
A.kick.onload = onPlayerSprite;
const KICK_SH = { FW:136, FH:136, cols:12, rows:15, frames:180 };
const KICK_FPS = 140;        // velocidade de reproducao da animacao de chute
const KICK_CONTACT = 122;    // FRAME EXATO do contato: o pe encosta na bola (evento de animacao)
const KICK_FOOT_DX = 0.406;  // posicao do pe NESSE frame: fracao da largura do sprite a frente do centro

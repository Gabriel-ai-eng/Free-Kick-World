"use strict";
// =========================================================================
// assets/pitch-grass.webp — foto do gramado em perspectiva.
// =========================================================================
// Carregada à parte, SEM travar o loop: se faltar, o gramado cai no desenho
// procedural (fallback em GrassTileMap, dentro de stadium.js).
// PITCH_IMG = geometria do trapézio verde DENTRO da imagem (frações da imagem),
// medida da própria foto, usada para mapear a grama com a perspectiva certa.
const pitchImg = new Image();
pitchImg.src = 'assets/pitch-grass.webp';
pitchImg.onload = onStadiumAsset;
const PITCH_IMG = { topY:0.266, botY:0.668, topL:0.289, topR:0.711, botL:0.046, botR:0.954 };

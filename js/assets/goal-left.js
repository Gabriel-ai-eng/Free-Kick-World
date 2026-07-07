"use strict";
// =========================================================================
// assets/goal-left.webp — trave do gol da ESQUERDA (em perspectiva, fundo transparente).
// =========================================================================
// Carregada à parte; se faltar, o gol cai no desenho procedural (Goals(), em
// stadium.js). GOAL_ANCH.left = posição das BASES das traves DENTRO da imagem
// (frações): near = trave da frente (mais baixa), far = trave do fundo (mais alta).
const goalLeftImg = new Image();
goalLeftImg.src = 'assets/goal-left.webp';
goalLeftImg.onload = onStadiumAsset;
GOAL_ANCH.left = { nearX:0.049, nearY:0.998, farX:0.920, farY:0.493 };

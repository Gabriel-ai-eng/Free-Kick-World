"use strict";
// =========================================================================
// assets/goal-right.webp — trave do gol da DIREITA (em perspectiva, fundo transparente).
// =========================================================================
// Carregada à parte; se faltar, o gol cai no desenho procedural (Goals(), em
// stadium.js). GOAL_ANCH.right = posição das BASES das traves DENTRO da imagem
// (frações): near = trave da frente (mais baixa), far = trave do fundo (mais alta).
const goalRightImg = new Image();
goalRightImg.src = 'assets/goal-right.webp';
goalRightImg.onload = onStadiumAsset;
GOAL_ANCH.right = { nearX:0.938, nearY:0.998, farX:0.049, farY:0.493 };

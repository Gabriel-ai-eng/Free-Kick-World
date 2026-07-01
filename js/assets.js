"use strict";
// =========================================================================
// ASSETS — carregamento das imagens (sprites, grama, gols) e suas âncoras
// =========================================================================
// ---------- Assets ----------
// O estádio NÃO é mais uma imagem única: é recriado proceduralmente (ver módulo
// `Stadium` abaixo). Só os sprites do personagem são carregados como imagem.
const A = { walk:new Image(), runner:new Image(), kick:new Image(), jump:new Image(), loaded:0, need:4 };
A.walk.src    = 'assets/player_walk.png';
A.runner.src  = 'assets/player_run.png';
A.kick.src    = 'assets/player_kick.png';
A.jump.src    = 'assets/player_jump.png';
A.walk.onload = A.runner.onload = A.kick.onload = A.jump.onload = ()=> A.loaded++;

// Imagem do gramado (foto em perspectiva). Carregada à parte, SEM travar o loop:
// se falhar, o gramado cai no desenho procedural (fallback em GrassTileMap).
// Geometria do trapézio verde DENTRO da imagem (frações da imagem), medida da
// própria foto — usada para mapear a grama no campo com a perspectiva certa.
const pitchImg = new Image();
pitchImg.src = 'assets/pitch-grass.png';
const PITCH_IMG = { topY:0.266, botY:0.668, topL:0.289, topR:0.711, botL:0.046, botR:0.954 };
pitchImg.onload = ()=>{ if (Stadium && Stadium.built) Stadium.rebuild(); };

// Imagens dos gols (frames em perspectiva, fundo transparente). Carregadas à
// parte; se faltarem, os gols caem no desenho procedural (fallback em Goals()).
// Âncoras = posição das BASES das traves DENTRO da imagem (frações da imagem):
// near = trave da frente (mais baixa), far = trave do fundo (mais alta).
const goalLeftImg = new Image();  goalLeftImg.src  = 'assets/goal-left.png';
const goalRightImg = new Image(); goalRightImg.src = 'assets/goal-right.png';
const GOAL_ANCH = {
  left:  { nearX:0.049, nearY:0.998, farX:0.920, farY:0.493 },
  right: { nearX:0.938, nearY:0.998, farX:0.049, farY:0.493 },
};
goalLeftImg.onload = goalRightImg.onload = ()=>{ if (Stadium && Stadium.built) Stadium.rebuild(); };


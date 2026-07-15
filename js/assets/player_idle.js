"use strict";
// =========================================================================
// assets/player_idle.webp — sprite sheet do jogador PARADO (idle animation).
// -------------------------------------------------------------------------
// Carregada à parte (NÃO conta em A.need, para não travar o início do jogo):
// enquanto não chega — ou se faltar — o "parado" cai no quadro 0 da folha de
// caminhada (fallback em render.js/drawPlayer). Enquadrada igual à caminhada
// (mesma altura de personagem e pés na base), então a troca parado↔andando não
// muda o tamanho nem a posição. Lida da esquerda p/ a direita, de cima p/ baixo.
A.idle = new Image();
// ?v=2 força o navegador a buscar a folha nova: a grade mudou (140x276, 202
// quadros) e um player_idle.webp antigo em cache, com a grade velha, desmontaria
// o desenho. Ao trocar a arte, mude a folha E suba esse número junto.
// v=4: realinhamento dos 202 quadros (pés/base do corpo) para eliminar a
// tremedeira — cada quadro foi deslocado em X (inteiro, sem redesenhar a
// pose) para ancorar no mesmo ponto de contato com o chão.
A.idle.src = 'assets/player_idle.webp?v=4';
// CH = altura do PERSONAGEM (px) dentro do quadro, medida nos pixels opacos do
// quadro neutro. Cada folha tem uma folga diferente ao redor do corpo, então
// desenhar pelo quadro (FH) deixava o jogador maior/menor conforme a animação;
// render.js usa CH para todas as folhas saírem do MESMO tamanho na tela.
const IDLE_SH = { FW:140, FH:276, cols:10, rows:21, frames:202, CH:259 };
const IDLE_MS = 40;   // ms por quadro (~8s de loop calmo e suave)

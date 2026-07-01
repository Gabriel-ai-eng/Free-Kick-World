"use strict";
// =========================================================================
// CAMERA — modos Longe/Perto, zoom no campo e zoom livre (pinça)
// =========================================================================
// Câmera: 'near' liga o modo Perto; 'prog' (0..1) é a transição suave entre
// Longe (estádio inteiro) e Perto (segue o personagem, centralizado).
// No Perto o zoom é DINÂMICO: ajusta conforme a profundidade para o personagem
// ficar sempre do mesmo tamanho e sempre no centro da tela, onde quer que vá.
const CHAR_ON_SCREEN = 0.50;   // altura alvo do personagem na tela (fração) no Perto
// FIELD_FILL: no modo Longe (visão geral) a câmera dá um zoom no campo para ele
// ocupar o MÁXIMO da tela mantendo o campo INTEIRO visível (encaixe "contain").
// 1 = campo encosta nas bordas; <1 deixa uma folga. O personagem NÃO cresce com
// esse zoom (é contra-escalado), então mantém o mesmo tamanho na tela.
const FIELD_FILL = 1.0;
// userZoom: fator de zoom livre controlado pelo usuário (pinça com 2 dedos),
// multiplica o zoom da câmera focada no personagem. 1 = padrão.
const cam = { prog:0, near:false, userZoom:1 };
const USER_ZOOM_MIN = 0.6, USER_ZOOM_MAX = 3.0;


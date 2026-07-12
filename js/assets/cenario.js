"use strict";
// =========================================================================
// assets/cenario-*.webp — o ESTÁDIO NOVO fatiado em TILES (estilo tilemap).
// -------------------------------------------------------------------------
// A arte de referência (visão noturna com assentos azul/amarelo) NÃO é usada
// como imagem única: foi fatiada em peças reutilizáveis, que o stadium.js
// monta em camadas ao redor do campo:
//   • cenario-estadio.webp — atlas com as peças BASE (arquibancada do fundo,
//     laterais, segmentos de placa, arquibancada da frente, cabine) com o
//     brilho dos holofotes REMOVIDO da arte (de-bake);
//   • cenario-luzes.webp   — os HOLOFOTES como máscaras de luz neutras
//     (cinza+alfa): a cor/intensidade é aplicada em tempo de pintura, pelo
//     grupo `holofotes` em Stadium.cfg.luzes (mude e chame Stadium.rebuild());
//   • cenario-grama.webp   — a GRAMA real da imagem em "espaço do campo"
//     (retângulo u×v, sem linhas/jogador/bola — as linhas continuam sendo
//     desenhadas por código, e o jogador é entidade viva).
// Se alguma imagem faltar, o stadium.js cai no desenho procedural antigo.
// Ao regenerar os atlas, suba o ?v=N para furar o cache.
// =========================================================================
const cenarioEstadioImg = new Image();
cenarioEstadioImg.src = 'assets/cenario-estadio.webp?v=1';
cenarioEstadioImg.onload = onStadiumAsset;

const cenarioLuzesImg = new Image();
cenarioLuzesImg.src = 'assets/cenario-luzes.webp?v=1';
cenarioLuzesImg.onload = onStadiumAsset;

const cenarioGramaImg = new Image();
cenarioGramaImg.src = 'assets/cenario-grama.webp?v=1';
cenarioGramaImg.onload = onStadiumAsset;

// Retângulo de cada peça DENTRO do atlas base
const CENARIO_TILES = {
  arqTop:        { x:0,    y:509, w:1536, h:293 },  // arquibancada do fundo + torres
  lateralEsq:    { x:0,    y:0,   w:222,  h:507 },  // arquibancada lateral esquerda
  lateralDir:    { x:224,  y:0,   w:222,  h:507 },  // arquibancada lateral direita
  placaTopSeg:   { x:789,  y:804, w:344,  h:23  },  // segmento de placa (tileável)
  placaBaixoSeg: { x:1135, y:804, w:356,  h:22  },  // segmento de placa da frente
  arqBaixoSeg:   { x:0,    y:804, w:430,  h:201 },  // arquibancada da frente (tileável)
  cabine:        { x:432,  y:804, w:355,  h:193 },  // cabine de transmissão
};

// Máscaras de luz dos holofotes (atlas de luzes) + posição de cada torre no
// ESPAÇO DO ESTÁDIO (1536×1024, o mesmo em que as peças são montadas).
const CENARIO_HOLOFOTES = [
  { r:{ x:0,   y:0, w:165, h:130 }, dx:155,  dy:0  },
  { r:{ x:167, y:0, w:170, h:130 }, dx:1215, dy:0  },
  { r:{ x:339, y:0, w:75,  h:115 }, dx:0,    dy:60 },
  { r:{ x:416, y:0, w:74,  h:115 }, dx:1462, dy:55 },
];

// Posição de cada peça base no espaço do estádio (montagem do cenário)
const CENARIO_POS = {
  arqTop:     { x:0,    y:0   },
  lateralEsq: { x:0,    y:293 },
  lateralDir: { x:1314, y:293 },
  placaTop:   { x0:215, x1:1315, y:294 },   // faixa tileada com placaTopSeg
  placaBaixo: { x0:0,   x1:1536, y:801 },   // faixa tileada com placaBaixoSeg
  arqBaixo:   { x0:0,   x1:1536, y:823 },   // faixa tileada com arqBaixoSeg
  cabine:     { x:590,  y:822 },
};

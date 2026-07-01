"use strict";
// =========================================================================
// FIELD — geometria do campo em perspectiva, escala por profundidade, uv→tela
// =========================================================================
// ---------- Pitch (trapézio em perspectiva, normalizado na imagem) ----------
const PITCH = {
  TL:{x:0.215,y:0.550}, TR:{x:0.785,y:0.550},
  BR:{x:0.955,y:0.895}, BL:{x:0.045,y:0.895},
};
// Espaço virtual do estádio (aspecto preservado do original ~1.54) — o PITCH é
// normalizado nele, então o alinhamento do campo continua idêntico. Resolução
// alta para captar público denso, texto dos painéis e múltiplos níveis.
const STADIUM_W = 1600, STADIUM_H = 1038;
let img = {dx:0,dy:0,dw:0,dh:0};   // retângulo onde o estádio é desenhado (cover)
function layoutStadium(){
  // "cover": preenche a tela inteira, sem bordas pretas. Alinhado pela BASE
  // (mostra o campo e corta o topo da arquibancada quando sobra altura).
  const s = Math.max(CW/STADIUM_W, CH/STADIUM_H) || 1;
  img.dw = STADIUM_W*s; img.dh = STADIUM_H*s;
  img.dx = (CW-img.dw)/2; img.dy = CH-img.dh;
}
const lerp=(a,b,t)=>a+(b-a)*t;
// (u,v) no campo: u=0 esquerda→1 direita; v=0 fundo(longe)→1 frente(perto)
function uvToScreen(u,v){
  const tx=lerp(PITCH.TL.x,PITCH.TR.x,u), ty=lerp(PITCH.TL.y,PITCH.TR.y,u);
  const bx=lerp(PITCH.BL.x,PITCH.BR.x,u), by=lerp(PITCH.BL.y,PITCH.BR.y,u);
  const nx=lerp(tx,bx,v), ny=lerp(ty,by,v);
  return { x: img.dx + nx*img.dw, y: img.dy + ny*img.dh };
}
// escala do personagem conforme a profundidade (perto = maior)
function depthScale(v){ return lerp(0.035, 0.135, v) * img.dh; } // altura do sprite em px


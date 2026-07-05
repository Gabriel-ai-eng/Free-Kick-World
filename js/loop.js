"use strict";
// =========================================================================
// LOOP — laço principal de animação (update + render por frame)
// =========================================================================
// =========================================================================
//  LOOP
// =========================================================================
let last=performance.now();
function loop(now){
  let dt=(now-last)/1000; last=now; if(dt>0.05) dt=0.05;
  // try/catch: sem ele, UMA exceção num frame matava o desenho PARA SEMPRE
  // (o requestAnimationFrame seguinte nunca era agendado) — tela preta com o
  // HUD/cronômetro ainda vivos. Agora o frame com erro é pulado e o jogo
  // continua no próximo.
  try {
    if(A.loaded>=A.need){ update(dt); render(); }
  } catch(err) {
    if(!loop._err){ loop._err=true; console.error('FKW frame error:', err); }
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


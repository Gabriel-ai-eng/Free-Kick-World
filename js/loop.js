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
  if(A.loaded>=A.need){ update(dt); render(); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);


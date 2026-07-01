"use strict";
// =========================================================================
// INPUT — joystick, botões PULAR/CHUTAR, teclado, botão de câmera e pinça
// =========================================================================
// =========================================================================
//  INPUT — joystick (esquerda) + chute (direita) + teclado
// =========================================================================
const keys={};
addEventListener('keydown',e=>{ keys[e.key.toLowerCase()]=true;
  if(e.key===' '){e.preventDefault(); kick();}
  if(e.key.toLowerCase()==='k'){ jump(); } });
addEventListener('keyup',e=> keys[e.key.toLowerCase()]=false);

const stick=document.getElementById('stick'), knob=document.getElementById('knob'),
      kickBtn=document.getElementById('kick'), jumpBtn=document.getElementById('jump');
let stickVec={x:0,y:0}, stickPid=null, center={x:0,y:0};
const MAXR=34;
function setKnob(dx,dy){ knob.style.left=(30+dx)+'px'; knob.style.top=(30+dy)+'px'; }
stick.addEventListener('pointerdown',e=>{
  stickPid=e.pointerId; stick.setPointerCapture(e.pointerId);
  const r=stick.getBoundingClientRect(); center={x:r.left+r.width/2,y:r.top+r.height/2}; movePointer(e);
});
stick.addEventListener('pointermove',e=>{ if(e.pointerId===stickPid) movePointer(e); });
function endStick(e){ if(e.pointerId===stickPid){ stickPid=null; stickVec={x:0,y:0}; setKnob(0,0); } }
stick.addEventListener('pointerup',endStick);
stick.addEventListener('pointercancel',endStick);
function movePointer(e){
  let dx=e.clientX-center.x, dy=e.clientY-center.y; const d=Math.hypot(dx,dy);
  if(d>MAXR){ dx=dx/d*MAXR; dy=dy/d*MAXR; } setKnob(dx,dy);
  stickVec={x:dx/MAXR, y:dy/MAXR};
}
kickBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); kick(); });
jumpBtn.addEventListener('pointerdown',e=>{ e.preventDefault(); jump(); });

// Botão único de câmera: alterna entre Longe e Perto.
// Longe → texto "Perto" (vai aproximar); Perto → texto "Longe" (vai afastar).
const camToggleBtn=document.getElementById('camToggle');
function updateCamBtn(){ camToggleBtn.textContent = cam.near ? '🔭 Longe' : '🔍 Perto'; }
camToggleBtn.addEventListener('pointerdown',e=>{
  e.preventDefault();
  cam.near=!cam.near;
  updateCamBtn();
});
updateCamBtn();

// PINÇA (2 dedos) para aproximar/afastar a câmera livremente, focada no
// personagem. Funciona junto com o botão Longe/Perto (multiplica o zoom).
// Os toques chegam ao canvas pelas áreas vazias (o joystick e os botões capturam
// os seus próprios toques), então o pinça não conflita com os controles.
const pinchPts = new Map();
let pinchDist0 = 0, pinchZoom0 = 1;
function pinchBase(){
  if(pinchPts.size === 2){
    const [a,b] = [...pinchPts.values()];
    pinchDist0 = Math.hypot(a.x-b.x, a.y-b.y) || 1;
    pinchZoom0 = cam.userZoom;
  }
}
cv.addEventListener('pointerdown', e=>{
  pinchPts.set(e.pointerId, { x:e.clientX, y:e.clientY });
  pinchBase();
});
cv.addEventListener('pointermove', e=>{
  if(!pinchPts.has(e.pointerId)) return;
  pinchPts.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if(pinchPts.size === 2){
    const [a,b] = [...pinchPts.values()];
    const d = Math.hypot(a.x-b.x, a.y-b.y) || 1;
    cam.userZoom = Math.max(USER_ZOOM_MIN, Math.min(USER_ZOOM_MAX, pinchZoom0 * d/pinchDist0));
  }
});
function pinchEnd(e){ pinchPts.delete(e.pointerId); pinchBase(); }
cv.addEventListener('pointerup', pinchEnd);
cv.addEventListener('pointercancel', pinchEnd);


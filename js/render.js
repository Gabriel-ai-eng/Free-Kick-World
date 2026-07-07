"use strict";
// =========================================================================
// RENDER — câmera na tela, desenho do estádio, do jogador e da bola
// =========================================================================
function render(){
  ctx.clearRect(0,0,CW,CH);
  layoutStadium();
  
  // transição suave Longe <-> Perto
  cam.prog += ((cam.near?1:0) - cam.prog) * 0.15;
  const t = cam.prog;

  // fundo (fora da imagem do estádio)
  ctx.fillStyle='#05080f'; ctx.fillRect(0,0,CW,CH);

  const inGame = (state.scene==='game' || state.scene==='end');
  
  ctx.save();
  cam.spriteScale = 1;
  
  if(inGame){
    const p = uvToScreen(player.u, player.v);     
    const charH = depthScale(player.v);           
    
    // --- LONGE (t=0) ---
    const c00=uvToScreen(0,0), c10=uvToScreen(1,0), c01=uvToScreen(0,1), c11=uvToScreen(1,1);
    const fL=Math.min(c00.x,c10.x,c01.x,c11.x), fR=Math.max(c00.x,c10.x,c01.x,c11.x);
    const fT=Math.min(c00.y,c10.y,c01.y,c11.y), fB=Math.max(c00.y,c10.y,c01.y,c11.y);
    const fcx=(fL+fR)/2, fcy=(fT+fB)/2;           
    const zFar = Math.max(1, Math.min(CW/(fR-fL), CH/(fB-fT)) * FIELD_FILL);
    
    // --- PERTO (t=1) ---
    const zNear = Math.max(1, Math.min(8, (CH*CHAR_ON_SCREEN)/charH));
    const zoom  = lerp(zFar, zNear, t) * cam.userZoom;
    const wx = lerp(fcx, p.x, t), wy = lerp(fcy, p.y - charH*0.5, t);
    
    ctx.translate(CW/2, CH/2);
    ctx.scale(zoom, zoom);
    ctx.translate(-wx, -wy);
    cam.spriteScale = lerp(1/zFar, 1, t);
  }

  // estádio PROCEDURAL MODULAR
  Stadium.draw(ctx, img.dx, img.dy, img.dw, img.dh);

  if(inGame){
    // ordena por profundidade (v) p/ sobreposição correta
    const ents=[
      {v:ball.v,    d:drawBall},
      {v:player.v,  d:drawPlayer},
    ].sort((a,b)=>a.v-b.v);
    ents.forEach(e=>e.d());
  }

  ctx.restore();

  // vinheta suave
  const vg=ctx.createRadialGradient(CW/2, CH*0.55, CH*0.25, CW/2, CH*0.55, CH*0.95);
  vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,0.42)');
  ctx.fillStyle=vg; ctx.fillRect(0,0,CW,CH);

  if(goalFlash>0){ 
    goalFlash-=0.03;
    ctx.fillStyle=`rgba(252,211,77,${Math.max(0,goalFlash)*0.30})`; 
    ctx.fillRect(0,0,CW,CH); 
  }

  if(state.scene==='game' || state.scene==='end') Stadium.weather(ctx);
}

// Para primitivas e formas geométricas (como sombras), o suavizador pode ficar ativado
function shadow(x,y,w){ 
  ctx.imageSmoothingEnabled=true; 
  ctx.fillStyle='rgba(0,0,0,0.30)';
  ctx.beginPath(); 
  ctx.ellipse(x,y,w,w*0.35,0,0,Math.PI*2); 
  ctx.fill(); 
}

function drawPlayer(){
  const p=uvToScreen(player.u,player.v);
  const jumping = player.jumping;
  const kicking = player.kicking && !jumping;
  const run = !kicking && !jumping && player.running && player.moving;
  
  const idleReady = (typeof A.idle!=='undefined') && A.idle.complete && A.idle.naturalWidth>0 && typeof IDLE_SH!=='undefined';
  const idle = !jumping && !kicking && !player.moving && idleReady;
  
  const sheet = jumping ? JUMP_SH : kicking ? KICK_SH : idle ? IDLE_SH : (run ? RUN_SH : WALK_SH);
  const sprite = jumping ? A.jump : kicking ? A.kick : idle ? A.idle : (run ? A.runner : A.walk);
  
  const ss=cam.spriteScale||1;                    
  const h=depthScale(player.v)*ss, w=h*(sheet.FW/sheet.FH);
  const pz=player.z*ss;                            
  const sj=1/(1+pz/Math.max(20,h*0.6));
  
  shadow(p.x, p.y, w*0.42*sj);
  
  let f;
  
  // FIX DE VELOCIDADE: Multiplicamos o player.anim pelo fator do sheet para desacelerar o movimento
  const animSpeed = sheet.animSpeedFactor ? (player.anim * sheet.animSpeedFactor) : (player.anim * 0.35);

  if(jumping){
    f = Math.min(sheet.frames-1, Math.max(0, Math.floor(player.jumpT)));
  } else if(kicking){
    f = Math.min(sheet.frames-1, Math.max(0, Math.floor(player.kickT)));
  } else if(idle){
    f = Math.floor(performance.now()/IDLE_MS) % IDLE_SH.frames;
  } else if(!player.moving){
    f = 0;   
  } else if(sheet === WALK_SH){
    const last = sheet.frames - 1;            
    const n = sheet.frames - 2;               
    // Usando a variável reduzida (animSpeed) em vez de player.anim direto
    const idx = Math.floor(animSpeed) % n;  
    f = idx < n - 1 ? idx + 1 : last;         
  } else {
    // Aplica a lentidão também na corrida, se necessário
    f = Math.floor(animSpeed) % sheet.frames;
  }
  
  const col=f%sheet.cols, row=Math.floor(f/sheet.cols);
  
  // PIXEL PERFECT FIX: Desativamos a suavização para garantir bordas nítidas na pixel art
  ctx.imageSmoothingEnabled = false;        
  // ctx.imageSmoothingQuality='high'; // REMOVIDO para não forçar a suavização
  
  ctx.save();
  ctx.translate(p.x, p.y - pz);               
  if(player.face<0) ctx.scale(-1,1);          
  ctx.drawImage(sprite, col*sheet.FW,row*sheet.FH,sheet.FW,sheet.FH, -w/2,-h, w,h);
  ctx.restore();
}

let spin=0;
function drawBall(){
  const p=uvToScreen(ball.u,ball.v);
  const r=Math.max(3, depthScale(ball.v)*0.085*(cam.spriteScale||1));
  spin+=(Math.abs(ball.vu)+Math.abs(ball.vv))*0.3;
  shadow(p.x,p.y, r*1.1);
  
  if(typeof ballImg!=='undefined' && ballImg.complete && ballImg.naturalWidth>0){
    ctx.save();
    ctx.translate(p.x, p.y-r);
    ctx.rotate(spin);
    // PIXEL PERFECT FIX para a bola: Se a bola for uma sprite em pixel art, deve ser false.
    ctx.imageSmoothingEnabled = false; 
    ctx.drawImage(ballImg, -r, -r, r*2, r*2);
    ctx.restore();
    return;
  }
  
  // Fallback procedural (formas geométricas podem ter o suavizador ativado para não ficarem serrilhadas)
  ctx.imageSmoothingEnabled=true;
  ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(p.x,p.y-r,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle='#cbd5e1'; ctx.lineWidth=Math.max(1,r*0.18); ctx.stroke();
  ctx.fillStyle='#1f2937';
  ctx.beginPath(); ctx.arc(p.x+Math.cos(spin)*r*0.4, p.y-r+Math.sin(spin)*r*0.4, r*0.32,0,Math.PI*2); ctx.fill();
}

"use strict";
// =========================================================================
// STADIUM — estádio procedural (céu, arquibancada, público, grama, luzes, clima)
// =========================================================================
// =========================================================================
//  ESTÁDIO PROCEDURAL MODULAR
// -------------------------------------------------------------------------
//  Em vez de uma imagem única, o estádio é recriado por código em CAMADAS
//  independentes (céu, arquibancadas, público, painéis, gramado, linhas,
//  traves/redes, luzes, sombras, clima). Tudo é controlado por `Stadium.cfg`.
//  As camadas estáticas são pintadas UMA vez num canvas offscreen (de tamanho
//  fixo STADIUM_W×STADIUM_H) e depois só "blitadas" a cada frame; o clima é
//  dinâmico (por frame). Para mudar QUALQUER coisa, ajuste cfg e chame
//  Stadium.rebuild() — sem recriar o resto. Ex.: Stadium.cfg.grass.snow=0.6;
//  Stadium.cfg.weather.type='snow'; Stadium.rebuild();
// =========================================================================
const Stadium = {
  W: STADIUM_W, H: STADIUM_H,
  // --- CONFIG: tudo controlável por código. Mude e chame Stadium.rebuild(). ---
  cfg: {
    sky:    { top:'#02040f', mid:'#06122a', stars:130 },
    struct: { roof:'#0a1322', truss:'#22324e', facade:'#0a1320', shadow:0.5 },
    crowd:  { density:0.62,
              people:[[232,150,68],[245,198,86],[70,120,182],[120,165,212],[224,231,241],[198,86,70],[96,152,112],[176,192,214],[150,170,200],[210,170,120]],
              seats:[[19,32,56],[15,26,46],[25,40,68],[11,20,38]],
              tiers:[0.245,0.32,0.40,0.475], concourse:'#04070e', rail:'#7188af', exit:'#37d268', vom:'#02030a' },
    boards: { bg:'#12409a', bg2:'#0a2a66', edge:'#3a6fd0', y1:'#ffe14d', w:'#ffffff',
              msgs:['PIXEL SPORT','BRASIL FUTEBOL'] },
    grass:  { light:'#52b657', dark:'#3b9444', stripes:18, mow:'vertical',
              pool:'#dcf4b4', poolA:0.13, noise:0.5, wear:0, mud:0, snow:0 },
    lines:  { color:'#f3faf5', width:2.6, inset_u:0.03, inset_v:0.045 },
    goals:  { post:'#f5f9fd', net:'190,202,222', depth:0.05, vH:0.072, gh:0.06,
              imgScale:2.4, imgLift:0.0 },  // imgScale: ajuste fino de tamanho (1=encaixe exato nas traves); imgLift: sobe/desce a base
    lights: { intensity:0.55, color:'#e6f0ff', pools:5,
              towerL:[0.06,0.06], towerR:[0.94,0.06], strip:[0.17,0.83,0.15] },
    shadows:{ vignette:0.5, rim:0.45 },
    weather:{ type:'none', intensity:0.5 },   // 'none' | 'rain' | 'snow' | 'fog'
  },
  cv:null, c:null, built:false, pitch:null, _w:{ parts:[], t:0 }, _grassTex:null,

  uv(u,v){ const P=this.pitch;
    const tx=lerp(P.TL.x,P.TR.x,u), ty=lerp(P.TL.y,P.TR.y,u);
    const bx=lerp(P.BL.x,P.BR.x,u), by=lerp(P.BL.y,P.BR.y,u);
    return { x:lerp(tx,bx,v), y:lerp(ty,by,v) };
  },
  pitchPath(c, inset){ const k=inset||0;
    const a=this.uv(k,k*0.6), b=this.uv(1-k,k*0.6), d=this.uv(1-k,1-k*0.6), e=this.uv(k,1-k*0.6);
    c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.lineTo(d.x,d.y); c.lineTo(e.x,e.y); c.closePath();
  },

  build(){
    if(!this.cv){ this.cv=document.createElement('canvas'); this.cv.width=this.W; this.cv.height=this.H; this.c=this.cv.getContext('2d'); }
    const c=this.c; c.clearRect(0,0,this.W,this.H);
    this.pitch={ TL:{x:PITCH.TL.x*this.W,y:PITCH.TL.y*this.H}, TR:{x:PITCH.TR.x*this.W,y:PITCH.TR.y*this.H},
                 BR:{x:PITCH.BR.x*this.W,y:PITCH.BR.y*this.H}, BL:{x:PITCH.BL.x*this.W,y:PITCH.BL.y*this.H} };
    const L=this.L;
    L.Sky(this,c);                 // céu noturno + estrelas
    L.UpperCrowd(this,c);          // arquibancada superior (vários níveis)
    L.LowerCrowd(this,c);          // nível inferior + laterais + faixa próxima
    L.StadiumStructure(this,c);    // teto, treliças, fachada
    L.StadiumLights(this,c);       // torres de refletor + faixa de LED + brilho
    L.Billboards(this,c);          // painéis publicitários (objetos independentes)
    L.GrassTileMap(this,c);        // gramado modular com variação
    L.FieldLinesProcedural(this,c);// linhas desenhadas proceduralmente
    L.Goals(this,c);               // traves + redes (cenas independentes)
    L.DynamicShadows(this,c);      // sombras ambientais + vinheta
    this.built=true;
  },
  rebuild(){ this.built=false; this.build(); },

  // ---- TEXTURA DE GRAMA PROCEDURAL (HD pixel art) ----
  // Gerada UMA vez num canvas offscreen em "espaço do campo" (retângulo visto
  // de cima; x=u, y=v) e depois fatiada em perspectiva pelo GrassTileMap — a
  // MESMA técnica usada antes com a foto, então perspectiva, dimensões e
  // marcações não mudam em nada. Por ser gerada pixel a pixel com ruído, não
  // existe tile: nada se repete e não há costura possível.
  //   • faixas de corte (mow stripes) verticais com transição SUAVE nas bordas,
  //     na MESMA paleta de verdes do cfg (grass.light/grass.dark);
  //   • manchas largas de tom (ruído bilinear em 2 escalas) quebram a
  //     uniformidade como num gramado de verdade;
  //   • grão vertical correlacionado (cada pixel herda do de cima) desenha o
  //     "fio" das lâminas — milhares de folhas discretas, densas e macias;
  //   • por cima, pontas iluminadas e sombras de 1px entre as lâminas dão a
  //     profundidade (brilho sutil em cima, sombra embaixo).
  _makeGrassTex(){
    const g=this.cfg.grass;
    const TW=1408, TH=576;
    const cv=document.createElement('canvas'); cv.width=TW; cv.height=TH;
    const c=cv.getContext('2d');
    const hex=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
    const light=hex(g.light), dark=hex(g.dark);
    // ruído bilinear (grade de valores aleatórios interpolada): 2 escalas
    const grid=(gw,gh)=>{ const a=new Float32Array((gw+1)*(gh+1));
      for(let i=0;i<a.length;i++) a[i]=Math.random();
      return (x,y)=>{ const fx=x*gw, fy=y*gh, ix=Math.min(gw-1,fx|0), iy=Math.min(gh-1,fy|0), tx=fx-ix, ty=fy-iy;
        const o=iy*(gw+1)+ix, v0=a[o]+(a[o+1]-a[o])*tx, v1=a[o+gw+1]+(a[o+gw+2]-a[o+gw+1])*tx;
        return v0+(v1-v0)*ty; }; };
    const n1=grid(9,6), n2=grid(37,24);
    // mistura claro/escuro por coluna (faixas de corte com borda suave)
    const stripes=g.stripes||18, sw=0.16, mixCol=new Float32Array(TW);
    for(let x=0;x<TW;x++){
      const pos=x/TW*stripes, i=pos|0, f=pos-i;
      const base=(i%2)?0:1, prev=((i+stripes-1)%2)?0:1, next=((i+1)%2)?0:1;
      let m=base;
      if(f<sw) m=prev+(base-prev)*(0.5+0.5*(f/sw));
      else if(f>1-sw) m=base+(next-base)*(0.5*((f-(1-sw))/sw));
      mixCol[x]=m;
    }
    const im=c.createImageData(TW,TH), d=im.data;
    const noise=(g.noise==null)?0.5:g.noise;
    // grão vertical: valor de cada coluna "escorre" para o pixel de baixo
    const grain=new Float32Array(TW);
    for(let x=0;x<TW;x++) grain[x]=Math.random()-0.5;
    for(let y=0;y<TH;y++){
      const v=y/TH;
      for(let x=0;x<TW;x++){
        grain[x]=grain[x]*0.62+(Math.random()-0.5)*0.38;
        const u=x/TW, m=mixCol[x];
        let r=dark[0]+(light[0]-dark[0])*m,
            gg=dark[1]+(light[1]-dark[1])*m,
            b=dark[2]+(light[2]-dark[2])*m;
        const patch=(n1(u,v)-0.5)*0.14+(n2(u,v)-0.5)*0.10;   // manchas de tom
        const blade=grain[x]*(0.20+0.30*noise);              // fio das lâminas
        const k=1+patch+blade;
        r*=k; gg*=k; b*=k;
        const o=(y*TW+x)*4;
        d[o]=r>255?255:r; d[o+1]=gg>255?255:gg; d[o+2]=b>255?255:b; d[o+3]=255;
      }
    }
    c.putImageData(im,0,0);
    // folhas discretas por cima: pontas claras (luz) e vãos escuros (sombra)
    for(let i=0;i<9000;i++){
      const x=(Math.random()*TW)|0, y=(Math.random()*TH)|0, tall=1+((Math.random()*2)|0);
      if(Math.random()<0.55) c.fillStyle=`rgba(189,234,150,${0.10+Math.random()*0.18})`;
      else                   c.fillStyle=`rgba(24,80,34,${0.10+Math.random()*0.16})`;
      c.fillRect(x,y,1,tall);
    }
    return cv;
  },

  // Público denso via ImageData (rápido e fino) — preenche região [y0,y1].
  _crowd(c, y0, y1){
    const W=this.W; y0=Math.max(0,y0|0); y1=Math.min(this.H,y1|0); if(y1<=y0) return;
    const reg=c.getImageData(0,y0,W,y1-y0), d=reg.data, k=this.cfg.crowd, ppl=k.people, st=k.seats;
    const yTop=this.H*0.17, yPit=this.H*0.55;
    for(let y=y0;y<y1;y+=2){
      const f=Math.max(0,Math.min(1,(y-yTop)/(yPit-yTop))), bright=0.42+0.58*f;
      for(let x=0;x<W;x+=2){
        const edge=0.55+0.45*(1-Math.min(1,Math.abs(x-W/2)/(W*0.62)));
        const col = (Math.random()<k.density) ? ppl[(Math.random()*ppl.length)|0] : st[(Math.random()*st.length)|0];
        const m=bright*edge*(0.78+0.44*Math.random());
        const r=Math.min(255,col[0]*m)|0, g=Math.min(255,col[1]*m)|0, b=Math.min(255,col[2]*m)|0;
        for(let dy=0;dy<2 && (y+dy)<y1;dy++){ let o=((y+dy-y0)*W+x)*4;
          for(let dx=0;dx<2 && (x+dx)<W;dx++){ d[o]=r; d[o+1]=g; d[o+2]=b; d[o+3]=255; o+=4; } }
      }
    }
    c.putImageData(reg,0,y0);
  },

  // ---- CAMADAS ----
  L:{
    Sky(S,c){
      const k=S.cfg.sky, W=S.W, H=S.H;
      const g=c.createLinearGradient(0,0,0,H*0.20); g.addColorStop(0,k.top); g.addColorStop(1,k.mid);
      c.fillStyle=g; c.fillRect(0,0,W,H*0.20);
      for(let i=0;i<k.stars;i++){ c.globalAlpha=Math.random()*0.7+0.2; c.fillStyle='#fff'; c.fillRect(Math.random()*W, Math.random()*H*0.12, 1.5,1.5); }
      c.globalAlpha=1;
    },
    UpperCrowd(S,c){
      const k=S.cfg.crowd, W=S.W, H=S.H;
      S._crowd(c, H*0.17, H*0.505);
      // divisórias dos níveis (concourse) curvas, com corrimão, vomitórios e saídas
      const div=(yf)=>{ const baseY=yf*H, amp=H*0.016, hh=H*0.013;
        const yc=x=> baseY - amp*Math.pow(2*x/W-1,2);
        c.fillStyle=k.concourse; c.beginPath();
        for(let x=0;x<=W;x+=8){ const yy=yc(x); x===0?c.moveTo(x,yy):c.lineTo(x,yy); }
        for(let x=W;x>=0;x-=8){ c.lineTo(x, yc(x)+hh); } c.closePath(); c.fill();
        c.strokeStyle=k.rail; c.globalAlpha=0.55; c.lineWidth=1.5; c.beginPath();
        for(let x=0;x<=W;x+=8){ const yy=yc(x); x===0?c.moveTo(x,yy):c.lineTo(x,yy);} c.stroke(); c.globalAlpha=1;
        for(let i=0;i<16;i++){ const x=(i+0.5)/16*W, yy=yc(x);
          c.fillStyle=k.vom; c.fillRect(x-7, yy-H*0.026, 14, H*0.026);
          c.fillStyle=k.exit; c.fillRect(x-2, yy-3, 4, 3); }
      };
      k.tiers.forEach(div);
    },
    LowerCrowd(S,c){
      S._crowd(c, S.H*0.505, S.H);   // nível inferior + laterais (cobertos no centro pelo campo)
    },
    StadiumStructure(S,c){
      const k=S.cfg.struct, W=S.W, H=S.H;
      // teto
      c.fillStyle=k.roof; c.fillRect(0,0,W,H*0.135);
      // treliças (diagonais + vigas)
      c.strokeStyle=k.truss; c.globalAlpha=0.7; c.lineWidth=2;
      for(let x=0;x<W;x+=30){ c.beginPath(); c.moveTo(x,H*0.03); c.lineTo(x+30,H*0.125); c.stroke();
                              c.beginPath(); c.moveTo(x+30,H*0.03); c.lineTo(x,H*0.125); c.stroke(); }
      c.beginPath(); c.moveTo(0,H*0.03); c.lineTo(W,H*0.03); c.moveTo(0,H*0.125); c.lineTo(W,H*0.125); c.stroke();
      c.globalAlpha=1;
      // fachada escura entre teto e arquibancada
      c.fillStyle=k.facade; c.fillRect(0,H*0.135,W,H*0.035);
      // sombra inferior do teto
      c.fillStyle=`rgba(0,0,0,${k.shadow})`; c.fillRect(0,H*0.125,W,H*0.012);
    },
    StadiumLights(S,c){
      const k=S.cfg.lights, W=S.W, H=S.H;
      // faixa de LED no topo do estádio
      const s0=k.strip[0]*W, s1=k.strip[1]*W, yy=k.strip[2]*H;
      c.fillStyle=k.color; for(let x=s0;x<s1;x+=W*0.012){ c.globalAlpha=0.92; c.fillRect(x,yy,W*0.0075,H*0.014); }
      c.globalAlpha=1;
      c.save(); c.globalCompositeOperation='lighter';
      const sg=c.createLinearGradient(0,yy-H*0.05,0,yy+H*0.06);
      sg.addColorStop(0,'rgba(0,0,0,0)'); sg.addColorStop(0.5,'rgba(200,222,255,0.45)'); sg.addColorStop(1,'rgba(0,0,0,0)');
      c.fillStyle=sg; c.fillRect(s0,yy-H*0.05,s1-s0,H*0.11);
      // torres de refletor (cantos)
      for(const t of [k.towerL,k.towerR]){
        const X=t[0]*W, Y=t[1]*H;
        c.globalCompositeOperation='source-over'; c.fillStyle='#0a1020'; c.fillRect(X-W*0.05,Y-H*0.022,W*0.10,H*0.052);
        c.fillStyle=k.color; for(let i=0;i<6;i++)for(let j=0;j<4;j++){ c.globalAlpha=0.95; c.fillRect(X-W*0.043+i*W*0.015, Y-H*0.017+j*H*0.012, W*0.009, H*0.0075); }
        c.globalAlpha=1; c.globalCompositeOperation='lighter';
        const g=c.createRadialGradient(X,Y,4,X,Y,W*0.17); g.addColorStop(0,'rgba(220,235,255,0.8)'); g.addColorStop(1,'rgba(0,0,0,0)');
        c.fillStyle=g; c.fillRect(X-W*0.22,Y-H*0.28,W*0.44,H*0.5);
      }
      c.globalAlpha=1; c.restore();
    },
    Billboards(S,c){
      const k=S.cfg.boards;
      const far=S.uv(0.5,0).y, near=S.uv(0.5,1).y;
      S._board(c, S.uv(0,0).x, S.uv(1,0).x, far - S.H*0.03,  S.H*0.028, k, false);  // longe (atrás)
      S._board(c, S.uv(0,1).x, S.uv(1,1).x, near + S.H*0.004, S.H*0.04,  k, true);   // perto (frente)
    },
    GrassTileMap(S,c){
      const g=S.cfg.grass; c.save(); S.pitchPath(c,0); c.clip();
      c.fillStyle=g.dark; c.fillRect(0,0,S.W,S.H);
      // ---- Gramado PROCEDURAL HD (textura gerada em _makeGrassTex) ----
      // Fatiada no trapézio com a MESMA matemática de faixas usada antes com a
      // foto: cada faixa horizontal da textura (espaço do campo, x=u / y=v) é
      // esticada para a largura do campo naquela profundidade — perspectiva
      // idêntica, zero costura (as faixas se sobrepõem 0.5px).
      if(!S._grassTex) S._grassTex=S._makeGrassTex();
      const tex=S._grassTex, tw=tex.width, th=tex.height;
      const N=96; c.imageSmoothingEnabled=true;
      for(let i=0;i<N;i++){
        const t0=i/N, t1=(i+1)/N;
        const sy0=t0*th, sy1=t1*th;
        const dL0=S.uv(0,t0), dR0=S.uv(1,t0), dL1=S.uv(0,t1);
        c.drawImage(tex, 0, sy0, tw, Math.max(1,sy1-sy0),
                    dL0.x, dL0.y-0.5, dR0.x-dL0.x, (dL1.y-dL0.y)+1);
      }
      // poça de luz dos refletores
      const ctr=S.uv(0.5,0.5), lp=c.createRadialGradient(ctr.x,ctr.y,S.H*0.04,ctr.x,ctr.y,S.W*0.5);
      lp.addColorStop(0,g.pool); lp.addColorStop(1,'rgba(0,0,0,0)'); c.globalAlpha=g.poolA; c.fillStyle=lp; c.fillRect(0,0,S.W,S.H); c.globalAlpha=1;
      // overlays ambientais opcionais (controláveis por código)
      if(g.wear>0){ c.globalAlpha=g.wear*0.5; for(let i=0;i<800;i++){ const p=S.uv(Math.random(),Math.random()); c.fillStyle=Math.random()<0.5?'#6b7a3a':'#7a6a40'; c.fillRect(p.x,p.y,2,2);} c.globalAlpha=1; }
      if(g.mud>0){ c.globalAlpha=g.mud; for(let i=0;i<70;i++){ const p=S.uv(0.5+(Math.random()-0.5)*0.6,0.5+(Math.random()-0.5)*0.7); c.fillStyle='#4a3826'; c.beginPath(); c.ellipse(p.x,p.y,10+Math.random()*16,5+Math.random()*8,0,0,7); c.fill(); } c.globalAlpha=1; }
      if(g.snow>0){ c.globalAlpha=g.snow; c.fillStyle='#eef4ff'; c.fillRect(0,0,S.W,S.H); c.globalAlpha=1; }
      c.restore();
    },
    FieldLinesProcedural(S,c){
      const L=S.cfg.lines, iu=L.inset_u, iv=L.inset_v;
      c.strokeStyle=L.color; c.fillStyle=L.color; c.lineWidth=L.width; c.lineJoin='round'; c.lineCap='round';
      const path=(pts,close)=>{ c.beginPath(); pts.forEach((q,i)=>{const p=S.uv(q[0],q[1]); i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y);}); if(close)c.closePath(); c.stroke(); };
      const dot=(u,v,r)=>{ const p=S.uv(u,v); c.beginPath(); c.arc(p.x,p.y,r||3,0,7); c.fill(); };
      const ellipse=(cu,cv,ru,rv,a0,a1)=>{ const N=48,pts=[]; a0=a0||0; a1=(a1==null?Math.PI*2:a1);
        for(let i=0;i<=N;i++){ const a=a0+(a1-a0)*i/N; pts.push([cu+ru*Math.cos(a), cv+rv*Math.sin(a)]); } path(pts,false); };
      path([[iu,iv],[1-iu,iv],[1-iu,1-iv],[iu,1-iv]], true);            // limite
      path([[0.5,iv],[0.5,1-iv]], false);                               // linha do meio
      ellipse(0.5,0.5,0.115,0.165); dot(0.5,0.5,3);                     // círculo + marca central
      for(const s of [0,1]){ const sgn=s?-1:1, base=s?1-iu:iu, bx=base+sgn*0.165, gx=base+sgn*0.072;
        path([[base,0.26],[bx,0.26],[bx,0.74],[base,0.74]], false);      // grande área
        path([[base,0.39],[gx,0.39],[gx,0.61],[base,0.61]], false);      // pequena área
        dot(base+sgn*0.11, 0.5, 2.6);                                    // marca do pênalti
        ellipse(base+sgn*0.11, 0.5, 0.052, 0.075, s?Math.PI*0.62:-Math.PI*0.38, s?Math.PI*1.38:Math.PI*0.38);
      }
      ellipse(iu,iv,0.018,0.026,0,Math.PI/2); ellipse(1-iu,iv,0.018,0.026,Math.PI/2,Math.PI);
      ellipse(1-iu,1-iv,0.018,0.026,Math.PI,Math.PI*1.5); ellipse(iu,1-iv,0.018,0.026,Math.PI*1.5,Math.PI*2);
    },
    Goals(S,c){
      const k=S.cfg.goals, iu=S.cfg.lines.inset_u, vh=k.vH, gh=S.H*k.gh;
      const goal=(side)=>{ const sgn=side?-1:1, gl=side?1-iu:iu, back=gl - sgn*k.depth, v0=0.5-vh, v1=0.5+vh;
        const fb1=S.uv(gl,v0), fb2=S.uv(gl,v1), bb1=S.uv(back,v0), bb2=S.uv(back,v1);
        const im = side? goalRightImg : goalLeftImg;
        // ---- Gol por IMAGEM (frame em perspectiva) ----
        if(im && im.complete && im.naturalWidth>0){
          const A = side? GOAL_ANCH.right : GOAL_ANCH.left;
          const near=fb2, far=fb1;   // bases das traves no campo: near (frente/baixa), far (fundo/alta)
          const sc = k.imgScale||1;
          // resolve dw/dh para as âncoras near/far caírem EXATAMENTE nas bases das
          // traves do campo (a imagem já está no ângulo certo → sem distorção).
          const dw=((far.x-near.x)/(A.farX-A.nearX))*sc;
          const dh=((far.y-near.y)/(A.farY-A.nearY))*sc;
          const dx = near.x - A.nearX*dw;
          const dy = near.y - A.nearY*dh - dh*(k.imgLift||0);
          c.imageSmoothingEnabled=true;
          c.drawImage(im, dx, dy, dw, dh);
          return;
        }
        // ---- Fallback procedural (traves + rede) ----
        const ft1={x:fb1.x,y:fb1.y-gh}, ft2={x:fb2.x,y:fb2.y-gh}, bt1={x:bb1.x,y:bb1.y-gh*0.9}, bt2={x:bb2.x,y:bb2.y-gh*0.9};
        S.L.Nets(S,c,{fb1,fb2,bb1,bb2,ft1,ft2,bt1,bt2});
        c.strokeStyle=k.post; c.lineWidth=Math.max(2.5,S.H*0.005); c.lineCap='round'; c.lineJoin='round';
        c.beginPath(); c.moveTo(fb1.x,fb1.y); c.lineTo(ft1.x,ft1.y); c.lineTo(ft2.x,ft2.y); c.lineTo(fb2.x,fb2.y); c.stroke(); // postes+travessão frente
        c.beginPath(); c.moveTo(ft1.x,ft1.y); c.lineTo(bt1.x,bt1.y); c.lineTo(bt2.x,bt2.y); c.lineTo(ft2.x,ft2.y); c.stroke(); // topo p/ trás
        c.beginPath(); c.moveTo(bb1.x,bb1.y); c.lineTo(bt1.x,bt1.y); c.moveTo(bb2.x,bb2.y); c.lineTo(bt2.x,bt2.y); c.stroke(); // postes de trás
      };
      goal(0); goal(1);
    },
    Nets(S,c,g){
      c.save(); c.strokeStyle=`rgba(${S.cfg.goals.net},0.5)`; c.lineWidth=1;
      // fundo da rede
      c.beginPath(); c.moveTo(g.bt1.x,g.bt1.y); c.lineTo(g.bt2.x,g.bt2.y); c.lineTo(g.bb2.x,g.bb2.y); c.lineTo(g.bb1.x,g.bb1.y); c.closePath();
      c.fillStyle='rgba(255,255,255,0.05)'; c.fill();
      const N=9; for(let i=0;i<=N;i++){ const t=i/N;
        const a={x:lerp(g.bt1.x,g.bt2.x,t),y:lerp(g.bt1.y,g.bt2.y,t)}, b={x:lerp(g.bb1.x,g.bb2.x,t),y:lerp(g.bb1.y,g.bb2.y,t)};
        c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.stroke(); }
      for(let i=0;i<=4;i++){ const t=i/4;
        const a={x:lerp(g.bt1.x,g.bb1.x,t),y:lerp(g.bt1.y,g.bb1.y,t)}, b={x:lerp(g.bt2.x,g.bb2.x,t),y:lerp(g.bt2.y,g.bb2.y,t)};
        c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.stroke(); }
      // teto da rede (frente->trás)
      for(let i=0;i<=4;i++){ const t=i/4;
        const a={x:lerp(g.ft1.x,g.ft2.x,t),y:lerp(g.ft1.y,g.ft2.y,t)}, b={x:lerp(g.bt1.x,g.bt2.x,t),y:lerp(g.bt1.y,g.bt2.y,t)};
        c.beginPath(); c.moveTo(a.x,a.y); c.lineTo(b.x,b.y); c.stroke(); }
      c.restore();
    },
    DynamicShadows(S,c){
      const k=S.cfg.shadows, W=S.W, H=S.H;
      c.save(); S.pitchPath(c,-0.02); c.lineWidth=H*0.03; c.strokeStyle=`rgba(0,0,0,${k.rim})`; c.filter='blur(7px)'; c.stroke(); c.filter='none'; c.restore();
      const vg=c.createRadialGradient(W/2,H*0.5,H*0.32,W/2,H*0.52,W*0.72);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,`rgba(0,0,0,${k.vignette})`); c.fillStyle=vg; c.fillRect(0,0,W,H);
      const bg=c.createLinearGradient(0,H*0.82,0,H); bg.addColorStop(0,'rgba(0,0,0,0)'); bg.addColorStop(1,'rgba(0,0,0,0.4)'); c.fillStyle=bg; c.fillRect(0,H*0.82,W,H*0.18);
    },
  },

  // painel publicitário (objeto independente) — faixa horizontal com texto
  _board(c, x0, x1, y, h, k, near){
    const w=x1-x0;
    const g=c.createLinearGradient(0,y,0,y+h); g.addColorStop(0,k.bg); g.addColorStop(1,k.bg2);
    c.fillStyle=g; c.fillRect(x0,y,w,h);
    c.strokeStyle=k.edge; c.lineWidth=2; c.strokeRect(x0,y,w,h);
    c.save(); c.beginPath(); c.rect(x0,y,w,h); c.clip();
    c.font=`bold ${Math.round(h*0.6)}px "Courier New", monospace`; c.textBaseline='middle';
    const seg=w/(near?7:6);
    for(let i=0;i*seg<w;i++){ c.fillStyle=i%2?k.y1:k.w; c.fillText(k.msgs[i%2], x0+i*seg+seg*0.05, y+h*0.55); }
    c.restore();
  },

  // blit da parte estática (dentro da transform da câmera)
  draw(ctx, dx,dy,dw,dh){
    if(!this.built) this.build();
    const sm=ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled=false;
    ctx.drawImage(this.cv, dx,dy,dw,dh);
    ctx.imageSmoothingEnabled=sm;
  },

  // ---- CAMADA CLIMÁTICA (dinâmica, por frame, em coordenadas de tela) ----
  weather(ctx){
    const w=this.cfg.weather; if(!w || w.type==='none') return;
    const now=performance.now(), dt=Math.min(0.05,(now-(this._w.t||now))/1000); this._w.t=now;
    if(w.type==='fog'){ ctx.fillStyle=`rgba(200,210,225,${0.10+0.25*w.intensity})`; ctx.fillRect(0,0,CW,CH); return; }
    const N=Math.round((w.intensity||0.5)*(w.type==='snow'?160:200)), P=this._w.parts;
    while(P.length<N) P.push({x:Math.random()*CW,y:Math.random()*CH,s:0.5+Math.random()});
    while(P.length>N) P.pop();
    ctx.save();
    if(w.type==='rain'){ ctx.strokeStyle='rgba(180,200,230,0.45)'; ctx.lineWidth=1.4;
      for(const p of P){ p.y+=dt*900*p.s; p.x+=dt*180; if(p.y>CH){p.y=-10;p.x=Math.random()*CW;}
        ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-6,p.y-16); ctx.stroke(); } }
    else { ctx.fillStyle='rgba(240,246,255,0.9)';
      for(const p of P){ p.y+=dt*70*p.s; p.x+=Math.sin(now*0.001+p.y*0.05)*0.4; if(p.y>CH){p.y=-6;p.x=Math.random()*CW;}
        ctx.beginPath(); ctx.arc(p.x,p.y,1.6*p.s,0,7); ctx.fill(); } }
    ctx.restore();
  },
};


"use strict";
// =========================================================================
// TURF — camada VIVA do gramado: vento + deformação onde jogador/bola passam
// =========================================================================
// Equivalente Canvas 2D do par "shader de vento + RenderTexture de deformação"
// dos engines: a textura da grama é estática (pintada uma vez em stadium.js),
// e esta camada anima POR CIMA dela, todo frame, clipada ao trapézio do campo:
//
//   • VENTO — duas faixas largas de brilho muito sutis atravessam o gramado
//     devagar (como a luz pega nas lâminas quando o vento passa), mais
//     pontinhos de lâminas que "piscam" oscilando — o vento nunca para,
//     inclusive enquanto uma marca de pisada está se recuperando.
//   • DEFORMAÇÃO — cada passo do jogador (mais forte correndo), a aterrissagem
//     do pulo e a bola rolando registram uma MARCA no ponto exato (u,v) do
//     campo: uma sombra elíptica orientada na direção do movimento (a grama
//     "deita" para onde o pé empurrou) com um risco claro atrás (lâminas
//     viradas refletindo luz). A marca afeta só a pequena região do impacto e
//     se recupera sozinha em ~3s com easing suave (a grama "levanta").
//
// Custo por frame: 2 gradientes + até MAX_MARKS elipses + ~46 pontinhos —
// leve o bastante para celular. Nada de getImageData/putImageData por frame.
const Turf = {
  marks:[], glints:null, _prev:{}, _t:0, _acc:0, _bacc:0,
  MAX_MARKS:120,

  _spawn(u,v,dx,dy,s,r){
    const M=this.marks; if(M.length>=this.MAX_MARKS) M.shift();
    const len=Math.hypot(dx,dy)||1;
    M.push({ u,v, dx:dx/len, dy:dy/len, s,r, age:0, life:2.6+Math.random()*1.2 });
  },

  update(dt){
    const P=this._prev;
    if(state.scene==='game'){
      // Pisadas: acumula a distância percorrida e solta uma marca a cada
      // "passo" — mais fortes e maiores quando está correndo.
      if(P.pu!=null){
        const du=player.u-P.pu, dv=player.v-P.pv, dist=Math.hypot(du,dv);
        if(dist>0.0004){
          this._acc+=dist;
          if(this._acc>0.012){ this._acc=0;
            this._spawn(player.u, player.v, du, dv, player.running?1:0.7, player.running?1.15:0.9); }
        }
        // aterrissagem do pulo: marca radial mais forte (grama amassada)
        if(P.jump && !player.jumping) this._spawn(player.u, player.v, 0, 1, 1.6, 1.7);
      }
      // Bola rolando: rastro bem sutil, só quando tem velocidade de verdade.
      if(P.bu!=null){
        const du=ball.u-P.bu, dv=ball.v-P.bv, sp=Math.hypot(du,dv);
        if(sp>0.003){ this._bacc+=sp;
          if(this._bacc>0.03){ this._bacc=0; this._spawn(ball.u, ball.v, du, dv, 0.35, 0.5); } }
      }
      P.pu=player.u; P.pv=player.v; P.bu=ball.u; P.bv=ball.v; P.jump=player.jumping;
    } else { P.pu=null; P.bu=null; }
    // recuperação: as marcas envelhecem e somem (o desenho usa easing no alpha)
    for(let i=this.marks.length-1;i>=0;i--){
      const m=this.marks[i]; m.age+=dt; if(m.age>=m.life) this.marks.splice(i,1);
    }
  },

  // Chamado pelo render() DENTRO da transform da câmera, depois do estádio e
  // antes do jogador/bola — as marcas ficam sob os pés, como deve ser.
  draw(ctx){
    const now=performance.now(), dt=Math.min(0.05,(now-(this._t||now))/1000); this._t=now;
    this.update(dt);
    // clip no trapézio do campo (mesmos cantos do desenho do estádio)
    const a=uvToScreen(0,0), b=uvToScreen(1,0), d=uvToScreen(1,1), e=uvToScreen(0,1);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
    ctx.lineTo(d.x,d.y); ctx.lineTo(e.x,e.y); ctx.closePath(); ctx.clip();
    const minX=Math.min(a.x,e.x), maxX=Math.max(b.x,d.x);
    const minY=Math.min(a.y,b.y), maxY=Math.max(d.y,e.y);

    // ---- VENTO: faixas de brilho atravessando o campo bem devagar ----
    const t=now*0.001;
    for(const [speed,phase,al] of [[0.045,0,0.05],[0.031,0.55,0.035]]){
      const w=((t*speed+phase)%1.3)-0.15;                 // -0.15..1.15 em u
      const x0=uvToScreen(w-0.22,0.5).x, x1=uvToScreen(w+0.22,0.5).x;
      const gr=ctx.createLinearGradient(x0,0,x1,0);
      gr.addColorStop(0,'rgba(216,242,176,0)');
      gr.addColorStop(0.5,`rgba(216,242,176,${al})`);
      gr.addColorStop(1,'rgba(216,242,176,0)');
      ctx.fillStyle=gr; ctx.fillRect(minX,minY,maxX-minX,maxY-minY);
    }

    // ---- DEFORMAÇÃO: grama deitada onde jogador/bola passaram ----
    for(const m of this.marks){
      const p=uvToScreen(m.u,m.v), h=depthScale(m.v);
      const k=1-m.age/m.life, ease=k*k;      // recuperação suave (rápida no fim)
      const R=h*0.16*m.r*(0.8+0.4*ease);     // marca fresca é um pouco maior
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(Math.atan2(m.dy*0.5, m.dx));  // dv pesa menos (perspectiva achatada)
      ctx.globalAlpha=0.16*m.s*ease;           // sombra: grama deitada
      ctx.fillStyle='#173f1f';
      ctx.beginPath(); ctx.ellipse(0,0,R*1.5,R*0.55,0,0,7); ctx.fill();
      ctx.globalAlpha=0.09*m.s*ease;           // reflexo: lâminas viradas atrás
      ctx.fillStyle='#bdea96';
      ctx.beginPath(); ctx.ellipse(-R*0.7,0,R*0.9,R*0.32,0,0,7); ctx.fill();
      ctx.restore();
    }

    // ---- lâminas oscilando: pontinhos que acendem e apagam com o vento ----
    if(!this.glints){ this.glints=[];
      for(let i=0;i<46;i++) this.glints.push({u:Math.random(),v:Math.random(),ph:Math.random()*7,sp:0.6+Math.random()}); }
    ctx.fillStyle='#d8f2b0';
    for(const s of this.glints){
      const p=uvToScreen(s.u,s.v);
      ctx.globalAlpha=0.04+0.09*(0.5+0.5*Math.sin(t*1.7*s.sp+s.ph));
      const w=Math.max(1, depthScale(s.v)*0.012);
      ctx.fillRect(p.x,p.y,w,w*1.6);
    }
    ctx.globalAlpha=1;
    ctx.restore();
  },
};

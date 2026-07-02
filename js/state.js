"use strict";
// =========================================================================
// STATE — estado da partida, jogador, bola, gol e estado do chute
// =========================================================================
// ---------- Estado ----------
// mode: 'quick' = Partida rápida (60s, contagem regressiva). 'full' = Jogar
// (partida completa: 1º e 2º tempo de 45 min cada, cronômetro crescente).
// paused: existe uma partida em andamento (guardada) que pode ser RETOMADA no
// ponto exato ao tocar em Jogar (o jogador saiu para a tela inicial sem terminar).
const state = { scene:'title', score:0, time:60, running:false, mode:'quick', half:1, clock:0, paused:false };
const HALF_SECONDS = 45*60;   // duração de cada tempo (45 min). Fácil de ajustar.
// formata segundos como MM:SS para o cronômetro
function fmtClock(sec){ const m=Math.floor(sec/60), s=sec%60; return (m<10?'0':'')+m+':'+(s<10?'0':'')+s; }
const player = { u:0.5, v:0.72, face:1, anim:0, moving:false, running:false, z:0, vz:0, kicking:false, kickT:0, jumping:false, jumpT:0 };  // z: altura do pulo (px) / face: 1 dir / -1 esq / kicking: chute parado / jumping: animacao de pulo
const ball   = { u:0.5, v:0.60, vu:0, vv:0 };
const GOAL = { uMin:0.42, uMax:0.58 };   // boca do gol no fundo (v≈0)
const GOAL_NET = 0.06;                    // profundidade da trave (atrás da linha de fundo)
let goalScored = false;                   // evita contar o mesmo gol várias vezes
// Estado do chute parado: direcao do lancamento, se a bola sera chutada e se ja foi lancada.
let kickDir = { x:0, y:-1 };
let kickBall = false;
let kickFired = false;

// EVENTOS DE ANIMACAO do chute (padrao "Animation Event"): cada evento dispara
// UMA unica vez quando a reproducao (player.kickT, em frames) cruza o `frame`
// indicado. O contato e um evento no FRAME EXATO em que o pe encosta na bola —
// so entao a bola ganha velocidade e sai rolando, garantindo impacto perfeito.
function onKickContact(){
  if(kickBall){ ball.vu = kickDir.x*1.35; ball.vv = kickDir.y*1.35; }
  kickFired = true;
}
const KICK_EVENTS = [
  { frame: KICK_CONTACT, done:false, action: onKickContact },
];


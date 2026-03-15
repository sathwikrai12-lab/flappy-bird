// =============================================================
//  Magic Ball Adventure  ·  by Sathwik Rai
//  Clean single-pass rewrite — no patch history
// =============================================================

const canvas = document.getElementById("c");
const ctx    = canvas.getContext("2d");

// ── Resize ───────────────────────────────────────────────────
function resize(){
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", ()=>{ resize(); makeBG(); });
resize();

// ── Fonts ────────────────────────────────────────────────────
const F_BIG   = "bold 42px 'Fredoka One',cursive";
const F_MED   = "bold 28px 'Fredoka One',cursive";
const F_SMALL = "bold 20px 'Fredoka One',cursive";
const F_LABEL = "bold 14px Nunito,sans-serif";
const F_TINY  = "12px Nunito,sans-serif";

// ── Difficulty — VERY EASY ───────────────────────────────────
const GRAVITY    = 0.10;
const JUMP_VEL   = -4.0;
const PIPE_GAP   = 240;
const PIPE_W     = 65;
const PIPE_SPAWN = 160;
const INIT_SPD   = 1.5;
const SPD_INC    = 0.06;
const SPD_MAX    = 3.2;
const SPD_EVERY  = 20;

// ── States ───────────────────────────────────────────────────
// 0 = instructions page 1 (how to play)
// 1 = instructions page 2 (skin select + power-ups)
// 2 = playing
// 3 = dead (game over screen)
let STATE = 0;

// ── Game variables ───────────────────────────────────────────
let score, coins, combo, maxCombo, dist, frames;
let pipes, cArr, pArr, sparks, floats;
let pipeSpeed, theme, motivMsg;
let deadAt = 0;   // timestamp of death — used to block instant restart
let highScore = parseInt(localStorage.getItem("mba_hi") || "0");

function resetGameVars(){
  score=0; coins=0; combo=0; maxCombo=0; dist=0; frames=0;
  pipes=[]; cArr=[]; pArr=[]; sparks=[]; floats=[];
  pipeSpeed = INIT_SPD;
  theme = "day";
  motivMsg = "";
}
resetGameVars();

const MOTIV = [
  "Almost! One more run! 💪",
  "You're getting better every try! 🔥",
  "Legend never gives up! 🏆",
  "So close! Beat that record! 🚀",
  "Champion mode: ACTIVATED! 🌟",
  "The sky is NOT the limit! ✨",
  "Keep going — you've got this! 🎯"
];

// ── Sounds ───────────────────────────────────────────────────
function mkAudio(src, vol){
  const a = new Audio(); a.src = src; a.volume = vol; return a;
}
const SND = {
  flap : mkAudio("sounds/flap.wav",    0.6),
  hit  : mkAudio("sounds/hit.wav",     0.7),
  coin : mkAudio("sounds/coin.wav",    0.7),
  pu   : mkAudio("sounds/powerup.wav", 0.8),
  over : mkAudio("sounds/gameover.wav",0.6),
  bgm  : mkAudio("sounds/bgm.mp3",     0.35),
};
SND.bgm.loop = true;
function sfx(k){ try{ SND[k].currentTime=0; SND[k].play(); } catch(e){} }
function stopBgm(){ try{ SND.bgm.pause(); SND.bgm.currentTime=0; } catch(e){} }
function playBgm(){ try{ SND.bgm.play(); } catch(e){} }

// ── Ball skins  [hi, mid, deep, glow, name] ──────────────────
const SKINS = [
  ["#fff","#93c5fd","#1d4ed8","#60a5fa","Sapphire"],
  ["#fff","#f9a8d4","#be185d","#f472b6","Rose"],
  ["#fff","#6ee7b7","#065f46","#34d399","Emerald"],
  ["#fff","#fde68a","#b45309","#fbbf24","Gold"],
  ["#fff","#c4b5fd","#5b21b6","#a78bfa","Amethyst"],
  ["#fff","#fed7aa","#c2410c","#fb923c","Ember"],
];
let skinIdx = 0;

// ── Ball ─────────────────────────────────────────────────────
const ball = {
  x:0, y:0, r:22, vy:0, rot:0,
  trail:[], powerUp:null, puTimer:0,

  reset(){
    this.x = canvas.width * 0.22;
    this.y = canvas.height * 0.45;
    this.vy = 0; this.rot = 0;
    this.trail = []; this.powerUp = null; this.puTimer = 0;
  },

  glowCol(){
    if(this.powerUp==="shield") return "#34d399";
    if(this.powerUp==="magnet") return "#fbbf24";
    if(this.powerUp==="slow")   return "#f472b6";
    return SKINS[skinIdx][3];
  },

  update(){
    this.vy  += GRAVITY;
    this.y   += this.vy;
    this.rot += 0.06;
    if(frames % 2 === 0){
      this.trail.push({
        x: this.x - 6,
        y: this.y + (Math.random()-0.5)*8,
        s: Math.random()*8+3, life:20, col:this.glowCol()
      });
    }
    for(let i=this.trail.length-1; i>=0; i--){
      this.trail[i].life--;
      this.trail[i].s *= 0.93;
      if(this.trail[i].life <= 0) this.trail.splice(i,1);
    }
    if(this.powerUp && --this.puTimer <= 0) this.powerUp = null;
  },

  draw(){
    const [hi,mid,deep,glow] = SKINS[skinIdx];
    // trail
    for(const p of this.trail){
      ctx.globalAlpha = (p.life/20)*0.6;
      ctx.fillStyle   = p.col;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save(); ctx.translate(this.x, this.y);

    // power-up ring
    if(this.powerUp){
      const rc = this.glowCol();
      ctx.globalAlpha = 0.4 + Math.sin(frames*0.18)*0.3;
      ctx.strokeStyle = rc; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0,0,this.r*1.9,0,Math.PI*2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // outer glow
    const og = ctx.createRadialGradient(0,0,0,0,0,this.r*2.4);
    og.addColorStop(0, glow+"99"); og.addColorStop(1, glow+"00");
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(0,0,this.r*2.4,0,Math.PI*2); ctx.fill();

    ctx.rotate(this.rot);

    // sphere gradient
    const sg = ctx.createRadialGradient(-7,-7,1,0,0,this.r);
    if(this.powerUp==="shield"){
      sg.addColorStop(0,"#fff"); sg.addColorStop(0.4,"#6ee7b7"); sg.addColorStop(1,"#065f46");
    } else if(this.powerUp==="magnet"){
      sg.addColorStop(0,"#fff"); sg.addColorStop(0.4,"#fde68a"); sg.addColorStop(1,"#b45309");
    } else if(this.powerUp==="slow"){
      sg.addColorStop(0,"#fff"); sg.addColorStop(0.4,"#f9a8d4"); sg.addColorStop(1,"#9d174d");
    } else {
      sg.addColorStop(0,hi); sg.addColorStop(0.38,mid); sg.addColorStop(1,deep);
    }
    ctx.shadowColor = glow; ctx.shadowBlur = 16;
    ctx.fillStyle   = sg;
    ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
    ctx.shadowBlur  = 0;

    // shine
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath(); ctx.ellipse(-6,-6,7,5,Math.PI/4,0,Math.PI*2); ctx.fill();

    // inner ring
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0,0,this.r*0.62,0,Math.PI*2); ctx.stroke();

    ctx.restore();
  },

  flap(){
    this.vy = JUMP_VEL; sfx("flap");
    for(let i=0;i<7;i++) this.trail.push({
      x:this.x, y:this.y,
      s:Math.random()*6+3, life:16, col:this.glowCol()
    });
  },

  activatePU(type){ this.powerUp=type; this.puTimer=300; sfx("pu"); }
};

// ── Pipes ────────────────────────────────────────────────────
function addPipe(){
  const minT = 80;
  const maxT = canvas.height - PIPE_GAP - 80;
  const top  = Math.random()*(maxT-minT)+minT;
  pipes.push({ x: canvas.width+PIPE_W, top, bottom: top+PIPE_GAP, passed:false });
}

function drawPipe(p){
  const pg = ctx.createLinearGradient(p.x,0,p.x+PIPE_W,0);
  if(theme==="day"){
    pg.addColorStop(0,"#166534"); pg.addColorStop(0.45,"#22c55e"); pg.addColorStop(1,"#166534");
  } else {
    pg.addColorStop(0,"#3730a3"); pg.addColorStop(0.45,"#6366f1"); pg.addColorStop(1,"#3730a3");
  }
  ctx.fillStyle = pg;
  ctx.fillRect(p.x, 0, PIPE_W, p.top);
  ctx.fillRect(p.x, p.bottom, PIPE_W, canvas.height - p.bottom);

  const capC = theme==="day" ? "#16a34a" : "#4338ca";
  ctx.fillStyle = capC;
  ctx.beginPath(); ctx.roundRect(p.x-6, p.top-20,    PIPE_W+12, 20, [0,0,6,6]); ctx.fill();
  ctx.beginPath(); ctx.roundRect(p.x-6, p.bottom,    PIPE_W+12, 20, [6,6,0,0]); ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(p.x+10, 0, 10, p.top);
  ctx.fillRect(p.x+10, p.bottom, 10, canvas.height-p.bottom);
}

// ── Collectibles ─────────────────────────────────────────────
function addItems(){
  if(!pipes.length) return;
  const lp = pipes[pipes.length-1];
  const cy = (lp.top + lp.bottom) / 2;
  if(Math.random() < 0.65)
    cArr.push({ x: lp.x+PIPE_W/2+80, y: cy+(Math.random()-0.5)*PIPE_GAP*0.35 });
  if(Math.random() < 0.14){
    const t = ["shield","magnet","slow"][Math.floor(Math.random()*3)];
    pArr.push({ x: lp.x+PIPE_W/2+130, y: cy+(Math.random()-0.5)*PIPE_GAP*0.28, type:t });
  }
}

function drawCoin(c){
  const bounce = Math.sin(frames*0.18 + c.x*0.02)*5;
  ctx.save(); ctx.translate(c.x, c.y+bounce);
  const r = 13;
  const gl = ctx.createRadialGradient(0,0,0,0,0,r*1.8);
  gl.addColorStop(0,"rgba(251,191,36,.6)"); gl.addColorStop(1,"rgba(251,191,36,0)");
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0,0,r*1.8,0,Math.PI*2); ctx.fill();
  const g = ctx.createRadialGradient(-4,-4,0,0,0,r);
  g.addColorStop(0,"#fef9c3"); g.addColorStop(0.5,"#fbbf24"); g.addColorStop(1,"#92400e");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
  ctx.strokeStyle="#d97706"; ctx.lineWidth=1.5; ctx.stroke();
  ctx.fillStyle="#78350f"; ctx.font="bold 11px Arial";
  ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillText("✦",0,0);
  ctx.restore();
}

function drawPU(pu){
  const bounce = Math.sin(frames*0.13 + pu.x*0.02)*5;
  ctx.save(); ctx.translate(pu.x, pu.y+bounce); ctx.rotate(frames*0.035);
  const cfg = {
    shield:{c1:"#6ee7b7",c2:"#065f46",aura:"rgba(52,211,153,", icon:"🛡"},
    magnet:{c1:"#fde68a",c2:"#b45309",aura:"rgba(251,191,36,",  icon:"🧲"},
    slow:  {c1:"#f9a8d4",c2:"#9d174d",aura:"rgba(244,114,182,", icon:"⏱"},
  }[pu.type];
  const r = 16, pulse = Math.sin(frames*0.1)*0.3+0.7;
  const au = ctx.createRadialGradient(0,0,0,0,0,r*2);
  au.addColorStop(0, cfg.aura+(pulse*0.55)+")"); au.addColorStop(1, cfg.aura+"0)");
  ctx.fillStyle=au; ctx.beginPath(); ctx.arc(0,0,r*2,0,Math.PI*2); ctx.fill();
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=(Math.PI/3)*i-Math.PI/6;
    i===0 ? ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
  }
  ctx.closePath();
  const hg=ctx.createRadialGradient(-4,-4,0,0,0,r);
  hg.addColorStop(0,"#fff"); hg.addColorStop(0.5,cfg.c1); hg.addColorStop(1,cfg.c2);
  ctx.fillStyle=hg; ctx.shadowColor=cfg.c1; ctx.shadowBlur=10; ctx.fill(); ctx.shadowBlur=0;
  ctx.font="14px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle";
  ctx.fillText(cfg.icon,0,0);
  ctx.restore();
}

// ── Sparkles ─────────────────────────────────────────────────
function burst(x,y,col,n){
  for(let i=0;i<n;i++)
    sparks.push({x,y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,s:Math.random()*5+2,life:50,col});
}
function addFloat(x,y,txt,col){ floats.push({x,y,txt,col,life:55}); }

// ── Background ───────────────────────────────────────────────
let clouds=[], stars=[];
function makeBG(){
  clouds=[];
  for(let i=0;i<7;i++) clouds.push({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height*0.5,
    w:70+Math.random()*100, h:28+Math.random()*26,
    spd:0.2+Math.random()*0.35, a:0.5+Math.random()*0.35
  });
  stars=[];
  for(let i=0;i<90;i++) stars.push({
    x:Math.random()*canvas.width, y:Math.random()*canvas.height,
    r:Math.random()*2+0.3, b:0.3+Math.random()*0.7
  });
}
makeBG();

function drawBG(){
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  if(theme==="day"){
    g.addColorStop(0,"#0ea5e9"); g.addColorStop(0.65,"#38bdf8");
    g.addColorStop(0.9,"#7dd3fc"); g.addColorStop(1,"#86efac");
  } else {
    g.addColorStop(0,"#020617"); g.addColorStop(0.6,"#0f172a");
    g.addColorStop(0.9,"#1e1b4b"); g.addColorStop(1,"#312e81");
  }
  ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);

  if(theme==="night"){
    for(const s of stars){
      ctx.globalAlpha = s.b*(Math.sin(frames*0.04+s.x*0.1)*0.3+0.7);
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha=1;
  }

  for(const c of clouds){
    ctx.globalAlpha = c.a*(theme==="day"?1:0.1);
    ctx.fillStyle="#fff";
    ctx.beginPath(); ctx.ellipse(c.x,c.y,c.w,c.h,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x+c.w*0.5,c.y-c.h*0.35,c.w*0.65,c.h*0.68,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(c.x-c.w*0.45,c.y-c.h*0.2,c.w*0.55,c.h*0.6,0,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
    c.x -= c.spd; if(c.x+c.w*1.1<0) c.x=canvas.width+c.w;
  }

  const gnd=ctx.createLinearGradient(0,canvas.height-36,0,canvas.height);
  if(theme==="day"){ gnd.addColorStop(0,"#4ade80"); gnd.addColorStop(1,"#15803d"); }
  else             { gnd.addColorStop(0,"#1e1b4b"); gnd.addColorStop(1,"#0f172a"); }
  ctx.fillStyle=gnd; ctx.fillRect(0,canvas.height-36,canvas.width,36);
}

// ── HUD (during gameplay) ────────────────────────────────────
function drawHUD(){
  // score box
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(14,14,170,90,12); ctx.fill();
  ctx.strokeStyle="rgba(255,255,255,0.15)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(14,14,170,90,12); ctx.stroke();
  ctx.fillStyle="#fff"; ctx.font=F_MED; ctx.textAlign="left";
  ctx.fillText(score, 28, 56);
  ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font=F_TINY;
  ctx.fillText("SCORE", 28, 70);
  ctx.fillStyle="#fbbf24"; ctx.font=F_LABEL;
  ctx.fillText("✦ "+coins+" coins", 28, 92);

  // best score — just below score box
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(14,112,170,32,9); ctx.fill();
  ctx.strokeStyle="rgba(251,191,36,0.4)"; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.roundRect(14,112,170,32,9); ctx.stroke();
  ctx.fillStyle="#fbbf24"; ctx.font=F_LABEL; ctx.textAlign="left";
  ctx.fillText("★ BEST: "+highScore, 26, 133);

  // distance (top right)
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(canvas.width-108,14,94,32,9); ctx.fill();
  ctx.fillStyle="#7dd3fc"; ctx.font=F_LABEL; ctx.textAlign="center";
  ctx.fillText(Math.floor(dist)+"m", canvas.width-61, 35);

  // combo
  if(combo > 2){
    const col = combo>8 ? "#f87171" : "#4ade80";
    ctx.fillStyle="rgba(0,0,0,0.5)";
    ctx.beginPath(); ctx.roundRect(14,152,150,30,9); ctx.fill();
    ctx.strokeStyle=col+"55"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(14,152,150,30,9); ctx.stroke();
    ctx.fillStyle=col; ctx.font=F_LABEL; ctx.textAlign="left";
    ctx.fillText("⚡ x"+combo+" COMBO", 24, 172);
  }

  // power-up bar
  if(ball.powerUp){
    const bw=180, bx=canvas.width/2-bw/2;
    ctx.fillStyle="rgba(0,0,0,0.55)";
    ctx.beginPath(); ctx.roundRect(bx,14,bw,40,10); ctx.fill();
    const col  = {shield:"#34d399",magnet:"#fbbf24",slow:"#f472b6"}[ball.powerUp];
    const ico  = {shield:"🛡 SHIELD",magnet:"🧲 MAGNET",slow:"⏱ SLOW-MO"}[ball.powerUp];
    ctx.fillStyle=col; ctx.font=F_LABEL; ctx.textAlign="center";
    ctx.fillText(ico+"  "+Math.ceil(ball.puTimer/60)+"s", canvas.width/2, 34);
    ctx.fillStyle="rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.roundRect(bx+10,40,bw-20,5,3); ctx.fill();
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.roundRect(bx+10,40,Math.max(0,(ball.puTimer/300)*(bw-20)),5,3); ctx.fill();
  }

  // new high score ribbon
  if(score > 0 && score >= highScore){
    ctx.fillStyle="rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.roundRect(canvas.width/2-100,canvas.height-52,200,32,9); ctx.fill();
    ctx.fillStyle="#fbbf24"; ctx.font=F_LABEL; ctx.textAlign="center";
    ctx.fillText("★ NEW HIGH SCORE! ★", canvas.width/2, canvas.height-30);
  }

  ctx.fillStyle="rgba(255,255,255,0.25)"; ctx.font=F_TINY; ctx.textAlign="right";
  ctx.fillText("Developed by Sathwik Rai", canvas.width-12, canvas.height-10);
}

// ── Shared card drawing helpers ───────────────────────────────
function drawCard(X,Y,W,H,stripeC1,stripeC2,borderCol){
  // shadow
  ctx.fillStyle="rgba(0,0,0,0.5)";
  ctx.beginPath(); ctx.roundRect(X+6,Y+6,W,H,20); ctx.fill();
  // card body
  ctx.fillStyle="rgba(8,4,30,0.95)";
  ctx.beginPath(); ctx.roundRect(X,Y,W,H,18); ctx.fill();
  ctx.strokeStyle = borderCol||"rgba(139,92,246,0.6)";
  ctx.lineWidth=2; ctx.beginPath(); ctx.roundRect(X,Y,W,H,18); ctx.stroke();
  // neon top stripe
  const bar=ctx.createLinearGradient(X,Y,X+W,Y);
  bar.addColorStop(0,stripeC1||"#7c3aed");
  bar.addColorStop(0.5,stripeC2||"#db2777");
  bar.addColorStop(1,stripeC1||"#0ea5e9");
  ctx.fillStyle=bar;
  ctx.beginPath(); ctx.roundRect(X,Y,W,5,[18,18,0,0]); ctx.fill();
}

function pulseBtn(cx,y,w,h,label,c1,c2){
  const p  = 0.9+Math.sin(frames*0.08)*0.1;
  const bx = cx-w/2;
  ctx.save();
  ctx.translate(cx,y+h/2); ctx.scale(p,p); ctx.translate(-cx,-(y+h/2));
  const bg=ctx.createLinearGradient(bx,0,bx+w,0);
  bg.addColorStop(0,c1); bg.addColorStop(1,c2);
  ctx.shadowColor=c1; ctx.shadowBlur=14;
  ctx.fillStyle=bg; ctx.beginPath(); ctx.roundRect(bx,y,w,h,13); ctx.fill();
  ctx.shadowBlur=0;
  ctx.fillStyle="#fff"; ctx.font=F_SMALL; ctx.textAlign="center";
  ctx.fillText(label, cx, y+h*0.65);
  ctx.restore();
}

function drawDots(cx,y,cur){
  for(let i=0;i<2;i++){
    ctx.beginPath(); ctx.arc(cx+(i===0?-12:12),y,5,0,Math.PI*2);
    ctx.fillStyle = i===cur ? "#a78bfa" : "rgba(255,255,255,0.25)";
    ctx.fill();
  }
}

// ── SCREEN 0 — HOW TO PLAY ───────────────────────────────────
function drawHowToPlay(){
  drawBG();
  ctx.fillStyle="rgba(4,2,18,0.82)"; ctx.fillRect(0,0,canvas.width,canvas.height);

  const cx=canvas.width/2, cy=canvas.height/2;
  const W=Math.min(460,canvas.width-32);
  const H=Math.min(510,canvas.height-50);
  const X=cx-W/2, Y=cy-H/2;

  drawCard(X,Y,W,H,"#7c3aed","#db2777");

  // animated ball
  ball.x=cx; ball.y=Y+58+Math.sin(frames*0.05)*12; ball.rot=frames*0.03; ball.draw();

  // title
  const tg=ctx.createLinearGradient(cx-120,0,cx+120,0);
  tg.addColorStop(0,"#a78bfa"); tg.addColorStop(0.5,"#f472b6"); tg.addColorStop(1,"#38bdf8");
  ctx.fillStyle=tg; ctx.font=F_MED; ctx.textAlign="center";
  ctx.fillText("HOW TO PLAY", cx, Y+116);

  const steps=[
    ["👆","TAP / CLICK / SPACE","Make the ball fly upward"],
    ["🚀","DODGE THE PIPES",    "Pass through gaps to score points"],
    ["✦" ,"COLLECT COINS",      "Gold coins give bonus points"],
    ["🎯","GRAB POWER-UPS",     "Hexagon items appear inside the gaps"],
  ];
  let sy=Y+130;
  steps.forEach(([ic,title,desc])=>{
    ctx.fillStyle="rgba(255,255,255,0.06)";
    ctx.beginPath(); ctx.roundRect(X+12,sy,W-24,50,10); ctx.fill();
    ctx.strokeStyle="rgba(139,92,246,0.2)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(X+12,sy,W-24,50,10); ctx.stroke();
    ctx.font="20px Arial"; ctx.textAlign="left"; ctx.fillStyle="#fff";
    ctx.fillText(ic, X+22, sy+32);
    ctx.fillStyle="#e2e8f0"; ctx.font=F_LABEL;
    ctx.fillText(title, X+50, sy+22);
    ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font=F_TINY;
    ctx.fillText(desc, X+50, sy+40);
    sy+=57;
  });

  ctx.fillStyle="rgba(251,191,36,0.85)"; ctx.font=F_TINY; ctx.textAlign="center";
  ctx.fillText("🌙  Theme changes every 30 pipes!", cx, sy+10);
  if(highScore>0){
    ctx.fillStyle="#fbbf24"; ctx.font=F_LABEL;
    ctx.fillText("★  Best: "+highScore, cx, sy+30);
  }

  pulseBtn(cx, Y+H-58, 200, 44, "NEXT  →", "#7c3aed", "#a21caf");
  drawDots(cx, Y+H-10, 0);

  ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font=F_TINY; ctx.textAlign="center";
  ctx.fillText("Developed by Sathwik Rai", cx, canvas.height-10);
}

// ── SCREEN 1 — SKIN SELECT ───────────────────────────────────
const skinRects=[];

function drawSkinSelect(){
  drawBG();
  ctx.fillStyle="rgba(4,2,18,0.82)"; ctx.fillRect(0,0,canvas.width,canvas.height);

  const cx=canvas.width/2, cy=canvas.height/2;
  const W=Math.min(460,canvas.width-32);
  const H=Math.min(520,canvas.height-50);
  const X=cx-W/2, Y=cy-H/2;

  drawCard(X,Y,W,H,"#7c3aed","#db2777");

  ctx.fillStyle="#f8fafc"; ctx.font=F_MED; ctx.textAlign="center";
  ctx.fillText("CHOOSE YOUR BALL", cx, Y+44);

  // power-ups reminder
  const puList=[
    {ic:"🛡",label:"SHIELD",  col:"#34d399",desc:"Invincible — pipes can't hurt you"},
    {ic:"🧲",label:"MAGNET",  col:"#fbbf24",desc:"Pulls coins toward you automatically"},
    {ic:"⏱",label:"SLOW-MO", col:"#f472b6",desc:"Slows all pipes for 5 seconds"},
  ];
  let py=Y+58;
  puList.forEach(p=>{
    ctx.fillStyle="rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.roundRect(X+12,py,W-24,42,9); ctx.fill();
    ctx.strokeStyle=p.col+"44"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(X+12,py,W-24,42,9); ctx.stroke();
    ctx.fillStyle=p.col; ctx.font=F_LABEL; ctx.textAlign="left";
    ctx.fillText(p.ic+"  "+p.label, X+22, py+16);
    ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font=F_TINY;
    ctx.fillText(p.desc, X+22, py+33);
    py+=49;
  });

  py+=8;
  ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.font=F_TINY; ctx.textAlign="center";
  ctx.fillText("— TAP A BALL TO SELECT —", cx, py+6); py+=20;

  skinRects.length=0;
  const cols=3, skinW=Math.floor((W-28)/cols), skinH=80;
  SKINS.forEach((sk,idx)=>{
    const col=idx%cols, row=Math.floor(idx/cols);
    const sx=X+14+col*(skinW+2), sy2=py+row*(skinH+6);
    skinRects.push({x:sx,y:sy2,w:skinW,h:skinH,idx});
    const sel=idx===skinIdx;
    ctx.fillStyle=sel?"rgba(139,92,246,0.35)":"rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.roundRect(sx,sy2,skinW,skinH,11); ctx.fill();
    ctx.strokeStyle=sel?sk[3]:"rgba(255,255,255,0.12)"; ctx.lineWidth=sel?2:1;
    ctx.beginPath(); ctx.roundRect(sx,sy2,skinW,skinH,11); ctx.stroke();
    const bx=sx+skinW/2, by=sy2+skinH*0.44, br=14;
    const bg2=ctx.createRadialGradient(bx-br*0.3,by-br*0.3,0,bx,by,br);
    bg2.addColorStop(0,sk[0]); bg2.addColorStop(0.4,sk[1]); bg2.addColorStop(1,sk[2]);
    ctx.fillStyle=bg2;
    ctx.shadowColor=sk[3]; ctx.shadowBlur=sel?12:0;
    ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.75)";
    ctx.beginPath(); ctx.ellipse(bx-4,by-4,4,3,Math.PI/4,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=sel?"#fff":"rgba(255,255,255,0.5)";
    ctx.font=F_TINY; ctx.textAlign="center";
    ctx.fillText(sk[4], sx+skinW/2, sy2+skinH-6);
  });

  pulseBtn(cx, Y+H-58, 220, 44, "▶  LET'S PLAY!", "#0ea5e9", "#7c3aed");
  drawDots(cx, Y+H-10, 1);

  ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font=F_TINY; ctx.textAlign="center";
  ctx.fillText("Developed by Sathwik Rai", cx, canvas.height-10);
}

// ── SCREEN 3 — GAME OVER ─────────────────────────────────────
function drawGameOver(){
  // dark overlay over the frozen game
  ctx.fillStyle="rgba(0,0,0,0.75)";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const cx=canvas.width/2, cy=canvas.height/2;
  const W=Math.min(420,canvas.width-32);
  const H=Math.min(490,canvas.height-40);
  const X=cx-W/2, Y=cy-H/2;

  drawCard(X,Y,W,H,"#dc2626","#f97316","rgba(248,113,113,0.6)");

  // GAME OVER title
  const hg=ctx.createLinearGradient(cx-120,0,cx+120,0);
  hg.addColorStop(0,"#f87171"); hg.addColorStop(1,"#fbbf24");
  ctx.fillStyle=hg; ctx.font=F_BIG; ctx.textAlign="center";
  ctx.fillText("GAME OVER", cx, Y+62);

  // motivational message in its own highlighted box
  ctx.fillStyle="rgba(251,191,36,0.12)";
  ctx.beginPath(); ctx.roundRect(X+14,Y+70,W-28,40,9); ctx.fill();
  ctx.strokeStyle="rgba(251,191,36,0.4)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(X+14,Y+70,W-28,40,9); ctx.stroke();
  ctx.fillStyle="#fde68a";
  ctx.font="bold italic 15px Nunito,sans-serif";
  ctx.textAlign="center";
  ctx.fillText(motivMsg, cx, Y+95);

  // divider
  ctx.strokeStyle="rgba(248,113,113,0.25)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.moveTo(X+20,Y+118); ctx.lineTo(X+W-20,Y+118); ctx.stroke();

  // stats grid — 2 columns
  const stats=[
    ["FINAL SCORE", score,                 "#ffffff"],
    ["HIGH SCORE",  highScore,             "#fbbf24"],
    ["COINS",       coins,                 "#fbbf24"],
    ["MAX COMBO",   "×"+maxCombo,          "#4ade80"],
    ["DISTANCE",    Math.floor(dist)+"m",  "#7dd3fc"],
  ];
  const SW=Math.floor((W-32)/2), SH=56, SG=7;
  stats.forEach(([lbl,val,col],i)=>{
    const c=i%2, r=Math.floor(i/2);
    const sx=X+10+c*(SW+12), sy=Y+126+r*(SH+SG);
    ctx.fillStyle="rgba(255,255,255,0.07)";
    ctx.beginPath(); ctx.roundRect(sx,sy,SW,SH,9); ctx.fill();
    ctx.strokeStyle="rgba(255,255,255,0.12)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.roundRect(sx,sy,SW,SH,9); ctx.stroke();
    ctx.fillStyle=col; ctx.font=F_SMALL; ctx.textAlign="center";
    ctx.fillText(val, sx+SW/2, sy+SH*0.58);
    ctx.fillStyle="rgba(255,255,255,0.45)"; ctx.font=F_TINY;
    ctx.fillText(lbl, sx+SW/2, sy+SH*0.84);
  });

  // play again button + hint
  const canRestart = Date.now()-deadAt > 1500;
  pulseBtn(cx, Y+H-58, 210, 44, "↩  PLAY AGAIN", "#7c3aed", "#a21caf");
  ctx.fillStyle = canRestart ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.3)";
  ctx.font=F_TINY; ctx.textAlign="center";
  ctx.fillText(
    canRestart ? "Tap  /  Click  /  Space  to restart" : "Wait a moment...",
    cx, Y+H-8
  );

  ctx.fillStyle="rgba(255,255,255,0.2)"; ctx.font=F_TINY; ctx.textAlign="center";
  ctx.fillText("Developed by Sathwik Rai", cx, canvas.height-10);
}

// ── Game start ───────────────────────────────────────────────
function startGame(){
  resetGameVars();
  ball.reset();
  STATE = 2;
  playBgm();
}

// ── Game over trigger ────────────────────────────────────────
function triggerGameOver(){
  if(STATE === 3) return;
  STATE   = 3;
  deadAt  = Date.now();
  motivMsg = MOTIV[Math.floor(Math.random()*MOTIV.length)];
  if(score > highScore){
    highScore = score;
    localStorage.setItem("mba_hi", highScore);
  }
  stopBgm();
  sfx("hit");
  setTimeout(()=>sfx("over"), 400);
}

// ── Input ────────────────────────────────────────────────────
function onTap(px,py){
  if(STATE === 0){
    STATE = 1;
    return;
  }
  if(STATE === 1){
    // check skin grid taps
    for(const r of skinRects){
      if(px>=r.x && px<=r.x+r.w && py>=r.y && py<=r.y+r.h){
        skinIdx = r.idx;
        return;
      }
    }
    // anything else (including play button) → start
    startGame();
    return;
  }
  if(STATE === 2){
    ball.flap();
    return;
  }
  if(STATE === 3){
    // only restart after 1.5 s so player can read results
    if(Date.now() - deadAt > 1500){
      startGame();
    }
    return;
  }
}

canvas.addEventListener("click", e=>onTap(e.clientX, e.clientY));
canvas.addEventListener("touchstart", e=>{
  e.preventDefault();
  onTap(e.touches[0].clientX, e.touches[0].clientY);
},{ passive:false });
document.addEventListener("keydown", e=>{
  if(!["Space","ArrowUp","Enter"].includes(e.code)) return;
  e.preventDefault();
  if(STATE===0){ STATE=1; return; }
  if(STATE===1){ startGame(); return; }
  if(STATE===2){ ball.flap(); return; }
  if(STATE===3){ if(Date.now()-deadAt>1500) startGame(); return; }
});

// ── Main game loop ────────────────────────────────────────────
function loop(){
  ctx.save();

  // screen shake
  if(STATE===3 && Date.now()-deadAt<400){
    const s = (1-(Date.now()-deadAt)/400)*8;
    ctx.translate((Math.random()-0.5)*s, (Math.random()-0.5)*s);
  }

  // ── Instruction screens — just draw and loop ──
  if(STATE===0){ drawHowToPlay(); frames++; ctx.restore(); requestAnimationFrame(loop); return; }
  if(STATE===1){ drawSkinSelect(); frames++; ctx.restore(); requestAnimationFrame(loop); return; }

  // ── Both STATE 2 (playing) and STATE 3 (dead) share the same background ──
  drawBG();

  // sparkles
  for(let i=sparks.length-1;i>=0;i--){
    const s=sparks[i];
    s.x+=s.vx; s.y+=s.vy; s.life--; s.s*=0.93;
    ctx.globalAlpha=s.life/50; ctx.fillStyle=s.col;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.s,0,Math.PI*2); ctx.fill();
    if(s.life<=0) sparks.splice(i,1);
  }
  ctx.globalAlpha=1;

  // ── STATE 3: show frozen pipes + dead overlay ──
  if(STATE===3){
    // draw pipes frozen in place
    for(const p of pipes) drawPipe(p);
    for(const c of cArr) drawCoin(c);
    for(const pu of pArr) drawPU(pu);
    ball.draw();
    drawHUD();
    drawGameOver();   // <-- game over card drawn on top
    frames++; ctx.restore(); requestAnimationFrame(loop); return;
  }

  // ── STATE 2: playing ──────────────────────────────────────
  dist += pipeSpeed/60;
  if(frames % PIPE_SPAWN === 0){ addPipe(); addItems(); }

  const spd = ball.powerUp==="slow" ? pipeSpeed*0.5 : pipeSpeed;

  // pipes
  for(let i=pipes.length-1;i>=0;i--){
    const p=pipes[i]; p.x-=spd; drawPipe(p);
    // collision
    if(ball.powerUp !== "shield"){
      if( ball.x+ball.r > p.x && ball.x-ball.r < p.x+PIPE_W &&
         (ball.y-ball.r < p.top || ball.y+ball.r > p.bottom)){
        triggerGameOver();
        break;   // stop pipe loop — game over triggered
      }
    }
    if(!p.passed && p.x+PIPE_W < ball.x){
      p.passed=true; score++; combo++;
      maxCombo = Math.max(maxCombo, combo);
      addFloat(ball.x+30, ball.y-28, "+1", "#fbbf24");
      if(score%30===0) theme = theme==="day"?"night":"day";
      if(score%SPD_EVERY===0) pipeSpeed = Math.min(pipeSpeed+SPD_INC, SPD_MAX);
    }
    if(p.x+PIPE_W < 0) pipes.splice(i,1);
  }

  // coins (only if still playing)
  if(STATE===2){
    for(let i=cArr.length-1;i>=0;i--){
      const c=cArr[i];
      if(ball.powerUp==="magnet"){
        const dx=ball.x-c.x, dy=ball.y-c.y;
        if(Math.sqrt(dx*dx+dy*dy)<160){ c.x+=dx*0.13; c.y+=dy*0.13; } else c.x-=spd;
      } else c.x-=spd;
      drawCoin(c);
      if(Math.hypot(ball.x-c.x,ball.y-c.y) < ball.r+13){
        coins++; combo++; maxCombo=Math.max(maxCombo,combo);
        sfx("coin"); burst(c.x,c.y,"#fbbf24",8);
        addFloat(c.x,c.y-20,"✦","#fbbf24");
        cArr.splice(i,1); continue;
      }
      if(c.x<-30) cArr.splice(i,1);
    }

    // power-ups
    for(let i=pArr.length-1;i>=0;i--){
      const pu=pArr[i]; pu.x-=spd; drawPU(pu);
      if(Math.hypot(ball.x-pu.x,ball.y-pu.y) < ball.r+16){
        ball.activatePU(pu.type);
        const col={shield:"#34d399",magnet:"#fbbf24",slow:"#f472b6"}[pu.type];
        burst(pu.x,pu.y,col,12); combo++; maxCombo=Math.max(maxCombo,combo);
        pArr.splice(i,1); continue;
      }
      if(pu.x<-30) pArr.splice(i,1);
    }
  }

  // ball physics + boundary check (only if still playing after pipe collision check)
  if(STATE===2){
    ball.update(); ball.draw();
    if(ball.powerUp!=="shield"){
      if(ball.y+ball.r > canvas.height-36) triggerGameOver();
    }
    if(ball.y-ball.r < 0){ ball.vy=Math.abs(ball.vy)*0.3; ball.y=ball.r+1; }
  }

  // score floats
  for(let i=floats.length-1;i>=0;i--){
    const f=floats[i]; f.y-=1.1; f.life--;
    ctx.globalAlpha=f.life/55; ctx.fillStyle=f.col;
    ctx.font=F_SMALL; ctx.textAlign="center"; ctx.fillText(f.txt,f.x,f.y);
    if(f.life<=0) floats.splice(i,1);
  }
  ctx.globalAlpha=1;

  drawHUD();
  frames++; ctx.restore();
  requestAnimationFrame(loop);
}

// ── Boot ─────────────────────────────────────────────────────
ball.reset();
loop();

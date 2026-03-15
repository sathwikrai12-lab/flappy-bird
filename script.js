// ============================================================
//  Magic Ball Adventure  ·  by Sathwik Rai
// ============================================================

// ── Canvas ──────────────────────────────────────────────────
const canvas = document.getElementById("gameCanvas");
const ctx    = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => { resizeCanvas(); initBgObjects(); });
resizeCanvas();

// ── Responsive scale helper ──────────────────────────────────
// Base design at 480px wide; everything scales from there.
function sc(n) { return n * (canvas.width / 480); }

// ── Difficulty (EASY) ───────────────────────────────────────
const GRAVITY         = 0.15;
const JUMP_VEL        = -4.6;
const PIPE_GAP        = () => Math.max(200, canvas.height * 0.30);  // 30 % of screen
const PIPE_W          = () => Math.max(55, sc(55));
const PIPE_SPAWN_INT  = 140;   // frames between pipes
const INIT_SPEED      = 1.8;
const SPEED_INC       = 0.10;
const SPEED_UP_EVERY  = 18;    // pipes before speed-up

// ── Game state ──────────────────────────────────────────────
const STATE = { INSTRUCTIONS: 0, MENU: 1, PLAYING: 2, DEAD: 3 };
let state         = STATE.INSTRUCTIONS;
let instrPage     = 0;          // 0 or 1 (two instruction pages)
let frames        = 0;
let score         = 0;
let coins         = 0;
let gameOver      = false;
let theme         = "day";
let combo         = 0;
let maxCombo      = 0;
let sparkles      = [];
let scoreFloats   = [];
let highScore     = parseInt(localStorage.getItem("mbaHigh") || "0");
let distTraveled  = 0;
let screenShake   = 0;
let pipeSpeed     = INIT_SPEED;
let motivMsg      = "";
let nightTransAlpha = 0;  // smooth day↔night crossfade

// Ball skin index (picked on menu, persists per session)
let selectedSkin  = 0;

const MOTIV = [
  "You're getting better! Try again! 🔥",
  "Almost! One more run! 💪",
  "The legend never gives up! 🏆",
  "Tap faster next time! ⚡",
  "So close! Beat your record! 🚀",
  "Champion mode: ON! 🌟",
];

// ── Sounds (graceful fail if files missing) ─────────────────
function mkAudio(src, vol = 1) {
  const a = new Audio(); a.src = src; a.volume = vol; return a;
}
const SFX = {
  flap:    mkAudio("sounds/flap.wav",    0.6),
  hit:     mkAudio("sounds/hit.wav",     0.7),
  coin:    mkAudio("sounds/coin.wav",    0.7),
  powerup: mkAudio("sounds/powerup.wav", 0.8),
  over:    mkAudio("sounds/gameover.wav",0.6),
  bgm:     mkAudio("sounds/bgm.mp3",     0.35),
};
SFX.bgm.loop = true;
function play(k) { try { SFX[k].currentTime = 0; SFX[k].play(); } catch(e){} }

// ── Ball skins ───────────────────────────────────────────────
// Each skin: [highlight, midColor, deepColor, trailColor, label]
const SKINS = [
  ["#ffffff","#93c5fd","#1d4ed8","#60a5fa","🔵 Sapphire"],
  ["#ffffff","#f9a8d4","#be185d","#f472b6","🩷 Rose"],
  ["#ffffff","#6ee7b7","#065f46","#34d399","🟢 Emerald"],
  ["#ffffff","#fde68a","#b45309","#fbbf24","🟡 Gold"],
  ["#ffffff","#c4b5fd","#5b21b6","#a78bfa","🟣 Amethyst"],
  ["#ffffff","#fed7aa","#c2410c","#fb923c","🟠 Ember"],
];

// ── The Ball ─────────────────────────────────────────────────
const ball = {
  x: 0, y: 0,
  radius: 0,
  velocity: 0,
  rotation: 0,
  trail: [],
  powerUp: null,
  powerUpTimer: 0,

  init() {
    this.radius   = Math.max(18, sc(18));
    this.x        = canvas.width  * 0.22;
    this.y        = canvas.height * 0.45;
    this.velocity = 0;
    this.rotation = 0;
    this.trail    = [];
    this.powerUp  = null;
    this.powerUpTimer = 0;
  },

  skin() { return SKINS[selectedSkin]; },
  trailColor() {
    if (this.powerUp === "shield") return "#34d399";
    if (this.powerUp === "magnet") return "#fbbf24";
    if (this.powerUp === "slow")   return "#f472b6";
    return this.skin()[3];
  },

  update() {
    this.velocity += GRAVITY;
    this.y        += this.velocity;
    this.rotation += 0.055;

    // trail
    if (frames % 2 === 0) {
      this.trail.push({
        x: this.x - this.radius * 0.3,
        y: this.y + (Math.random() - 0.5) * 8,
        size: Math.random() * this.radius * 0.45 + this.radius * 0.15,
        life: 20,
        color: this.trailColor(),
      });
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life--;
      this.trail[i].size *= 0.93;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }

    // power-up countdown
    if (this.powerUp && --this.powerUpTimer <= 0) this.powerUp = null;
  },

  draw() {
    const r = this.radius;
    const [hi, mid, deep, trail] = this.skin();

    // trail particles
    for (const p of this.trail) {
      ctx.globalAlpha = (p.life / 20) * 0.65;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);

    // power-up pulsing ring
    if (this.powerUp) {
      const ringC = this.powerUp === "shield" ? "#34d399"
                  : this.powerUp === "magnet" ? "#fbbf24" : "#f472b6";
      const alpha = 0.4 + Math.sin(frames * 0.18) * 0.3;
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = ringC;
      ctx.lineWidth = sc(3);
      ctx.beginPath(); ctx.arc(0, 0, r * 1.9, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // soft outer glow
    const og = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
    og.addColorStop(0, trail + "88");
    og.addColorStop(1, trail + "00");
    ctx.fillStyle = og;
    ctx.beginPath(); ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2); ctx.fill();

    ctx.rotate(this.rotation);

    // main gradient sphere
    const bg = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r);
    if (this.powerUp === "shield") {
      bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.45, "#6ee7b7"); bg.addColorStop(1, "#065f46");
    } else if (this.powerUp === "magnet") {
      bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.45, "#fde68a"); bg.addColorStop(1, "#b45309");
    } else if (this.powerUp === "slow") {
      bg.addColorStop(0, "#ffffff"); bg.addColorStop(0.45, "#f9a8d4"); bg.addColorStop(1, "#9d174d");
    } else {
      bg.addColorStop(0, hi); bg.addColorStop(0.38, mid); bg.addColorStop(1, deep);
    }
    ctx.shadowColor = trail; ctx.shadowBlur = sc(14);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // shine
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.28, r * 0.32, r * 0.22, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // inner facet ring
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
  },

  flap() {
    this.velocity = JUMP_VEL;
    play("flap");
    for (let i = 0; i < 7; i++) {
      this.trail.push({
        x: this.x, y: this.y,
        size: Math.random() * this.radius * 0.4 + this.radius * 0.15,
        life: 16, color: this.trailColor(),
      });
    }
  },

  activatePowerUp(type) {
    this.powerUp = type;
    this.powerUpTimer = 300;
    play("powerup");
  },
};

// ── Pipes ────────────────────────────────────────────────────
const pipes = [];
function addPipe() {
  const gap  = PIPE_GAP();
  const pw   = PIPE_W();
  const minT = canvas.height * 0.12;
  const maxT = canvas.height * 0.72 - gap;
  const top  = Math.random() * (maxT - minT) + minT;
  pipes.push({ x: canvas.width + pw, top, bottom: top + gap, passed: false, pw });
}

// ── Collectibles ─────────────────────────────────────────────
const coinsArr = [], puArr = [];

function addCollectibles() {
  if (!pipes.length) return;
  const lp  = pipes[pipes.length - 1];
  const cy  = (lp.top + lp.bottom) / 2;
  const gap = lp.bottom - lp.top;
  if (Math.random() < 0.7) {
    coinsArr.push({ x: lp.x + lp.pw / 2 + sc(70), y: cy + (Math.random() - 0.5) * gap * 0.35, hit: false });
  }
  if (Math.random() < 0.14) {
    const types = ["shield","magnet","slow"];
    puArr.push({ x: lp.x + lp.pw / 2 + sc(110), y: cy + (Math.random() - 0.5) * gap * 0.28, type: types[Math.floor(Math.random()*3)], hit: false });
  }
}

// ── Sparkles ─────────────────────────────────────────────────
function burst(x, y, color, n = 10) {
  for (let i = 0; i < n; i++) {
    sparkles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      size: Math.random() * sc(5) + sc(2),
      life: 50, color,
    });
  }
}

// ── Background objects ───────────────────────────────────────
let clouds = [], stars = [], bgMountains = [];
function initBgObjects() {
  clouds = [];
  for (let i = 0; i < 8; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.5,
      w: sc(55 + Math.random() * 90),
      h: sc(22 + Math.random() * 28),
      spd: 0.18 + Math.random() * 0.32,
      alpha: 0.55 + Math.random() * 0.35,
    });
  }
  stars = [];
  for (let i = 0; i < 110; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height * 0.85,
      r: Math.random() * sc(2) + sc(0.5),
      b: 0.3 + Math.random() * 0.7,
    });
  }
  bgMountains = [];
  for (let i = 0; i < 5; i++) {
    bgMountains.push({
      x: (canvas.width / 4) * i,
      w: canvas.width * 0.35,
      h: canvas.height * (0.18 + Math.random() * 0.14),
    });
  }
}
initBgObjects();

// Draw background
function drawBackground() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (theme === "day") {
    sky.addColorStop(0,   "#0ea5e9");
    sky.addColorStop(0.6, "#38bdf8");
    sky.addColorStop(0.9, "#7dd3fc");
    sky.addColorStop(1,   "#86efac");
  } else {
    sky.addColorStop(0,   "#020617");
    sky.addColorStop(0.55,"#0f172a");
    sky.addColorStop(0.85,"#1e1b4b");
    sky.addColorStop(1,   "#312e81");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // stars (night only, smooth fade)
  if (nightTransAlpha > 0) {
    for (const s of stars) {
      const tw = Math.sin(frames * 0.04 + s.x * 0.1) * 0.28 + 0.72;
      ctx.globalAlpha = s.b * tw * nightTransAlpha;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // mountains
  const mAlpha = theme === "day" ? 0.18 : 0.35;
  ctx.fillStyle = theme === "day" ? `rgba(14,165,233,${mAlpha})` : `rgba(99,102,241,${mAlpha})`;
  for (const m of bgMountains) {
    ctx.beginPath();
    ctx.moveTo(m.x, canvas.height * 0.78);
    ctx.lineTo(m.x + m.w / 2, canvas.height * 0.78 - m.h);
    ctx.lineTo(m.x + m.w, canvas.height * 0.78);
    ctx.closePath(); ctx.fill();
  }

  // clouds
  for (const c of clouds) {
    ctx.globalAlpha = c.alpha * (theme === "day" ? 1 : 0.12);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.w, c.h, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + c.w * 0.5, c.y - c.h * 0.35, c.w * 0.65, c.h * 0.68, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.45, c.y - c.h * 0.2, c.w * 0.55, c.h * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    c.x -= c.spd;
    if (c.x + c.w * 1.1 < 0) c.x = canvas.width + c.w;
  }

  // ground strip
  const gnd = ctx.createLinearGradient(0, canvas.height * 0.92, 0, canvas.height);
  if (theme === "day") {
    gnd.addColorStop(0, "#4ade80"); gnd.addColorStop(1, "#15803d");
  } else {
    gnd.addColorStop(0, "#1e1b4b"); gnd.addColorStop(1, "#0f172a");
  }
  ctx.fillStyle = gnd;
  ctx.fillRect(0, canvas.height * 0.92, canvas.width, canvas.height * 0.08);
}

// ── Draw pipe ────────────────────────────────────────────────
function drawPipe(p) {
  const pw = p.pw;
  const pg = ctx.createLinearGradient(p.x, 0, p.x + pw, 0);
  if (theme === "day") {
    pg.addColorStop(0, "#166534"); pg.addColorStop(0.45, "#22c55e"); pg.addColorStop(1, "#166534");
  } else {
    pg.addColorStop(0, "#3730a3"); pg.addColorStop(0.45, "#6366f1"); pg.addColorStop(1, "#3730a3");
  }
  const capX = p.x - pw * 0.1, capW = pw * 1.2, capH = sc(22), capR = sc(6);

  // top pipe
  ctx.fillStyle = pg;
  ctx.fillRect(p.x, 0, pw, p.top);
  // top cap
  ctx.fillStyle = theme === "day" ? "#16a34a" : "#4f46e5";
  roundedRect(capX, p.top - capH, capW, capH, [0, 0, capR, capR]);
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x + pw * 0.15, 0, pw * 0.18, p.top);

  // bottom pipe
  ctx.fillStyle = pg;
  ctx.fillRect(p.x, p.bottom, pw, canvas.height - p.bottom);
  // bottom cap
  ctx.fillStyle = theme === "day" ? "#16a34a" : "#4f46e5";
  roundedRect(capX, p.bottom, capW, capH, [capR, capR, 0, 0]);
  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(p.x + pw * 0.15, p.bottom, pw * 0.18, canvas.height - p.bottom);
}

function roundedRect(x, y, w, h, radii) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, radii); ctx.fill();
}

// ── Draw coin ────────────────────────────────────────────────
function drawCoin(c) {
  const bounce = Math.sin(frames * 0.18 + c.x * 0.02) * sc(4);
  ctx.save(); ctx.translate(c.x, c.y + bounce);
  const r = sc(13);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.8);
  glow.addColorStop(0, "rgba(251,191,36,0.6)"); glow.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, r * 1.8, 0, Math.PI * 2); ctx.fill();

  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
  g.addColorStop(0, "#fef9c3"); g.addColorStop(0.5, "#fbbf24"); g.addColorStop(1, "#92400e");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = sc(1.5); ctx.stroke();

  ctx.fillStyle = "#78350f"; ctx.font = `bold ${sc(11)}px Arial`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✦", 0, 0);
  ctx.restore();
}

// ── Draw power-up ────────────────────────────────────────────
function drawPowerUp(pu) {
  const bounce = Math.sin(frames * 0.13 + pu.x * 0.02) * sc(5);
  const pulse  = Math.sin(frames * 0.1) * 0.3 + 0.7;
  ctx.save(); ctx.translate(pu.x, pu.y + bounce); ctx.rotate(frames * 0.035);

  const cfg = {
    shield: { c1: "#6ee7b7", c2: "#065f46", aura: "rgba(52,211,153,", icon: "🛡" },
    magnet: { c1: "#fde68a", c2: "#b45309", aura: "rgba(251,191,36,",  icon: "🧲" },
    slow:   { c1: "#f9a8d4", c2: "#9d174d", aura: "rgba(244,114,182,", icon: "⏱" },
  }[pu.type] || { c1:"#fff", c2:"#888", aura:"rgba(255,255,255,", icon:"?" };

  const r = sc(16);
  const aura = ctx.createRadialGradient(0,0,0,0,0,r*2);
  aura.addColorStop(0, cfg.aura + (pulse * 0.55) + ")");
  aura.addColorStop(1, cfg.aura + "0)");
  ctx.fillStyle = aura; ctx.beginPath(); ctx.arc(0,0,r*2,0,Math.PI*2); ctx.fill();

  // hexagon
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI/3)*i - Math.PI/6;
    i===0 ? ctx.moveTo(Math.cos(a)*r, Math.sin(a)*r) : ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
  }
  ctx.closePath();
  const hg = ctx.createRadialGradient(-r*0.3,-r*0.3,0,0,0,r);
  hg.addColorStop(0,"#fff"); hg.addColorStop(0.5,cfg.c1); hg.addColorStop(1,cfg.c2);
  ctx.fillStyle = hg; ctx.shadowColor = cfg.c1; ctx.shadowBlur = sc(10);
  ctx.fill(); ctx.shadowBlur = 0;

  ctx.font = `${sc(14)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(cfg.icon, 0, 0);
  ctx.restore();
}

// ── HUD helpers ──────────────────────────────────────────────
function glass(x, y, w, h, r = sc(12), strokeColor = "rgba(255,255,255,0.18)") {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  ctx.fillStyle = "rgba(8,8,30,0.62)"; ctx.fill();
  ctx.strokeStyle = strokeColor; ctx.lineWidth = sc(1.5); ctx.stroke();
}

function drawHUD() {
  // Left: score / coins / dist
  const pw = sc(155), ph = sc(95), px = sc(14), py = sc(14);
  glass(px, py, pw, ph);

  ctx.textAlign = "left";
  ctx.fillStyle = "#f8fafc";
  ctx.font = `900 ${sc(28)}px 'Fredoka One', cursive`;
  ctx.fillText(score, px + sc(14), py + ph * 0.48);

  ctx.font = `700 ${sc(11)}px 'Nunito', sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("SCORE", px + sc(14), py + ph * 0.65);

  ctx.fillStyle = "#fbbf24";
  ctx.font = `700 ${sc(14)}px 'Nunito', sans-serif`;
  ctx.fillText(`✦ ${coins} coins`, px + sc(14), py + ph * 0.85);

  // Distance top right
  const dw = sc(100), dh = sc(34);
  glass(canvas.width - dw - sc(14), sc(14), dw, dh, sc(10));
  ctx.fillStyle = "#7dd3fc"; ctx.font = `700 ${sc(12)}px 'Nunito', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText(`${Math.floor(distTraveled)}m`, canvas.width - dw/2 - sc(14), sc(14) + dh*0.64);

  // Combo
  if (combo > 2) {
    const hue = combo > 8 ? "#f87171" : "#4ade80";
    glass(sc(14), py + ph + sc(8), sc(130), sc(34), sc(9), hue + "55");
    ctx.fillStyle = hue; ctx.font = `700 ${sc(14)}px 'Fredoka One', cursive`;
    ctx.textAlign = "left";
    ctx.fillText(`⚡ x${combo} COMBO`, sc(26), py + ph + sc(30));
  }

  // Power-up bar
  if (ball.powerUp) {
    const bpw = sc(170), bph = sc(44);
    const bpx = canvas.width / 2 - bpw / 2, bpy = sc(14);
    const colors = { shield:"#34d399", magnet:"#fbbf24", slow:"#f472b6" };
    const icons  = { shield:"🛡 SHIELD", magnet:"🧲 MAGNET", slow:"⏱ SLOW-MO" };
    glass(bpx, bpy, bpw, bph, sc(11));
    ctx.fillStyle = colors[ball.powerUp];
    ctx.font = `700 ${sc(13)}px 'Nunito', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(icons[ball.powerUp] + "  " + Math.ceil(ball.powerUpTimer/60) + "s", canvas.width/2, bpy + bph*0.52);
    // progress bar
    const maxT = 300, barW = (ball.powerUpTimer / maxT) * (bpw - sc(20));
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath(); ctx.roundRect(bpx + sc(10), bpy + bph - sc(10), bpw - sc(20), sc(6), sc(3)); ctx.fill();
    ctx.fillStyle = colors[ball.powerUp];
    ctx.beginPath(); ctx.roundRect(bpx + sc(10), bpy + bph - sc(10), Math.max(0, barW), sc(6), sc(3)); ctx.fill();
  }

  // New high score
  if (score > 0 && score >= highScore) {
    ctx.save();
    const pulse = 0.8 + Math.sin(frames * 0.1) * 0.2;
    const hsw = sc(210), hsh = sc(36), hsx = canvas.width/2 - hsw/2, hsy = canvas.height - sc(60);
    glass(hsx, hsy, hsw, hsh, sc(10), "rgba(251,191,36,0.6)");
    ctx.fillStyle = `rgba(251,191,36,${pulse})`;
    ctx.font = `700 ${sc(14)}px 'Fredoka One', cursive`;
    ctx.textAlign = "center";
    ctx.fillText("★  NEW HIGH SCORE!  ★", canvas.width/2, hsy + hsh*0.65);
    ctx.restore();
  }

  // Dev credit
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = `${sc(10)}px 'Nunito', sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText("Developed by Sathwik Rai", canvas.width - sc(12), canvas.height - sc(10));
  ctx.textAlign = "left";
}

// ── Score floats ─────────────────────────────────────────────
function spawnFloat(x, y, txt, color) {
  scoreFloats.push({ x, y, txt, color, life: 52 });
}
function drawFloats() {
  for (let i = scoreFloats.length - 1; i >= 0; i--) {
    const f = scoreFloats[i];
    f.y -= 1.1; f.life--;
    ctx.globalAlpha = f.life / 52;
    ctx.fillStyle = f.color;
    ctx.font = `800 ${sc(18)}px 'Fredoka One', cursive`;
    ctx.textAlign = "center";
    ctx.fillText(f.txt, f.x, f.y);
    if (f.life <= 0) scoreFloats.splice(i, 1);
  }
  ctx.globalAlpha = 1;
}

// ── Instructions ─────────────────────────────────────────────
// Page 0: How to play
// Page 1: Power-ups & Ball selector
function drawInstructions() {
  // animated bg
  drawBackground();

  // overlay
  ctx.fillStyle = "rgba(4,4,22,0.78)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const cw = Math.min(sc(420), canvas.width - sc(28));
  const ch = Math.min(sc(500), canvas.height - sc(60));
  const cardX = cx - cw/2, cardY = cy - ch/2;

  // card
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cw, ch, sc(22));
  const cardG = ctx.createLinearGradient(cardX, cardY, cardX+cw, cardY+ch);
  cardG.addColorStop(0, "rgba(15,10,45,0.96)"); cardG.addColorStop(1, "rgba(30,15,60,0.96)");
  ctx.fillStyle = cardG; ctx.fill();
  ctx.strokeStyle = "rgba(139,92,246,0.55)"; ctx.lineWidth = sc(2); ctx.stroke();

  // neon top bar
  const barG = ctx.createLinearGradient(cardX, cardY, cardX+cw, cardY);
  barG.addColorStop(0,"#7c3aed"); barG.addColorStop(0.5,"#db2777"); barG.addColorStop(1,"#0ea5e9");
  ctx.fillStyle = barG;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cw, sc(5), [sc(22),sc(22),0,0]); ctx.fill();

  if (instrPage === 0) {
    // ── PAGE 1: How to play ──
    // Floating logo ball
    ball.x = cx; ball.y = cardY + sc(50) + Math.sin(frames * 0.045) * sc(8);
    ball.rotation = frames * 0.03; ball.draw();

    // Title
    const tg = ctx.createLinearGradient(cx-sc(130),0, cx+sc(130),0);
    tg.addColorStop(0,"#a78bfa"); tg.addColorStop(0.5,"#f472b6"); tg.addColorStop(1,"#38bdf8");
    ctx.fillStyle = tg;
    ctx.font = `900 ${sc(28)}px 'Fredoka One', cursive`;
    ctx.textAlign = "center";
    ctx.fillText("HOW TO PLAY", cx, cardY + sc(105));

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = `600 ${sc(11)}px 'Nunito', sans-serif`;
    ctx.fillText("Magic Ball Adventure", cx, cardY + sc(120));

    // Step cards
    const steps = [
      { icon:"👆", title:"TAP / CLICK / SPACE", desc:"to make the ball fly up" },
      { icon:"🚀", title:"DODGE THE PIPES",     desc:"pass through the gaps to score" },
      { icon:"✦",  title:"COLLECT COINS",       desc:"for bonus points & combo multiplier" },
      { icon:"⚡",  title:"GRAB POWER-UPS",     desc:"they appear in the gaps — grab them!" },
    ];
    const stepH = sc(52), stepGap = sc(8);
    const stepW = cw - sc(30);
    const stepX = cardX + sc(15);
    let sy = cardY + sc(132);
    steps.forEach(s => {
      glass(stepX, sy, stepW, stepH, sc(10), "rgba(139,92,246,0.25)");
      ctx.font = `${sc(22)}px Arial`; ctx.textAlign = "left";
      ctx.fillText(s.icon, stepX + sc(12), sy + stepH*0.62);
      ctx.fillStyle = "#e2e8f0"; ctx.font = `700 ${sc(12)}px 'Nunito', sans-serif`;
      ctx.fillText(s.title, stepX + sc(44), sy + stepH*0.42);
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = `${sc(11)}px 'Nunito', sans-serif`;
      ctx.fillText(s.desc, stepX + sc(44), sy + stepH*0.72);
      sy += stepH + stepGap;
    });

    // theme toggle note
    sy += sc(2);
    ctx.fillStyle = "rgba(251,191,36,0.85)"; ctx.font = `600 ${sc(10.5)}px 'Nunito', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("🌙 Theme changes every 30 pipes — keep flying!", cx, sy + sc(10));

    // Page dots
    drawPageDots(cx, cardY + ch - sc(40), 2, 0);

    // Next button
    drawNeonButton(cx, cardY + ch - sc(14), sc(170), sc(42), "NEXT  →", "#7c3aed", "#a21caf");

  } else {
    // ── PAGE 2: Power-ups + Ball chooser ──
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = `900 ${sc(24)}px 'Fredoka One', cursive`;
    ctx.textAlign = "center";
    ctx.fillText("POWER-UPS & SKINS", cx, cardY + sc(38));

    // Power-up rows
    const puInfo = [
      { icon:"🛡", name:"SHIELD",      color:"#34d399", desc:"Invincible — pipes can't hurt you" },
      { icon:"🧲", name:"MAGNET",      color:"#fbbf24", desc:"Attracts nearby coins to you" },
      { icon:"⏱", name:"SLOW-MOTION", color:"#f472b6", desc:"Everything slows down for 5s" },
    ];
    let py2 = cardY + sc(52);
    puInfo.forEach(p => {
      glass(cardX + sc(12), py2, cw - sc(24), sc(48), sc(9), p.color + "44");
      ctx.fillStyle = p.color; ctx.font = `700 ${sc(13)}px 'Nunito', sans-serif`;
      ctx.textAlign = "left";
      ctx.fillText(`${p.icon}  ${p.name}`, cardX + sc(24), py2 + sc(22));
      ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = `${sc(11)}px 'Nunito', sans-serif`;
      ctx.fillText(p.desc, cardX + sc(24), py2 + sc(38));
      py2 += sc(54);
    });

    // Skin selector
    py2 += sc(4);
    ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.font = `700 ${sc(12)}px 'Nunito', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("— CHOOSE YOUR BALL SKIN —", cx, py2);
    py2 += sc(10);

    const skinCols = 3, skinW = (cw - sc(28)) / skinCols;
    SKINS.forEach((sk, idx) => {
      const col = idx % skinCols, row = Math.floor(idx / skinCols);
      const sx2 = cardX + sc(14) + col * skinW;
      const sy2 = py2 + row * sc(58);
      const selected = idx === selectedSkin;

      glass(sx2, sy2, skinW - sc(6), sc(52), sc(10),
        selected ? sk[3] + "cc" : "rgba(255,255,255,0.12)");

      // mini ball preview
      const bx = sx2 + skinW/2 - sc(3), by = sy2 + sc(20);
      const br = sc(11);
      const bg2 = ctx.createRadialGradient(bx - br*0.3, by - br*0.3, 0, bx, by, br);
      bg2.addColorStop(0, sk[0]); bg2.addColorStop(0.4, sk[1]); bg2.addColorStop(1, sk[2]);
      ctx.fillStyle = bg2; ctx.shadowColor = sk[3]; ctx.shadowBlur = selected ? sc(10) : 0;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;

      ctx.fillStyle = selected ? "#fff" : "rgba(255,255,255,0.55)";
      ctx.font = `600 ${sc(9)}px 'Nunito', sans-serif`; ctx.textAlign = "center";
      ctx.fillText(sk[4].split(" ")[1], sx2 + (skinW - sc(6))/2, sy2 + sc(46));

      // hit area recorded for click
    });

    drawPageDots(cx, cardY + ch - sc(40), 2, 1);
    drawNeonButton(cx, cardY + ch - sc(14), sc(190), sc(42), "▶  LET'S PLAY!", "#0ea5e9", "#0284c7");
  }

  // tap note at very bottom
  ctx.fillStyle = "rgba(255,255,255,0.25)"; ctx.font = `${sc(10)}px 'Nunito', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("Developed by Sathwik Rai", cx, canvas.height - sc(10));

  frames++;
}

function drawPageDots(cx, y, total, current) {
  for (let i = 0; i < total; i++) {
    ctx.beginPath();
    ctx.arc(cx + (i - (total-1)/2) * sc(18), y, sc(4), 0, Math.PI*2);
    ctx.fillStyle = i === current ? "#a78bfa" : "rgba(255,255,255,0.25)";
    ctx.fill();
  }
}

function drawNeonButton(cx, bottomY, w, h, label, c1, c2) {
  const bx = cx - w/2, by = bottomY - h;
  const pulse = 0.88 + Math.sin(frames * 0.08) * 0.12;
  ctx.save();
  ctx.translate(cx, by + h/2); ctx.scale(pulse, pulse); ctx.translate(-cx, -(by+h/2));
  const bg = ctx.createLinearGradient(bx, 0, bx+w, 0);
  bg.addColorStop(0, c1); bg.addColorStop(1, c2);
  ctx.beginPath(); ctx.roundRect(bx, by, w, h, sc(13));
  ctx.fillStyle = bg; ctx.shadowColor = c1; ctx.shadowBlur = sc(16);
  ctx.fill(); ctx.shadowBlur = 0;
  ctx.fillStyle = "#fff"; ctx.font = `700 ${sc(14)}px 'Fredoka One', cursive`;
  ctx.textAlign = "center"; ctx.fillText(label, cx, by + h*0.62);
  ctx.restore();
}

// ── Menu (skin + start) – now goes straight to playing ───────
// (Instructions already has skin selector; menu is skipped)

// ── GAME OVER screen ─────────────────────────────────────────
function showDeadScreen() {
  ctx.fillStyle = "rgba(0,0,8,0.82)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2, cy = canvas.height / 2;
  const cw = Math.min(sc(400), canvas.width - sc(28));
  const ch = Math.min(sc(440), canvas.height - sc(50));
  const cardX = cx - cw/2, cardY = cy - ch/2;

  ctx.beginPath(); ctx.roundRect(cardX, cardY, cw, ch, sc(22));
  const cg = ctx.createLinearGradient(cardX,cardY,cardX,cardY+ch);
  cg.addColorStop(0,"rgba(20,5,40,0.97)"); cg.addColorStop(1,"rgba(10,2,25,0.97)");
  ctx.fillStyle = cg; ctx.fill();
  ctx.strokeStyle = "rgba(248,113,113,0.5)"; ctx.lineWidth = sc(2); ctx.stroke();

  // Red top bar
  const rb = ctx.createLinearGradient(cardX,0,cardX+cw,0);
  rb.addColorStop(0,"#dc2626"); rb.addColorStop(0.5,"#f97316"); rb.addColorStop(1,"#dc2626");
  ctx.fillStyle = rb;
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cw, sc(5), [sc(22),sc(22),0,0]); ctx.fill();

  // Heading
  const hg = ctx.createLinearGradient(cx-sc(120),0,cx+sc(120),0);
  hg.addColorStop(0,"#f87171"); hg.addColorStop(1,"#fbbf24");
  ctx.fillStyle = hg;
  ctx.font = `900 ${Math.min(sc(44), canvas.width*0.085)}px 'Fredoka One', cursive`;
  ctx.textAlign = "center"; ctx.fillText("GAME OVER", cx, cardY + sc(62));

  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = `italic ${sc(12)}px 'Nunito', sans-serif`;
  ctx.fillText(motivMsg, cx, cardY + sc(84));

  // divider
  ctx.strokeStyle="rgba(248,113,113,0.22)"; ctx.lineWidth=sc(1);
  ctx.beginPath(); ctx.moveTo(cardX+sc(24),cardY+sc(96)); ctx.lineTo(cardX+cw-sc(24),cardY+sc(96)); ctx.stroke();

  // Stats 2-col
  const stats = [
    ["SCORE",     score,                    "#f8fafc"],
    ["BEST",      highScore,                "#fbbf24"],
    ["COINS",     coins,                    "#fbbf24"],
    ["MAX COMBO", `×${maxCombo}`,           "#4ade80"],
    ["DISTANCE",  `${Math.floor(distTraveled)}m`, "#7dd3fc"],
  ];
  const sw2 = (cw - sc(36)) / 2, sh = sc(58), sgap = sc(8);
  stats.forEach(([lbl, val, col], i) => {
    const c2 = i%2, r2 = Math.floor(i/2);
    const sx2 = cardX + sc(12) + c2*(sw2+sc(12));
    const sy2 = cardY + sc(106) + r2*(sh+sgap);
    glass(sx2, sy2, sw2, sh, sc(9));
    ctx.fillStyle = col;
    ctx.font = `900 ${sc(20)}px 'Fredoka One', cursive`;
    ctx.textAlign = "center"; ctx.fillText(val, sx2+sw2/2, sy2+sh*0.56);
    ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.font = `${sc(10)}px 'Nunito', sans-serif`;
    ctx.fillText(lbl, sx2+sw2/2, sy2+sh*0.83);
  });

  // PLAY AGAIN button
  const btnW = sc(200), btnH = sc(46), btnX = cx-btnW/2;
  const btnY = cardY + ch - btnH - sc(14);
  const btnG = ctx.createLinearGradient(btnX,0,btnX+btnW,0);
  btnG.addColorStop(0,"#7c3aed"); btnG.addColorStop(1,"#a21caf");
  ctx.beginPath(); ctx.roundRect(btnX,btnY,btnW,btnH,sc(13));
  ctx.fillStyle = btnG; ctx.shadowColor="#a78bfa"; ctx.shadowBlur=sc(14);
  ctx.fill(); ctx.shadowBlur=0;
  ctx.fillStyle="#fff"; ctx.font=`700 ${sc(15)}px 'Fredoka One', cursive`;
  ctx.textAlign="center"; ctx.fillText("↩  PLAY AGAIN", cx, btnY+btnH*0.63);

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.font = `${sc(10)}px 'Nunito', sans-serif`;
  ctx.fillText("Developed by Sathwik Rai", cx, canvas.height - sc(10));
}

// ── Main game loop ────────────────────────────────────────────
function loop() {
  // screen shake
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random()-0.5)*screenShake*2, (Math.random()-0.5)*screenShake*2);
    screenShake *= 0.7;
    if (screenShake < 0.4) screenShake = 0;
  }

  ctx.clearRect(-20,-20,canvas.width+40,canvas.height+40);

  // ── instructions state ──
  if (state === STATE.INSTRUCTIONS) {
    drawInstructions();
    ctx.restore();
    requestAnimationFrame(loop);
    return;
  }

  // ── background ──
  drawBackground();

  // smooth night transition
  if (theme === "night" && nightTransAlpha < 1) nightTransAlpha = Math.min(1, nightTransAlpha + 0.02);
  if (theme === "day"   && nightTransAlpha > 0) nightTransAlpha = Math.max(0, nightTransAlpha - 0.02);

  // ── sparkles ──
  for (let i = sparkles.length-1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.vx; s.y += s.vy; s.life--; s.size *= 0.93;
    ctx.globalAlpha = s.life/50;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.x,s.y,s.size,0,Math.PI*2); ctx.fill();
    if (s.life <= 0) sparkles.splice(i,1);
  }
  ctx.globalAlpha = 1;

  if (state === STATE.DEAD) {
    showDeadScreen();
    ctx.restore();
    return; // stop updating game, just show overlay
  }

  // ── PLAYING ──
  distTraveled += pipeSpeed / 60;

  if (frames % PIPE_SPAWN_INT === 0) { addPipe(); addCollectibles(); }

  const spd = ball.powerUp === "slow" ? pipeSpeed * 0.5 : pipeSpeed;

  // pipes
  for (let i = pipes.length-1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= spd;
    drawPipe(p);

    // collision
    if (!ball.powerUp || ball.powerUp !== "shield") {
      if (
        ball.x + ball.radius > p.x &&
        ball.x - ball.radius < p.x + p.pw &&
        (ball.y - ball.radius < p.top || ball.y + ball.radius > p.bottom)
      ) { handleGameOver(); ctx.restore(); return; }
    }

    // score
    if (!p.passed && p.x + p.pw < ball.x) {
      p.passed = true; score++; combo++;
      maxCombo = Math.max(maxCombo, combo);
      spawnFloat(ball.x + sc(30), ball.y - sc(25), "+1", "#fbbf24");
      if (score % 30 === 0) theme = theme === "day" ? "night" : "day";
      if (score % SPEED_UP_EVERY === 0) pipeSpeed = Math.min(pipeSpeed + SPEED_INC, 4.8);
    }
    if (p.x + p.pw < 0) pipes.splice(i,1);
  }

  // coins
  for (let i = coinsArr.length-1; i >= 0; i--) {
    const c = coinsArr[i];
    if (c.hit) continue;
    if (ball.powerUp === "magnet") {
      const dx = ball.x-c.x, dy = ball.y-c.y;
      if (Math.sqrt(dx*dx+dy*dy) < sc(180)) { c.x += dx*0.13; c.y += dy*0.13; }
      else c.x -= spd;
    } else { c.x -= spd; }
    drawCoin(c);
    const dx=ball.x-c.x, dy=ball.y-c.y;
    if (Math.sqrt(dx*dx+dy*dy) < ball.radius + sc(13)) {
      c.hit = true; coins++; combo++; maxCombo = Math.max(maxCombo,combo);
      play("coin"); burst(c.x,c.y,"#fbbf24",8);
      spawnFloat(c.x, c.y-sc(20), "+✦", "#fbbf24");
      coinsArr.splice(i,1); continue;
    }
    if (c.x < -sc(30)) coinsArr.splice(i,1);
  }

  // power-ups
  for (let i = puArr.length-1; i >= 0; i--) {
    const pu = puArr[i];
    if (pu.hit) continue;
    pu.x -= spd; drawPowerUp(pu);
    const dx=ball.x-pu.x, dy=ball.y-pu.y;
    if (Math.sqrt(dx*dx+dy*dy) < ball.radius + sc(16)) {
      pu.hit = true; ball.activatePowerUp(pu.type);
      const c2 = pu.type==="shield"?"#34d399":pu.type==="magnet"?"#fbbf24":"#f472b6";
      burst(pu.x,pu.y,c2,12);
      combo++; maxCombo = Math.max(maxCombo,combo);
      puArr.splice(i,1); continue;
    }
    if (pu.x < -sc(30)) puArr.splice(i,1);
  }

  // ball
  ball.update(); ball.draw();

  // boundaries
  if (!ball.powerUp || ball.powerUp !== "shield") {
    if (ball.y + ball.radius > canvas.height * 0.92) { handleGameOver(); ctx.restore(); return; }
  }
  if (ball.y - ball.radius < 0) { ball.velocity = Math.abs(ball.velocity)*0.3; ball.y = ball.radius; }

  drawFloats();
  drawHUD();

  frames++;
  ctx.restore();
  requestAnimationFrame(loop);
}

// ── Game over ────────────────────────────────────────────────
function handleGameOver() {
  if (state === STATE.DEAD) return;
  state = STATE.DEAD;
  screenShake = 14;
  motivMsg = MOTIV[Math.floor(Math.random()*MOTIV.length)];
  if (score > highScore) { highScore = score; localStorage.setItem("mbaHigh", highScore); }
  try { SFX.bgm.pause(); SFX.bgm.currentTime = 0; play("hit"); } catch(e){}
  setTimeout(() => play("over"), 400);
  showDeadScreen();
}

// ── Reset & start game ───────────────────────────────────────
function startGame() {
  // clear all arrays
  pipes.length = 0; coinsArr.length = 0; puArr.length = 0;
  sparkles.length = 0; scoreFloats.length = 0;
  score = 0; coins = 0; combo = 0; maxCombo = 0;
  distTraveled = 0; pipeSpeed = INIT_SPEED; theme = "day"; nightTransAlpha = 0;
  gameOver = false; state = STATE.PLAYING;
  ball.init();
  try { SFX.bgm.currentTime = 0; SFX.bgm.play(); } catch(e){}
}

// ── Input handler ─────────────────────────────────────────────
function handleTap(clientX, clientY) {
  if (state === STATE.INSTRUCTIONS) {
    // Check if tapping next/play button area or skin cards
    if (instrPage === 1) {
      // Check skin card taps
      const cx = canvas.width/2, cy2 = canvas.height/2;
      const cw = Math.min(sc(420), canvas.width - sc(28));
      const ch = Math.min(sc(500), canvas.height - sc(60));
      const cardX = cx - cw/2, cardY = cy2 - ch/2;

      const puH = sc(48) + sc(6); // 3 rows of pu
      let py2 = cardY + sc(52) + 3*puH + sc(24) + sc(10);
      const skinW = (cw - sc(28)) / 3;
      SKINS.forEach((_, idx) => {
        const col = idx % 3, row = Math.floor(idx / 3);
        const sx2 = cardX + sc(14) + col * skinW;
        const sy2 = py2 + row * sc(58);
        if (clientX >= sx2 && clientX <= sx2 + skinW - sc(6) &&
            clientY >= sy2 && clientY <= sy2 + sc(52)) {
          selectedSkin = idx;
        }
      });
    }
    // Always advance page / start on any tap (bottom area acts as button)
    const btnY = (canvas.height/2 + Math.min(sc(500),canvas.height-sc(60))/2) - sc(14) - sc(42);
    if (clientY >= btnY || clientY > canvas.height * 0.7) {
      if (instrPage === 0) { instrPage = 1; }
      else { startGame(); }
    }
    return;
  }

  if (state === STATE.DEAD) { instrPage = 0; state = STATE.INSTRUCTIONS; return; }
  if (state === STATE.PLAYING) { ball.flap(); }
}

canvas.addEventListener("click",      e => handleTap(e.clientX, e.clientY));
canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  handleTap(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: false });
document.addEventListener("keydown", e => {
  if (["Space","ArrowUp","Enter"].includes(e.code)) {
    e.preventDefault();
    if (state === STATE.INSTRUCTIONS) { if (instrPage===0) instrPage=1; else startGame(); return; }
    if (state === STATE.DEAD)    { instrPage=0; state=STATE.INSTRUCTIONS; return; }
    if (state === STATE.PLAYING) ball.flap();
  }
});

// ── Boot ──────────────────────────────────────────────────────
ball.init();
loop();

// ============================== 
// 🎮 Magic Ball Adventure by Sathwik Rai
// ==============================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ─── DIFFICULTY SETTINGS (EASIER) ───────────────────────────
const GRAVITY         = 0.18;   // was 0.25 — floatier
const PIPE_GAP        = 210;    // was 160 — wider gap
const PIPE_WIDTH      = 75;
const PIPE_SPAWN_RATE = 120;    // was 100 — more time between pipes
const INIT_PIPE_SPEED = 2.0;    // was 2.5 — slower start
const SPEED_INCREMENT = 0.12;   // was 0.2 — gentler ramp
const SPEED_UP_EVERY  = 15;     // was 10 — more forgiving ramp
const JUMP_VELOCITY   = -5.0;   // was -5.5 — softer jump

// ─── GAME STATE ───────────────────────────────────────────────
let frames = 0;
let score = 0;
let coins = 0;
let gameOver = false;
let gameStarted = false;
let theme = "day";
let combo = 0;
let maxCombo = 0;
let sparkles = [];
let highScore = parseInt(localStorage.getItem('flappyHighScore')) || 0;
let distanceTraveled = 0;
let currentMotivationalMessage = "";
let screenShake = 0;
let particles = [];
let pipeSpeed = INIT_PIPE_SPEED;

const motivationalMessages = [
  "Better luck next time, champ! 💪",
  "You gave it your best shot! Try again! 🔥",
  "The sky's the limit — fly again! ☁️",
  "Don't give up, legend! 🚀",
  "One more try and you'll beat your record! 💎",
  "You're getting better every try! ⭐",
  "The champion in you is waking up! 🏆",
];

// ─── SOUNDS ───────────────────────────────────────────────────
function tryLoadAudio(path) {
  const a = new Audio();
  a.src = path;
  return a;
}
const flapSound    = tryLoadAudio("sounds/flap.wav");
const hitSound     = tryLoadAudio("sounds/hit.wav");
const bgm          = tryLoadAudio("sounds/bgm.mp3");
const coinSound    = tryLoadAudio("sounds/coin.wav");
const powerUpSound = tryLoadAudio("sounds/powerup.wav");
const gameOverSound= tryLoadAudio("sounds/gameover.wav");
bgm.loop = true;
bgm.volume = 0.4;
hitSound.volume = 0.7;
gameOverSound.volume = 0.6;

// ─── BALL ─────────────────────────────────────────────────────
const ball = {
  x: 110,
  y: 300,
  radius: 20,
  velocity: 0,
  rotation: 0,
  glow: 0,
  trail: [],
  powerUp: null,
  powerUpTimer: 0,

  update() {
    this.velocity += GRAVITY;
    this.y += this.velocity;
    this.rotation += 0.06;
    this.glow = Math.sin(frames * 0.1) * 0.4 + 0.6;

    if (frames % 2 === 0) {
      this.trail.push({
        x: this.x - 5,
        y: this.y + (Math.random() - 0.5) * 10,
        size: Math.random() * 7 + 3,
        life: 22,
        color: this.getTrailColor(),
      });
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life--;
      this.trail[i].size *= 0.94;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }

    if (this.powerUp && this.powerUpTimer > 0) {
      this.powerUpTimer--;
      if (this.powerUpTimer === 0) this.powerUp = null;
    }
  },

  getTrailColor() {
    if (this.powerUp === "shield") return "#34d399";
    if (this.powerUp === "magnet") return "#fbbf24";
    if (this.powerUp === "speed")  return "#f87171";
    return theme === "day" ? "#60a5fa" : "#a78bfa";
  },

  draw() {
    // Trail
    for (const p of this.trail) {
      ctx.globalAlpha = (p.life / 22) * 0.7;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Power-up aura ring
    if (this.powerUp) {
      const ringAlpha = 0.5 + Math.sin(frames * 0.15) * 0.3;
      const ringColor = this.powerUp === "shield" ? "#34d399"
                      : this.powerUp === "magnet" ? "#fbbf24"
                      : "#f87171";
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 2.0, 0, Math.PI * 2);
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = ringAlpha;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Outer glow
    const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.4);
    const gc = this.getTrailColor();
    outerGlow.addColorStop(0, gc + "99");
    outerGlow.addColorStop(1, gc + "00");
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(this.rotation);

    // Main ball
    const ballGrad = ctx.createRadialGradient(-7, -7, 1, 0, 0, this.radius);
    if (this.powerUp === "shield") {
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.4, "#6ee7b7");
      ballGrad.addColorStop(1, "#059669");
    } else if (this.powerUp === "magnet") {
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.4, "#fde68a");
      ballGrad.addColorStop(1, "#d97706");
    } else if (this.powerUp === "speed") {
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.4, "#fca5a5");
      ballGrad.addColorStop(1, "#dc2626");
    } else if (theme === "day") {
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.3, "#93c5fd");
      ballGrad.addColorStop(1, "#1d4ed8");
    } else {
      ballGrad.addColorStop(0, "#ffffff");
      ballGrad.addColorStop(0.3, "#c4b5fd");
      ballGrad.addColorStop(1, "#7c3aed");
    }

    ctx.shadowColor = this.getTrailColor();
    ctx.shadowBlur = 18;
    ctx.fillStyle = ballGrad;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(-6, -6, 7, 5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Inner ring
    ctx.strokeStyle = "rgba(255,255,255,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.65, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  },

  flap() {
    this.velocity = JUMP_VELOCITY;
    try { flapSound.currentTime = 0; flapSound.play(); } catch(e){}
    for (let i = 0; i < 6; i++) {
      this.trail.push({
        x: this.x,
        y: this.y,
        size: Math.random() * 6 + 3,
        life: 18,
        color: this.getTrailColor(),
      });
    }
  },

  activatePowerUp(type) {
    this.powerUp = type;
    this.powerUpTimer = type === "speed" ? 200 : 320;
    try { powerUpSound.play(); } catch(e){}
  }
};

// ─── COINS & POWER-UPS ────────────────────────────────────────
const coinsArray   = [];
const powerUpsArray = [];

function createSparkle(x, y, color = "#FFD700") {
  for (let i = 0; i < 8; i++) {
    sparkles.push({
      x, y,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 6,
      speedY: (Math.random() - 0.5) * 6,
      life: 45,
      color,
    });
  }
}

function drawCoin(coin) {
  const bounce = Math.sin(frames * 0.18 + coin.x) * 5;
  const pulse = Math.sin(frames * 0.15) * 0.25 + 0.75;

  ctx.save();
  ctx.translate(coin.x, coin.y + bounce);

  // Glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 22);
  glow.addColorStop(0, `rgba(251,191,36,${pulse * 0.55})`);
  glow.addColorStop(1, "rgba(251,191,36,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(0, 0, 22, 0, Math.PI * 2); ctx.fill();

  // Body
  const g = ctx.createRadialGradient(-4, -4, 0, 0, 0, 13);
  g.addColorStop(0, "#fef3c7");
  g.addColorStop(0.5, "#fbbf24");
  g.addColorStop(1, "#b45309");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();

  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#92400e";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("✦", 0, 0);

  ctx.restore();
}

function drawPowerUp(pu) {
  const bounce = Math.sin(frames * 0.12 + pu.x) * 6;
  const pulse = Math.sin(frames * 0.1) * 0.4 + 0.6;

  ctx.save();
  ctx.translate(pu.x, pu.y + bounce);
  ctx.rotate(frames * 0.04);

  const colors = {
    shield: ["#6ee7b7", "#059669"],
    magnet: ["#fde68a", "#d97706"],
    speed:  ["#fca5a5", "#dc2626"],
  };
  const [light, dark] = colors[pu.type] || ["#fff", "#999"];

  // Aura
  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
  aura.addColorStop(0, light + Math.round(pulse * 0.6 * 255).toString(16).padStart(2,"0"));
  aura.addColorStop(1, light + "00");
  ctx.fillStyle = aura;
  ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.fill();

  // Hexagon body
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const r = 16;
    i === 0 ? ctx.moveTo(Math.cos(angle)*r, Math.sin(angle)*r)
            : ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-4, -4, 0, 0, 0, 16);
  g.addColorStop(0, "#fff"); g.addColorStop(0.5, light); g.addColorStop(1, dark);
  ctx.fillStyle = g;
  ctx.shadowColor = light; ctx.shadowBlur = 12;
  ctx.fill(); ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.font = "14px Arial";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(pu.type === "shield" ? "🛡" : pu.type === "magnet" ? "🧲" : "⚡", 0, 1);

  ctx.restore();
}

// ─── PIPES ────────────────────────────────────────────────────
const pipes = [];

function addPipe() {
  const minTop = 80;
  const maxTop = canvas.height - PIPE_GAP - 80;
  const topHeight = Math.random() * (maxTop - minTop) + minTop;
  pipes.push({ x: canvas.width + 10, top: topHeight, bottom: topHeight + PIPE_GAP, passed: false });
}

function addRandomCoin() {
  if (pipes.length === 0) return;
  const lp = pipes[pipes.length - 1];
  const cy = (lp.top + lp.bottom) / 2;

  if (Math.random() < 0.65) {
    coinsArray.push({ x: lp.x + PIPE_WIDTH / 2 + 80, y: cy + (Math.random() - 0.5) * (PIPE_GAP * 0.4), collected: false });
  }
  if (Math.random() < 0.12) {
    const types = ["shield", "magnet", "speed"];
    powerUpsArray.push({ x: lp.x + PIPE_WIDTH / 2 + 130, y: cy + (Math.random() - 0.5) * (PIPE_GAP * 0.3), type: types[Math.floor(Math.random() * 3)], collected: false });
  }
}

// ─── BACKGROUND ───────────────────────────────────────────────
const clouds = [];
const stars  = [];

for (let i = 0; i < 7; i++) {
  clouds.push({ x: Math.random() * 2000, y: Math.random() * (canvas.height * 0.55), w: 70 + Math.random() * 130, h: 35 + Math.random() * 40, speed: 0.25 + Math.random() * 0.5 });
}
for (let i = 0; i < 100; i++) {
  stars.push({ x: Math.random() * 2000, y: Math.random() * 800, size: Math.random() * 2.2 + 0.3, b: Math.random() });
}

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (theme === "day") {
    g.addColorStop(0, "#0ea5e9");
    g.addColorStop(0.55, "#38bdf8");
    g.addColorStop(0.85, "#7dd3fc");
    g.addColorStop(1, "#86efac");
  } else {
    g.addColorStop(0, "#0f172a");
    g.addColorStop(0.6, "#1e1b4b");
    g.addColorStop(1, "#312e81");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (theme === "night") {
    for (const s of stars) {
      const tw = Math.sin(frames * 0.04 + s.x) * 0.35 + 0.65;
      ctx.globalAlpha = s.b * tw;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s.x % canvas.width, s.y % canvas.height, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Clouds
  ctx.fillStyle = theme === "day" ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.08)";
  for (const c of clouds) {
    ctx.beginPath();
    ctx.ellipse(c.x % canvas.width, c.y, c.w, c.h, 0, 0, Math.PI * 2);
    ctx.fill();
    // second puff
    ctx.beginPath();
    ctx.ellipse((c.x + c.w * 0.55) % canvas.width, c.y - c.h * 0.3, c.w * 0.7, c.h * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    c.x -= c.speed;
    if (c.x + c.w < 0) c.x = canvas.width + c.w;
  }

  // Ground strip
  const gr = ctx.createLinearGradient(0, canvas.height - 40, 0, canvas.height);
  gr.addColorStop(0, theme === "day" ? "#4ade80" : "#1e1b4b");
  gr.addColorStop(1, theme === "day" ? "#16a34a" : "#0f172a");
  ctx.fillStyle = gr;
  ctx.fillRect(0, canvas.height - 40, canvas.width, 40);
}

// ─── HUD HELPERS ──────────────────────────────────────────────
function glassBox(x, y, w, h, radius = 14) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = "rgba(15,15,40,0.55)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawHUD() {
  // Left stats panel
  const panelW = 190, panelH = 120;
  glassBox(16, 16, panelW, panelH);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 28px 'Orbitron', sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(score, 34, 55);

  ctx.font = "12px 'Rajdhani', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText("SCORE", 34, 68);

  ctx.fillStyle = "#fbbf24";
  ctx.font = "bold 20px 'Orbitron', sans-serif";
  ctx.fillText(`✦ ${coins}`, 34, 96);

  ctx.font = "11px 'Rajdhani', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText(`${Math.floor(distanceTraveled)}m`, 130, 96);

  // Combo badge
  if (combo > 2) {
    const cx = 16, cy = 148;
    glassBox(cx, cy, 130, 36, 10);
    const hue = combo > 8 ? "#f87171" : "#4ade80";
    ctx.fillStyle = hue;
    ctx.font = `bold 18px 'Orbitron', sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText(`×${combo} COMBO`, cx + 12, cy + 24);
  }

  // Power-up bar (top right)
  if (ball.powerUp) {
    const pw = 180, ph = 42;
    const px = canvas.width - pw - 16;
    glassBox(px, 16, pw, ph, 12);

    const colors = { shield: "#34d399", magnet: "#fbbf24", speed: "#f87171" };
    const icons  = { shield: "🛡", magnet: "🧲", speed: "⚡" };
    ctx.fillStyle = colors[ball.powerUp];
    ctx.font = "bold 14px 'Orbitron', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${icons[ball.powerUp]} ${ball.powerUp.toUpperCase()}  ${Math.ceil(ball.powerUpTimer/60)}s`, px + pw - 12, 44);

    // Progress bar
    const maxTime = ball.powerUp === "speed" ? 200 : 320;
    const barW = (ball.powerUpTimer / maxTime) * (pw - 24);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath(); ctx.roundRect(px + 12, 48, pw - 24, 5, 3); ctx.fill();
    ctx.fillStyle = colors[ball.powerUp];
    ctx.beginPath(); ctx.roundRect(px + 12, 48, barW, 5, 3); ctx.fill();
  }

  // New high score
  if (score > 0 && score > highScore) {
    const tw = 220, th = 38;
    const tx = canvas.width / 2 - tw / 2;
    glassBox(tx, 16, tw, th, 10);
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 16px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("★ NEW HIGH SCORE ★", canvas.width / 2, 41);
  }

  // Dev credit
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "12px 'Rajdhani', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Developed by Sathwik Rai", canvas.width - 16, canvas.height - 50);
  ctx.textAlign = "left";
}

// ─── DRAW PIPES ───────────────────────────────────────────────
function drawPipes(currentSpeed) {
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= currentSpeed;

    const pg = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
    if (theme === "day") {
      pg.addColorStop(0, "#166534"); pg.addColorStop(0.45, "#16a34a"); pg.addColorStop(1, "#166534");
    } else {
      pg.addColorStop(0, "#3730a3"); pg.addColorStop(0.45, "#4f46e5"); pg.addColorStop(1, "#3730a3");
    }
    ctx.fillStyle = pg;
    ctx.fillRect(p.x, 0, PIPE_WIDTH, p.top);
    ctx.fillRect(p.x, p.bottom, PIPE_WIDTH, canvas.height - p.bottom);

    // Pipe cap
    const capColor = theme === "day" ? "#15803d" : "#4338ca";
    ctx.fillStyle = capColor;
    const capH = 22, capExtra = 8;
    ctx.beginPath();
    ctx.roundRect(p.x - capExtra, p.top - capH, PIPE_WIDTH + capExtra * 2, capH, [0, 0, 6, 6]);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(p.x - capExtra, p.bottom, PIPE_WIDTH + capExtra * 2, capH, [6, 6, 0, 0]);
    ctx.fill();

    // Highlight stripe
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect(p.x + 10, 0, 8, p.top);
    ctx.fillRect(p.x + 10, p.bottom, 8, canvas.height - p.bottom);

    // Collision
    if (!ball.powerUp || ball.powerUp !== "shield") {
      if (
        ball.x + ball.radius > p.x &&
        ball.x - ball.radius < p.x + PIPE_WIDTH &&
        (ball.y - ball.radius < p.top || ball.y + ball.radius > p.bottom)
      ) {
        handleGameOver(); return;
      }
    }

    // Score
    if (!p.passed && p.x + PIPE_WIDTH < ball.x) {
      score++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      p.passed = true;
      spawnScoreFloat(ball.x, ball.y - 30);
      if (score % 30 === 0) theme = theme === "day" ? "night" : "day";
      if (score % SPEED_UP_EVERY === 0) pipeSpeed += SPEED_INCREMENT;
    }

    if (p.x + PIPE_WIDTH < 0) pipes.splice(i, 1);
  }
}

// Floating score text
const scoreFloats = [];
function spawnScoreFloat(x, y) {
  scoreFloats.push({ x, y, life: 50, text: `+1` });
}

function updateScoreFloats() {
  for (let i = scoreFloats.length - 1; i >= 0; i--) {
    const sf = scoreFloats[i];
    sf.y -= 1.2;
    sf.life--;
    ctx.globalAlpha = sf.life / 50;
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 22px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(sf.text, sf.x, sf.y);
    if (sf.life <= 0) scoreFloats.splice(i, 1);
  }
  ctx.globalAlpha = 1;
}

// ─── GAME LOOP ────────────────────────────────────────────────
function loop() {
  // Screen shake
  ctx.save();
  if (screenShake > 0) {
    ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
    screenShake *= 0.75;
    if (screenShake < 0.5) screenShake = 0;
  }

  ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);
  drawBackground();

  // Sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.speedX; s.y += s.speedY; s.life--; s.size *= 0.94;
    ctx.globalAlpha = s.life / 45;
    ctx.fillStyle = s.color;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2); ctx.fill();
    if (s.life <= 0) sparkles.splice(i, 1);
  }
  ctx.globalAlpha = 1;

  // ── MENU SCREEN ──────────────────────────────────────────────
  if (!gameStarted) {
    drawMenuScreen();
    frames++;
    ctx.restore();
    requestAnimationFrame(loop);
    return;
  }

  distanceTraveled += pipeSpeed / 60;

  if (frames % PIPE_SPAWN_RATE === 0) { addPipe(); addRandomCoin(); }

  const currentSpeed = ball.powerUp === "speed" ? pipeSpeed * 0.55 : pipeSpeed;

  drawPipes(currentSpeed);

  // Coins
  for (let i = coinsArray.length - 1; i >= 0; i--) {
    const coin = coinsArray[i];
    if (coin.collected) continue;
    if (ball.powerUp === "magnet") {
      const dx = ball.x - coin.x, dy = ball.y - coin.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 200) { coin.x += dx * 0.14; coin.y += dy * 0.14; }
      else coin.x -= currentSpeed;
    } else {
      coin.x -= currentSpeed;
    }
    drawCoin(coin);
    const dx = ball.x - coin.x, dy = ball.y - coin.y;
    if (Math.sqrt(dx*dx + dy*dy) < ball.radius + 13) {
      coin.collected = true; coins++; combo++;
      maxCombo = Math.max(maxCombo, combo);
      try { coinSound.currentTime = 0; coinSound.play(); } catch(e){}
      createSparkle(coin.x, coin.y, "#fbbf24");
      coinsArray.splice(i, 1); continue;
    }
    if (coin.x + 20 < 0) coinsArray.splice(i, 1);
  }

  // Power-ups
  for (let i = powerUpsArray.length - 1; i >= 0; i--) {
    const pu = powerUpsArray[i];
    if (pu.collected) continue;
    pu.x -= currentSpeed;
    drawPowerUp(pu);
    const dx = ball.x - pu.x, dy = ball.y - pu.y;
    if (Math.sqrt(dx*dx + dy*dy) < ball.radius + 16) {
      pu.collected = true;
      ball.activatePowerUp(pu.type);
      const c = pu.type === "shield" ? "#34d399" : pu.type === "magnet" ? "#fbbf24" : "#f87171";
      createSparkle(pu.x, pu.y, c);
      combo++; maxCombo = Math.max(maxCombo, combo);
      powerUpsArray.splice(i, 1); continue;
    }
    if (pu.x + 20 < 0) powerUpsArray.splice(i, 1);
  }

  ball.update();
  ball.draw();

  // Ground collision
  if (!ball.powerUp || ball.powerUp !== "shield") {
    if (ball.y + ball.radius > canvas.height - 40) { handleGameOver(); return; }
    if (ball.y - ball.radius < 0) { ball.velocity = 1; ball.y = ball.radius + 1; }
  }

  updateScoreFloats();
  drawHUD();

  frames++;
  ctx.restore();
  if (!gameOver) requestAnimationFrame(loop);
}

// ─── MENU SCREEN ──────────────────────────────────────────────
function drawMenuScreen() {
  // Dim overlay
  ctx.fillStyle = "rgba(5,5,20,0.72)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Title card
  const cardW = Math.min(520, canvas.width - 40);
  const cardH = 380;
  const cardX = cx - cardW / 2;
  const cardY = cy - cardH / 2 - 20;

  // Card glass
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "rgba(15,15,50,0.75)";
  ctx.fill();
  ctx.strokeStyle = "rgba(167,139,250,0.4)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Animated title
  const titleGrad = ctx.createLinearGradient(cardX, 0, cardX + cardW, 0);
  titleGrad.addColorStop(0, "#60a5fa");
  titleGrad.addColorStop(0.5, "#e879f9");
  titleGrad.addColorStop(1, "#fbbf24");
  ctx.fillStyle = titleGrad;
  ctx.font = `bold ${Math.min(42, canvas.width * 0.06)}px 'Orbitron', sans-serif`;
  ctx.textAlign = "center";
  ctx.fillText("MAGIC BALL", cx, cardY + 62);
  ctx.font = `bold ${Math.min(28, canvas.width * 0.04)}px 'Orbitron', sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("ADVENTURE", cx, cardY + 96);

  // Divider
  ctx.strokeStyle = "rgba(167,139,250,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cardX + 30, cardY + 112); ctx.lineTo(cardX + cardW - 30, cardY + 112); ctx.stroke();

  // Power-up legend
  const items = [["🛡", "SHIELD", "#34d399", "Invincibility"], ["🧲", "MAGNET", "#fbbf24", "Attract coins"], ["⚡", "SPEED", "#f87171", "Slow motion"]];
  items.forEach(([icon, label, color, desc], idx) => {
    const iy = cardY + 140 + idx * 52;
    const ix = cx - 150;
    glassBox(ix, iy, 300, 40, 10);
    ctx.fillStyle = color;
    ctx.font = "bold 15px 'Orbitron', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`${icon}  ${label}`, ix + 16, iy + 26);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "13px 'Rajdhani', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(desc, ix + 284, iy + 26);
  });

  // High score
  if (highScore > 0) {
    ctx.fillStyle = "#fbbf24";
    ctx.font = "bold 17px 'Orbitron', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`★  BEST: ${highScore}`, cx, cardY + 320);
  }

  // Pulsing start button
  const btnPulse = Math.sin(frames * 0.07) * 0.12 + 0.88;
  const btnW = 230, btnH = 52;
  const btnX = cx - btnW / 2, btnY = cardY + cardH + 18;
  ctx.save();
  ctx.translate(cx, btnY + btnH / 2);
  ctx.scale(btnPulse, btnPulse);
  ctx.translate(-cx, -(btnY + btnH / 2));

  const btnGrad = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0);
  btnGrad.addColorStop(0, "#7c3aed"); btnGrad.addColorStop(1, "#a21caf");
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 14);
  ctx.fillStyle = btnGrad;
  ctx.shadowColor = "#a78bfa"; ctx.shadowBlur = 18;
  ctx.fill(); ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px 'Orbitron', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("▶  PLAY NOW", cx, btnY + 33);
  ctx.restore();

  // Animated demo ball
  ball.x = cx;
  ball.y = cardY - 50 + Math.sin(frames * 0.04) * 18;
  ball.rotation = frames * 0.025;
  ball.draw();

  // Dev credit
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "12px 'Rajdhani', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Developed by Sathwik Rai", cx, canvas.height - 22);
}

// ─── GAME OVER ────────────────────────────────────────────────
function handleGameOver() {
  if (gameOver) return;
  gameOver = true;
  screenShake = 12;
  currentMotivationalMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  if (score > highScore) { highScore = score; localStorage.setItem('flappyHighScore', highScore); }
  try { bgm.pause(); bgm.currentTime = 0; hitSound.play(); } catch(e){}
  setTimeout(() => { try { gameOverSound.play(); } catch(e){} }, 400);
  showGameOverScreen();
}

function showGameOverScreen() {
  // Dim background (keep drawing)
  ctx.fillStyle = "rgba(0,0,0,0.80)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const cardW = Math.min(500, canvas.width - 40);
  const cardH = 420;
  const cardX = cx - cardW / 2;
  const cardY = cy - cardH / 2;

  // Card
  ctx.beginPath(); ctx.roundRect(cardX, cardY, cardW, cardH, 24);
  ctx.fillStyle = "rgba(12,10,35,0.92)"; ctx.fill();
  ctx.strokeStyle = "rgba(248,113,113,0.45)"; ctx.lineWidth = 2; ctx.stroke();

  // "GAME OVER" heading
  ctx.font = `bold ${Math.min(52, canvas.width * 0.07)}px 'Orbitron', sans-serif`;
  ctx.textAlign = "center";
  const goGrad = ctx.createLinearGradient(cx - 150, 0, cx + 150, 0);
  goGrad.addColorStop(0, "#f87171"); goGrad.addColorStop(1, "#fbbf24");
  ctx.fillStyle = goGrad;
  ctx.fillText("GAME OVER", cx, cardY + 65);

  // Motivational
  ctx.font = `italic 16px 'Rajdhani', sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.fillText(currentMotivationalMessage, cx, cardY + 98);

  // Divider
  ctx.strokeStyle = "rgba(248,113,113,0.25)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(cardX + 30, cardY + 116); ctx.lineTo(cardX + cardW - 30, cardY + 116); ctx.stroke();

  // Stats grid
  const stats = [
    ["SCORE", score, "#f8fafc"],
    ["HIGH SCORE", highScore, "#fbbf24"],
    ["COINS", coins, "#fbbf24"],
    ["MAX COMBO", `×${maxCombo}`, "#4ade80"],
    ["DISTANCE", `${Math.floor(distanceTraveled)}m`, "#60a5fa"],
  ];

  stats.forEach(([label, val, color], i) => {
    const row = Math.floor(i / 2);
    const col = i % 2;
    const sx = cardX + 30 + col * (cardW / 2 - 10);
    const sy = cardY + 140 + row * 72;
    const sw = cardW / 2 - 40;

    glassBox(sx, sy, sw, 56, 10);
    ctx.fillStyle = color;
    ctx.font = `bold 22px 'Orbitron', sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(val, sx + sw / 2, sy + 34);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "11px 'Rajdhani', sans-serif";
    ctx.fillText(label, sx + sw / 2, sy + 49);
  });

  // Restart button
  const btnW = 230, btnH = 52;
  const btnX = cx - btnW / 2, btnY = cardY + cardH - 70;
  const btnGrad = ctx.createLinearGradient(btnX, 0, btnX + btnW, 0);
  btnGrad.addColorStop(0, "#7c3aed"); btnGrad.addColorStop(1, "#a21caf");
  ctx.beginPath(); ctx.roundRect(btnX, btnY, btnW, btnH, 14);
  ctx.fillStyle = btnGrad;
  ctx.shadowColor = "#a78bfa"; ctx.shadowBlur = 16;
  ctx.fill(); ctx.shadowBlur = 0;

  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px 'Orbitron', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("↩  PLAY AGAIN", cx, btnY + 33);

  // Dev credit
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "12px 'Rajdhani', sans-serif";
  ctx.fillText("Developed by Sathwik Rai", cx, canvas.height - 22);
}

// ─── INPUT ────────────────────────────────────────────────────
function startOrFlap() {
  if (!gameStarted) {
    gameStarted = true;
    ball.x = 110; ball.y = canvas.height / 2; ball.velocity = 0;
    try { bgm.play(); } catch(e){}
    return;
  }
  if (gameOver) { location.reload(); return; }
  ball.flap();
}

canvas.addEventListener("click", startOrFlap);
canvas.addEventListener("touchstart", (e) => { e.preventDefault(); startOrFlap(); }, { passive: false });
document.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "Enter"].includes(e.code)) { e.preventDefault(); startOrFlap(); }
});

// Custom cursor tracking
document.addEventListener("mousemove", (e) => {
  const el = document.querySelector("body::after");
});

// ─── KICK OFF ─────────────────────────────────────────────────
loop();

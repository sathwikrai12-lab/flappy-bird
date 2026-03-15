// ==============================
// 🎮 Magic Ball Adventure by Sathwik Rai
// ==============================

// --- Canvas Setup ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight; // Fixed: was canvas.height = canvas.height
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// --- Game Variables ---
let frames = 0;
let score = 0;
let coins = 0;
let gameOver = false;
let gameStarted = false;
const gravity = 0.25;
const pipeGap = 160;
const pipeWidth = 80;
let theme = "day";
let combo = 0;
let maxCombo = 0;
let sparkles = [];
let highScore = localStorage.getItem('flappyHighScore') || 0;
let distanceTraveled = 0;
let currentMotivationalMessage = "";

// Motivational messages array
const motivationalMessages = [
    "Better luck next time, champ! 💪🐦",
    "You gave it your best shot! Try again! 🔥💫",
    "Oops! The sky's the limit — fly again! ☁️🕊️",
    "Don't give up, legend! 🚀💖",
    "Game over… but not your spirit! 🌟💪",
    "Almost there! One more try, hero! 🦸‍♂️✨",
    "You're getting better with every try! 🌟",
    "The champion in you is waking up! 🏆",
    "One more try and you'll beat your record! 💪"
];

// --- Sounds ---
const flapSound = new Audio("sounds/flap.wav");
const hitSound = new Audio("sounds/hit.wav");
const bgm = new Audio("sounds/bgm.mp3");
const coinSound = new Audio("sounds/coin.wav");
const powerUpSound = new Audio("sounds/powerup.wav");
const gameOverSound = new Audio("sounds/gameover.wav");
bgm.loop = true;
bgm.volume = 0.4;
hitSound.volume = 0.7;
gameOverSound.volume = 0.6;

// --- Enhanced Crystal Ball ---
const ball = {
  x: 100,
  y: canvas.height / 2,
  radius: 22,
  velocity: 0,
  jump: -5.5,
  rotation: 0,
  glow: 0,
  trail: [],
  powerUp: null,
  powerUpTimer: 0,
  update() {
    this.velocity += gravity;
    this.y += this.velocity;
    this.rotation += 0.08;
    this.glow = Math.sin(frames * 0.1) * 0.4 + 0.6;
    
    // Add trail particles
    if (frames % 2 === 0) {
      this.trail.push({
        x: this.x,
        y: this.y,
        size: Math.random() * 8 + 4,
        life: 20,
        color: this.getTrailColor()
      });
    }
    
    // Update trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life--;
      this.trail[i].size *= 0.95;
      if (this.trail[i].life <= 0) {
        this.trail.splice(i, 1);
      }
    }
    
    // Update power-up timer
    if (this.powerUp && this.powerUpTimer > 0) {
      this.powerUpTimer--;
      if (this.powerUpTimer === 0) {
        this.powerUp = null;
      }
    }
  },
  getTrailColor() {
    if (this.powerUp === "shield") return "#00ff88";
    if (this.powerUp === "magnet") return "#ffaa00";
    if (this.powerUp === "speed") return "#ff4444";
    return theme === "day" ? "#4fc3f7" : "#bb86fc";
  },
  draw() {
    // Draw trail
    for (const particle of this.trail) {
      const alpha = particle.life / 20;
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    
    // Power-up effects
    if (this.powerUp) {
      const effectGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.5);
      if (this.powerUp === "shield") {
        effectGradient.addColorStop(0, "rgba(0, 255, 136, 0.3)");
        effectGradient.addColorStop(1, "rgba(0, 255, 136, 0)");
      } else if (this.powerUp === "magnet") {
        effectGradient.addColorStop(0, "rgba(255, 170, 0, 0.3)");
        effectGradient.addColorStop(1, "rgba(255, 170, 0, 0)");
      } else if (this.powerUp === "speed") {
        effectGradient.addColorStop(0, "rgba(255, 68, 68, 0.4)");
        effectGradient.addColorStop(1, "rgba(255, 68, 68, 0)");
      }
      ctx.fillStyle = effectGradient;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.2);
    glowGradient.addColorStop(0, `rgba(100, 200, 255, ${this.glow * 0.6})`);
    glowGradient.addColorStop(1, 'rgba(100, 200, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 2.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Main crystal ball
    const ballGradient = ctx.createRadialGradient(-8, -8, 0, 0, 0, this.radius);
    if (this.powerUp === "shield") {
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(0.3, '#00ff88');
      ballGradient.addColorStop(1, '#00cc66');
    } else if (this.powerUp === "magnet") {
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(0.3, '#ffaa00');
      ballGradient.addColorStop(1, '#ff6600');
    } else if (this.powerUp === "speed") {
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(0.3, '#ff4444');
      ballGradient.addColorStop(1, '#cc0000');
    } else {
      ballGradient.addColorStop(0, '#ffffff');
      ballGradient.addColorStop(0.3, '#4fc3f7');
      ballGradient.addColorStop(1, '#0288d1');
    }
    
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Shine effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.ellipse(-6, -6, 7, 5, Math.PI/4, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner crystal facets
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.restore();
  },
  flap() {
    this.velocity = this.jump;
    flapSound.currentTime = 0;
    flapSound.play();
    
    // Add extra particles on flap
    for (let i = 0; i < 5; i++) {
      this.trail.push({
        x: this.x,
        y: this.y,
        size: Math.random() * 6 + 3,
        life: 15,
        color: this.getTrailColor()
      });
    }
  },
  activatePowerUp(type) {
    this.powerUp = type;
    this.powerUpTimer = type === "speed" ? 180 : 300;
    powerUpSound.play();
  }
};

// --- Enhanced Coins & Power-ups ---
const coinsArray = [];
const powerUpsArray = [];

function createSparkle(x, y, color = "#FFD700") {
  for (let i = 0; i < 5; i++) {
    sparkles.push({
      x: x + (Math.random() - 0.5) * 25,
      y: y + (Math.random() - 0.5) * 25,
      size: Math.random() * 5 + 2,
      speedX: (Math.random() - 0.5) * 5,
      speedY: (Math.random() - 0.5) * 5,
      life: 40,
      color: color
    });
  }
}

function drawEnhancedCoin(coin) {
  const rotation = frames * 0.1;
  const bounce = Math.sin(frames * 0.2) * 4;
  const pulse = Math.sin(frames * 0.15) * 0.3 + 0.7;
  
  ctx.save();
  ctx.translate(coin.x, coin.y + bounce);
  ctx.rotate(rotation);
  
  // Outer glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 25);
  glow.addColorStop(0, `rgba(255, 215, 0, ${pulse * 0.5})`);
  glow.addColorStop(1, 'rgba(255, 215, 0, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();
  
  // Main coin body
  const gradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, 14);
  gradient.addColorStop(0, '#FFF8B3');
  gradient.addColorStop(0.4, '#FFD700');
  gradient.addColorStop(1, '#FF6B00');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  
  // Coin edge
  ctx.strokeStyle = '#FF9800';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.stroke();
  
  // Shine effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.beginPath();
  ctx.ellipse(-4, -4, 5, 4, Math.PI/4, 0, Math.PI * 2);
  ctx.fill();
  
  // $ symbol for premium look
  ctx.fillStyle = '#FF9800';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', 0, 0);
  
  ctx.restore();
}

function drawPowerUp(powerUp) {
  const bounce = Math.sin(frames * 0.15) * 5;
  const pulse = Math.sin(frames * 0.1) * 0.4 + 0.6;
  const rotation = frames * 0.05;
  
  ctx.save();
  ctx.translate(powerUp.x, powerUp.y + bounce);
  ctx.rotate(rotation);
  
  // Outer aura
  const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, 28);
  if (powerUp.type === "shield") {
    aura.addColorStop(0, `rgba(0, 255, 136, ${pulse * 0.6})`);
    aura.addColorStop(1, 'rgba(0, 255, 136, 0)');
  } else if (powerUp.type === "magnet") {
    aura.addColorStop(0, `rgba(255, 170, 0, ${pulse * 0.6})`);
    aura.addColorStop(1, 'rgba(255, 170, 0, 0)');
  } else if (powerUp.type === "speed") {
    aura.addColorStop(0, `rgba(255, 68, 68, ${pulse * 0.6})`);
    aura.addColorStop(1, 'rgba(255, 68, 68, 0)');
  }
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  
  // Main body
  const gradient = ctx.createRadialGradient(-4, -4, 0, 0, 0, 16);
  if (powerUp.type === "shield") {
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#00ff88');
    gradient.addColorStop(1, '#00cc66');
  } else if (powerUp.type === "magnet") {
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#ffaa00');
    gradient.addColorStop(1, '#ff6600');
  } else if (powerUp.type === "speed") {
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.5, '#ff4444');
    gradient.addColorStop(1, '#cc0000');
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, 16, 0, Math.PI * 2);
  ctx.fill();
  
  // Icon with better styling
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  if (powerUp.type === "shield") {
    ctx.fillText('🛡️', 0, 0);
  } else if (powerUp.type === "magnet") {
    ctx.fillText('🧲', 0, 0);
  } else if (powerUp.type === "speed") {
    ctx.fillText('⚡', 0, 0);
  }
  
  ctx.restore();
}

// --- Pipes ---
const pipes = [];
let pipeSpeed = 2.5;

function addPipe() {
  const topHeight = Math.random() * (canvas.height / 2) + 60;
  pipes.push({
    x: canvas.width,
    top: topHeight,
    bottom: topHeight + pipeGap,
    passed: false
  });
}

function addRandomCoin() {
  if (pipes.length === 0) return;

  const lastPipe = pipes[pipes.length - 1];
  
  // 60% chance to spawn a coin
  if (Math.random() < 0.6) {
    const gapCenterY = (lastPipe.top + lastPipe.bottom) / 2;
    const offsetY = (Math.random() - 0.5) * (pipeGap * 0.4);
    coinsArray.push({
      x: lastPipe.x + pipeWidth / 2 + 80,
      y: gapCenterY + offsetY,
      collected: false
    });
  }
  
  // 15% chance to spawn power-up
  if (Math.random() < 0.15) {
    const gapCenterY = (lastPipe.top + lastPipe.bottom) / 2;
    const offsetY = (Math.random() - 0.5) * (pipeGap * 0.3);
    const powerUpTypes = ["shield", "magnet", "speed"];
    const randomType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
    
    powerUpsArray.push({
      x: lastPipe.x + pipeWidth / 2 + 120,
      y: gapCenterY + offsetY,
      type: randomType,
      collected: false
    });
  }
}

// --- Background Effects ---
const clouds = [];
const stars = [];

for (let i = 0; i < 6; i++) {
  clouds.push({
    x: Math.random() * canvas.width,
    y: Math.random() * (canvas.height / 2),
    size: 60 + Math.random() * 120,
    speed: 0.3 + Math.random() * 0.7
  });
}

for (let i = 0; i < 80; i++) {
  stars.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 2.5 + 0.5,
    brightness: Math.random() * 0.8 + 0.2
  });
}

function drawClouds() {
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  for (const c of clouds) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, c.size, c.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    c.x -= c.speed;
    if (c.x + c.size < 0) {
      c.x = canvas.width + 100;
      c.y = Math.random() * (canvas.height / 2);
    }
  }
}

function drawStars() {
  ctx.fillStyle = "#ffffff";
  for (const star of stars) {
    const twinkle = Math.sin(frames * 0.05 + star.x) * 0.3 + 0.7;
    ctx.globalAlpha = star.brightness * twinkle;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (theme === "day") {
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(0.7, "#70c5ce");
    gradient.addColorStop(1, "#90EE90");
  } else {
    gradient.addColorStop(0, "#0d1b2a");
    gradient.addColorStop(0.7, "#1b263b");
    gradient.addColorStop(1, "#2a3d5e");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  if (theme === "night") {
    drawStars();
  }
  drawClouds();
}

function toggleTheme() {
  theme = theme === "day" ? "night" : "day";
}

// --- Game Loop ---
function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  // Update sparkles
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.x += s.speedX;
    s.y += s.speedY;
    s.life--;
    s.size *= 0.95;
    
    ctx.fillStyle = s.color;
    ctx.globalAlpha = s.life / 40;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
    
    if (s.life <= 0) sparkles.splice(i, 1);
  }
  ctx.globalAlpha = 1;

  if (!gameStarted) {
    // Enhanced Start screen
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title with gradient
    const titleGradient = ctx.createLinearGradient(canvas.width/2 - 200, 0, canvas.width/2 + 200, 0);
    titleGradient.addColorStop(0, "#4fc3f7");
    titleGradient.addColorStop(0.5, "#ff6b6b");
    titleGradient.addColorStop(1, "#ffd700");
    
    ctx.fillStyle = titleGradient;
    ctx.font = "bold 64px 'Poppins', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Magic Ball Adventure", canvas.width / 2, canvas.height / 2 - 100);
    
    ctx.fillStyle = "#ffffff";
    ctx.font = "28px 'Poppins', sans-serif";
    ctx.fillText("Click or Press Space to Start", canvas.width / 2, canvas.height / 2 - 10);
    
    ctx.font = "22px 'Poppins', sans-serif";
    ctx.fillText("Collect coins and power-ups!", canvas.width / 2, canvas.height / 2 + 40);
    
    // Power-up instructions with icons
    ctx.font = "20px 'Poppins', sans-serif";
    ctx.fillText("🛡️ Shield: Invincibility", canvas.width / 2, canvas.height / 2 + 80);
    ctx.fillText("🧲 Magnet: Attract Coins", canvas.width / 2, canvas.height / 2 + 110);
    ctx.fillText("⚡ Speed: Slow Motion", canvas.width / 2, canvas.height / 2 + 140);
    
    // High score
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 24px 'Poppins', sans-serif";
    ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 190);
    
    // Developer credit
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "18px 'Poppins', sans-serif";
    ctx.fillText("Developed by Sathwik Rai", canvas.width / 2, canvas.height - 50);
    
    // Draw animated sample ball
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2 - 200;
    ball.rotation = frames * 0.02;
    ball.draw();
    
    frames++;
    requestAnimationFrame(loop);
    return;
  }

  // Update distance
  distanceTraveled += pipeSpeed / 60;
  
  // Add pipes & collectibles
  if (frames % 100 === 0) {
    addPipe();
    addRandomCoin();
  }

  // Adjust speed based on power-up
  const currentPipeSpeed = ball.powerUp === "speed" ? pipeSpeed * 0.6 : pipeSpeed;

  // Move & draw pipes
  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= currentPipeSpeed;

    // Pipe gradient with better colors
    const pipeGradient = ctx.createLinearGradient(p.x, 0, p.x + pipeWidth, 0);
    if (theme === "day") {
      pipeGradient.addColorStop(0, "#2E8B57");
      pipeGradient.addColorStop(0.5, "#32CD32");
      pipeGradient.addColorStop(1, "#228B22");
    } else {
      pipeGradient.addColorStop(0, "#4A5568");
      pipeGradient.addColorStop(0.5, "#718096");
      pipeGradient.addColorStop(1, "#2D3748");
    }
    ctx.fillStyle = pipeGradient;

    // Draw pipes with rounded tops
    ctx.fillRect(p.x, 0, pipeWidth, p.top);
    ctx.fillRect(p.x, p.bottom, pipeWidth, canvas.height - p.bottom);
    
    // Pipe caps
    ctx.fillStyle = theme === "day" ? "#228B22" : "#2D3748";
    ctx.fillRect(p.x - 5, p.top - 20, pipeWidth + 10, 20);
    ctx.fillRect(p.x - 5, p.bottom, pipeWidth + 10, 20);

    // Collision detection (ignore if shield is active)
    if (!ball.powerUp || ball.powerUp !== "shield") {
      if (
        ball.x + ball.radius > p.x &&
        ball.x - ball.radius < p.x + pipeWidth &&
        (ball.y - ball.radius < p.top || ball.y + ball.radius > p.bottom)
      ) {
        handleGameOver();
        return;
      }
    }

    // Score when pipe passed
    if (!p.passed && p.x + pipeWidth < ball.x) {
      score++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      p.passed = true;
      if (score % 30 === 0) toggleTheme();
      
      // Increase difficulty every 10 pipes
      if (score % 10 === 0) {
        pipeSpeed += 0.2;
      }
    }

    if (p.x + pipeWidth < 0) pipes.splice(i, 1);
  }

  // Move & draw coins with magnet effect
  for (let i = coinsArray.length - 1; i >= 0; i--) {
    const coin = coinsArray[i];
    if (coin.collected) continue;

    // Magnet effect
    if (ball.powerUp === "magnet") {
      const dx = ball.x - coin.x;
      const dy = ball.y - coin.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 200) {
        coin.x += dx * 0.15;
        coin.y += dy * 0.15;
      }
    } else {
      coin.x -= currentPipeSpeed;
    }

    drawEnhancedCoin(coin);

    // Collision check
    const dx = ball.x - coin.x;
    const dy = ball.y - coin.y;
    if (Math.sqrt(dx * dx + dy * dy) < ball.radius + 14) {
      coin.collected = true;
      coins++;
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      coinSound.currentTime = 0;
      coinSound.play();
      createSparkle(coin.x, coin.y, "#FFD700");
      coinsArray.splice(i, 1);
      continue;
    }

    if (coin.x + 20 < 0) coinsArray.splice(i, 1);
  }

  // Move & draw power-ups
  for (let i = powerUpsArray.length - 1; i >= 0; i--) {
    const powerUp = powerUpsArray[i];
    if (powerUp.collected) continue;

    powerUp.x -= currentPipeSpeed;
    drawPowerUp(powerUp);

    // Collision check
    const dx = ball.x - powerUp.x;
    const dy = ball.y - powerUp.y;
    if (Math.sqrt(dx * dx + dy * dy) < ball.radius + 16) {
      powerUp.collected = true;
      ball.activatePowerUp(powerUp.type);
      createSparkle(powerUp.x, powerUp.y, 
        powerUp.type === "shield" ? "#00ff88" : 
        powerUp.type === "magnet" ? "#ffaa00" : "#ff4444");
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      powerUpsArray.splice(i, 1);
      continue;
    }

    if (powerUp.x + 20 < 0) powerUpsArray.splice(i, 1);
  }

  // Ball
  ball.update();
  ball.draw();

  // Ground hit (ignore if shield is active)
  if (!ball.powerUp || ball.powerUp !== "shield") {
    if (ball.y + ball.radius > canvas.height) {
      handleGameOver();
      return;
    }
  }

  // --- Enhanced UI with Better Visibility ---
  ctx.textAlign = "left";
  
  // Score with background for better visibility
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(15, 15, 200, 140);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 32px 'Poppins', sans-serif";
  ctx.fillText(`SCORE: ${score}`, 30, 50);

  ctx.font = "26px 'Poppins', sans-serif";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(`COINS: ${coins}`, 30, 85);
  
  // Distance traveled
  ctx.fillStyle = "#4fc3f7";
  ctx.fillText(`DIST: ${Math.floor(distanceTraveled)}m`, 30, 120);
  
  // Combo system with background
  if (combo > 1) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(15, 145, 120, 40);
    
    ctx.fillStyle = combo > 5 ? "#ff4444" : "#44ff44";
    ctx.font = "bold 24px 'Poppins', sans-serif";
    ctx.fillText(`COMBO x${combo}`, 30, 170);
  }
  
  // Power-up timer with background
  if (ball.powerUp) {
    const timeLeft = Math.ceil(ball.powerUpTimer / 60);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(canvas.width - 170, 15, 155, 40);
    
    ctx.fillStyle = ball.powerUp === "shield" ? "#00ff88" : 
                   ball.powerUp === "magnet" ? "#ffaa00" : "#ff4444";
    ctx.font = "bold 20px 'Poppins', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`${ball.powerUp.toUpperCase()} ${timeLeft}s`, canvas.width - 20, 40);
    ctx.textAlign = "left";
  }

  // High score indicator
  if (score > highScore) {
    ctx.fillStyle = "rgba(255, 215, 0, 0.3)";
    ctx.fillRect(canvas.width / 2 - 100, 15, 200, 40);
    ctx.fillStyle = "#FFD700";
    ctx.font = "bold 24px 'Poppins', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("NEW HIGH SCORE!", canvas.width / 2, 40);
    ctx.textAlign = "left";
  }

  // Developer credit during gameplay
  ctx.fillStyle = "rgba(255,255,255,0.6)";
  ctx.font = "16px 'Poppins', sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Developed by Sathwik Rai", canvas.width - 20, canvas.height - 20);
  ctx.textAlign = "left";

  frames++;
  if (!gameOver) requestAnimationFrame(loop);
}

function handleGameOver() {
  gameOver = true;
  
  // Select a random motivational message
  currentMotivationalMessage = motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)];
  
  // Update high score
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('flappyHighScore', highScore);
  }
  
  // Stop BGM and play game over sound
  bgm.pause();
  bgm.currentTime = 0;
  hitSound.play();
  
  // Play game over sound after a delay
  setTimeout(() => {
    gameOverSound.play();
  }, 500);
  
  // Show game over screen
  showGameOverScreen();
}

function showGameOverScreen() {
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 56px 'Poppins', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 120);
  
  // Display the motivational message
  ctx.font = "italic 24px 'Poppins', sans-serif";
  ctx.fillStyle = "#FFD700";
  ctx.fillText(currentMotivationalMessage, canvas.width / 2, canvas.height / 2 - 60);
  
  ctx.fillStyle = "#ffffff";
  ctx.font = "28px 'Poppins', sans-serif";
  ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 - 10);
  ctx.fillText(`Coins Collected: ${coins}`, canvas.width / 2, canvas.height / 2 + 30);
  ctx.fillText(`Max Combo: ${maxCombo}`, canvas.width / 2, canvas.height / 2 + 70);
  ctx.fillText(`Distance: ${Math.floor(distanceTraveled)}m`, canvas.width / 2, canvas.height / 2 + 110);
  ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 150);
  
  ctx.fillStyle = "#4fc3f7";
  ctx.font = "24px 'Poppins', sans-serif";
  ctx.fillText("Click or Press Space to Play Again", canvas.width / 2, canvas.height / 2 + 200);
  
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "18px 'Poppins', sans-serif";
  ctx.fillText("Developed by Sathwik Rai", canvas.width / 2, canvas.height - 40);
}

// --- Input ---
function startGame() {
  if (!gameStarted) {
    gameStarted = true;
    bgm.play().catch(() => {});
    return;
  }
  if (gameOver) {
    location.reload();
  } else {
    ball.flap();
  }
}

canvas.addEventListener("click", startGame);

document.addEventListener("keydown", (e) => {
  if (["Space", "ArrowUp", "Enter"].includes(e.code)) {
    if (!gameStarted) {
      bgm.play().catch(() => {});
      gameStarted = true;
    } else if (gameOver) {
      location.reload();
    } else {
      ball.flap();
    }
  }
});

// Start with menu
loop();
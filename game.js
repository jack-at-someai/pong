(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const p1ScoreEl = document.getElementById('p1-score');
  const p2ScoreEl = document.getElementById('p2-score');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');
  const startBtn = document.getElementById('start-btn');

  const W = 600;
  const H = 400;
  canvas.width = W;
  canvas.height = H;

  const WIN_SCORE = 7;
  const PADDLE_W = 12;
  const PADDLE_H = 70;
  const BALL_R = 8;
  const PADDLE_MARGIN = 20;
  const BALL_SPEED_INIT = 5;
  const BALL_SPEED_MAX = 10;
  const PADDLE_SPEED = 6;
  const AI_SPEED = 4.5;

  // Sounder colors
  const COL = {
    bg: '#0d001a',
    center: '#2E0051',
    paddle1: '#21D6C6',
    paddle2: '#F000D2',
    ball: '#E3CCF5',
    ballGlow: 'rgba(227, 204, 245, 0.3)',
    trail: '#7200CB',
    net: '#44007A'
  };

  let p1, p2, ball, p1Score, p2Score, running, paused;
  let trail = [];
  let particles = [];
  let mouseY = H / 2;
  let usingMouse = false;

  function init() {
    p1 = { x: PADDLE_MARGIN, y: H / 2 - PADDLE_H / 2 };
    p2 = { x: W - PADDLE_MARGIN - PADDLE_W, y: H / 2 - PADDLE_H / 2 };
    resetBall(1);
    p1Score = 0;
    p2Score = 0;
    p1ScoreEl.textContent = '0';
    p2ScoreEl.textContent = '0';
    trail = [];
    particles = [];
  }

  function resetBall(dir) {
    const angle = (Math.random() * 0.8 - 0.4); // -0.4 to 0.4 radians
    const speed = BALL_SPEED_INIT;
    ball = {
      x: W / 2,
      y: H / 2,
      vx: speed * Math.cos(angle) * dir,
      vy: speed * Math.sin(angle),
      speed
    };
    trail = [];
  }

  function spawnHitParticles(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({
        x, y,
        vx: Math.cos(a) * (2 + Math.random() * 3),
        vy: Math.sin(a) * (2 + Math.random() * 3),
        life: 1,
        color
      });
    }
  }

  // ---- AI ----
  function aiUpdate() {
    const target = ball.vx > 0 ? predictBallY() : H / 2;
    const center = p2.y + PADDLE_H / 2;
    const diff = target - center;

    if (Math.abs(diff) > 4) {
      p2.y += Math.sign(diff) * Math.min(AI_SPEED, Math.abs(diff));
    }

    p2.y = Math.max(0, Math.min(H - PADDLE_H, p2.y));
  }

  function predictBallY() {
    // Simple prediction: extrapolate ball to paddle x, bouncing off walls
    let bx = ball.x, by = ball.y, bvx = ball.vx, bvy = ball.vy;
    const targetX = p2.x;
    if (bvx <= 0) return H / 2;

    const steps = Math.ceil((targetX - bx) / bvx);
    for (let i = 0; i < steps && i < 200; i++) {
      bx += bvx;
      by += bvy;
      if (by <= BALL_R || by >= H - BALL_R) bvy = -bvy;
    }
    return by;
  }

  // ---- UPDATE ----
  function update() {
    // Player paddle
    if (usingMouse) {
      const target = mouseY - PADDLE_H / 2;
      p1.y += (target - p1.y) * 0.3;
    }
    p1.y = Math.max(0, Math.min(H - PADDLE_H, p1.y));

    // AI
    aiUpdate();

    // Ball trail
    trail.push({ x: ball.x, y: ball.y });
    if (trail.length > 12) trail.shift();

    // Ball movement
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom walls
    if (ball.y - BALL_R <= 0) {
      ball.y = BALL_R;
      ball.vy = Math.abs(ball.vy);
    }
    if (ball.y + BALL_R >= H) {
      ball.y = H - BALL_R;
      ball.vy = -Math.abs(ball.vy);
    }

    // Paddle collisions
    // Player paddle (left)
    if (ball.vx < 0 &&
        ball.x - BALL_R <= p1.x + PADDLE_W &&
        ball.x - BALL_R >= p1.x &&
        ball.y >= p1.y && ball.y <= p1.y + PADDLE_H) {
      handlePaddleHit(p1, 1);
      spawnHitParticles(p1.x + PADDLE_W, ball.y, COL.paddle1);
    }

    // AI paddle (right)
    if (ball.vx > 0 &&
        ball.x + BALL_R >= p2.x &&
        ball.x + BALL_R <= p2.x + PADDLE_W &&
        ball.y >= p2.y && ball.y <= p2.y + PADDLE_H) {
      handlePaddleHit(p2, -1);
      spawnHitParticles(p2.x, ball.y, COL.paddle2);
    }

    // Scoring
    if (ball.x < -BALL_R) {
      p2Score++;
      p2ScoreEl.textContent = p2Score;
      if (p2Score >= WIN_SCORE) { endGame('AI wins!'); return; }
      resetBall(1);
    }
    if (ball.x > W + BALL_R) {
      p1Score++;
      p1ScoreEl.textContent = p1Score;
      if (p1Score >= WIN_SCORE) { endGame('You win!'); return; }
      resetBall(-1);
    }

    // Particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function handlePaddleHit(paddle, dir) {
    // Where on paddle did it hit? -1 to 1
    const hitPos = (ball.y - (paddle.y + PADDLE_H / 2)) / (PADDLE_H / 2);
    const angle = hitPos * (Math.PI / 4); // max 45 degrees
    ball.speed = Math.min(ball.speed + 0.3, BALL_SPEED_MAX);
    ball.vx = ball.speed * Math.cos(angle) * dir;
    ball.vy = ball.speed * Math.sin(angle);
    // Push ball out of paddle
    if (dir === 1) ball.x = paddle.x + PADDLE_W + BALL_R;
    else ball.x = paddle.x - BALL_R;
  }

  // ---- DRAW ----
  function draw() {
    ctx.fillStyle = COL.bg;
    ctx.fillRect(0, 0, W, H);

    // Center net
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = COL.net;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center circle
    ctx.strokeStyle = COL.net;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Ball trail
    for (let i = 0; i < trail.length; i++) {
      const t = trail[i];
      const alpha = (i / trail.length) * 0.3;
      const size = BALL_R * (i / trail.length) * 0.7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = COL.trail;
      ctx.beginPath();
      ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ball glow
    const glow = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, BALL_R * 3);
    glow.addColorStop(0, COL.ballGlow);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(ball.x - BALL_R * 3, ball.y - BALL_R * 3, BALL_R * 6, BALL_R * 6);

    // Ball
    ctx.fillStyle = COL.ball;
    ctx.shadowColor = COL.ball;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Player paddle
    ctx.fillStyle = COL.paddle1;
    ctx.shadowColor = COL.paddle1;
    ctx.shadowBlur = 10;
    roundRect(p1.x, p1.y, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // AI paddle
    ctx.fillStyle = COL.paddle2;
    ctx.shadowColor = COL.paddle2;
    ctx.shadowBlur = 10;
    roundRect(p2.x, p2.y, PADDLE_W, PADDLE_H, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Particles
    for (const p of particles) {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3 * p.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ---- LOOP ----
  function loop() {
    if (!running) return;
    update();
    draw();
    requestAnimationFrame(loop);
  }

  function start() {
    if (running) return;
    running = true;
    overlay.classList.add('hidden');
    init();
    requestAnimationFrame(loop);
  }

  function endGame(msg) {
    running = false;
    overlayText.textContent = msg;
    startBtn.textContent = 'Play Again';
    overlay.classList.remove('hidden');
  }

  // ---- INPUT ----

  // Mouse
  canvas.addEventListener('mousemove', e => {
    usingMouse = true;
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    mouseY = (e.clientY - rect.top) * scaleY;
  });

  // Touch
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    usingMouse = true;
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    mouseY = (e.touches[0].clientY - rect.top) * scaleY;
  }, { passive: false });

  canvas.addEventListener('touchstart', e => {
    if (!running) start();
    usingMouse = true;
    const rect = canvas.getBoundingClientRect();
    const scaleY = H / rect.height;
    mouseY = (e.touches[0].clientY - rect.top) * scaleY;
  }, { passive: true });

  // Keyboard fallback
  let keysDown = {};
  document.addEventListener('keydown', e => {
    keysDown[e.code] = true;
    if (e.code === 'Space' || e.code === 'Enter') {
      if (!running) start();
    }
  });
  document.addEventListener('keyup', e => { keysDown[e.code] = false; });

  setInterval(() => {
    if (!running) return;
    if (keysDown['ArrowUp'] || keysDown['KeyW']) {
      usingMouse = false;
      p1.y -= PADDLE_SPEED;
    }
    if (keysDown['ArrowDown'] || keysDown['KeyS']) {
      usingMouse = false;
      p1.y += PADDLE_SPEED;
    }
  }, 16);

  startBtn.addEventListener('click', start);

  // Initial draw
  init();
  draw();
})();

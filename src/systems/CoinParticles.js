/**
 * CoinParticles - Lightweight Interactive Gold Coin Sparkle Particle Engine
 * Fires when touching on mobile or moving/clicking on desktop
 * Automatically sleeps when no particles exist to save battery
 */
export class CoinParticles {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.particles = [];
    this.isRunning = false;
    this.isEnabled = true;
    this.lastSpawnTime = 0;

    this.initCanvas();
    this.setupListeners();
  }

  initCanvas() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'coin-particles-canvas';
    this.canvas.style.cssText = `
      position: fixed;
      inset: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 99998;
    `;
    document.body.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();

    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  setupListeners() {
    // Mouse move (desktop throttled)
    window.addEventListener('pointermove', (e) => {
      if (!this.isEnabled) return;
      const now = performance.now();
      if (now - this.lastSpawnTime > 80) {
        this.spawn(e.clientX, e.clientY, 1);
        this.lastSpawnTime = now;
      }
    }, { passive: true });

    // Touch / Click (instant burst)
    window.addEventListener('pointerdown', (e) => {
      if (!this.isEnabled) return;
      this.spawn(e.clientX, e.clientY, 5);
    }, { passive: true });
  }

  spawn(x, y, count = 2) {
    const colors = ['#f5b324', '#ffd700', '#fde047', '#fff', '#d4af37'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        gravity: 0.15,
        radius: 3.5 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.25,
        alpha: 1.0,
        decay: 0.02 + Math.random() * 0.02,
        isCoin: Math.random() > 0.35
      });
    }

    if (!this.isRunning) {
      this.isRunning = true;
      requestAnimationFrame(() => this.loop());
    }
  }

  burst(x, y, count = 30) {
    this.spawn(x, y, count);
  }

  /**
   * Money Counter Machine Burst with Fluttering Egyptian Banknotes
   */
  triggerMoneyCountBurst(x = window.innerWidth / 2, y = window.innerHeight / 2, count = 25, audioFX = null) {
    if (audioFX) {
      audioFX.playCashCounterMachine(count);
    }

    const noteColors = ['#10b981', '#059669', '#34d399', '#f59e0b', '#fbbf24']; // Egyptian Pound green/gold hues

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 1.1) + (Math.random() * Math.PI * 0.8); // Upward spray
      const speed = 3.5 + Math.random() * 5.0;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3.5,
        gravity: 0.18,
        width: 22 + Math.random() * 10,
        height: 12 + Math.random() * 6,
        color: noteColors[Math.floor(Math.random() * noteColors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.35,
        scaleX: 1.0,
        vScaleX: 0.08 + Math.random() * 0.06,
        alpha: 1.0,
        decay: 0.012 + Math.random() * 0.015,
        isBanknote: true
      });
    }

    if (!this.isRunning) {
      this.isRunning = true;
      requestAnimationFrame(() => this.loop());
    }
  }

  loop() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.alpha -= p.decay;

      if (p.isBanknote) {
        p.scaleX = Math.cos(p.rotation * 2); // 3D tumbling paper effect
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);

      if (p.isBanknote) {
        // 3D Banknote bill
        this.ctx.scale(p.scaleX, 1);
        this.ctx.fillStyle = p.color;
        this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);

        // Banknote border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 0.8;
        this.ctx.strokeRect(-p.width / 2, -p.height / 2, p.width, p.height);

        // Banknote center emblem watermark
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.height * 0.25, 0, Math.PI * 2);
        this.ctx.fill();
      } else if (p.isCoin) {
        // Gold Coin
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, p.radius, p.radius * 0.7, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // Inner rim
        this.ctx.strokeStyle = '#92400e';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Sparkle glint
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(p.radius * 0.3, -p.radius * 0.2, 1, 0, Math.PI * 2);
        this.ctx.fill();
      } else {
        // Sparkle Star
        this.ctx.fillStyle = p.color;
        this.ctx.beginPath();
        this.ctx.arc(0, 0, p.radius * 0.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.loop());
    } else {
      this.isRunning = false;
    }
  }
}

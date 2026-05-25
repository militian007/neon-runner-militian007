// Platform.js - Special platforms: moving, breakable, disappearing
// Modern vector/neon visual style - NO pixel art

const TILE_SIZE = 40;

export default class Platform {
  constructor(x, y, width, height, type, config) {
    // type: 'moving', 'breakable', 'disappearing'
    // config for moving: {dx, dy, speed, range}
    // config for breakable: {breakDelay} (time before breaking after stepped on)
    // config for disappearing: {interval, offset}
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height || 12;
    this.type = type;
    this.config = config || {};
    this.startX = x;
    this.startY = y;
    this.timer = config?.offset || 0;
    this.broken = false;
    this.visible = true;
    this.breakTimer = 0;
    this.breakTriggered = false;
    this.globalTime = config?.offset || 0;

    // Moving platform velocity for collision resolution
    this.prevX = x;
    this.prevY = y;
    this.platformVX = 0;
    this.platformVY = 0;

    // Breakable cracks
    this.crackLevel = 0; // 0-1
    this.shakeX = 0;
    this.shakeY = 0;

    // Disappearing flicker
    this.flickerAlpha = 1;
    this.flickering = false;

    // Particles on break
    this.breakParticles = [];
  }

  update(dt) {
    this.globalTime += dt;
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.type === 'moving' && !this.broken) {
      this.timer += dt * (this.config.speed || 1);
      const dx = this.config.dx || 0;
      const dy = this.config.dy || 0;
      const range = this.config.range || 100;

      this.x = this.startX + Math.sin(this.timer) * range * dx;
      this.y = this.startY + Math.sin(this.timer) * range * dy;

      this.platformVX = this.x - this.prevX;
      this.platformVY = this.y - this.prevY;
    }

    if (this.type === 'breakable' && this.breakTriggered && !this.broken) {
      this.breakTimer -= dt;
      this.crackLevel = 1 - (this.breakTimer / (this.config.breakDelay || 0.8));
      this.crackLevel = Math.min(1, Math.max(0, this.crackLevel));

      // Shake increasing with crack level
      this.shakeX = (Math.random() - 0.5) * this.crackLevel * 6;
      this.shakeY = (Math.random() - 0.5) * this.crackLevel * 4;

      if (this.breakTimer <= 0) {
        this.broken = true;
        this._spawnBreakParticles();
      }
    }

    if (this.type === 'disappearing') {
      const interval = this.config.interval || 3;
      const phase = ((this.globalTime % (interval * 2)) / interval);

      if (phase < 1) {
        // Visible phase
        this.visible = true;
        this.flickering = false;
        this.flickerAlpha = 1;

        // Start flickering near the end
        if (phase > 0.75) {
          this.flickering = true;
          this.flickerAlpha = Math.random() > 0.3 ? 0.8 : 0.2;
        }
      } else {
        // Invisible phase
        this.visible = false;
        this.flickerAlpha = 0;

        // Start appearing near the end
        if (phase > 1.8) {
          this.visible = true;
          this.flickering = true;
          this.flickerAlpha = Math.random() > 0.5 ? 0.5 : 0.15;
        }
      }
    }

    // Update break particles
    for (let i = this.breakParticles.length - 1; i >= 0; i--) {
      const p = this.breakParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.3; // gravity
      p.rotation += p.rotSpeed;
      p.life -= dt;
      if (p.life <= 0) this.breakParticles.splice(i, 1);
    }
  }

  render(ctx) {
    // Render break particles even if broken
    this._renderBreakParticles(ctx);

    if (this.broken) return;
    if (!this.visible && !this.flickering) return;

    ctx.save();
    ctx.translate(this.x + (this.shakeX || 0), this.y + (this.shakeY || 0));

    if (this.flickering) {
      ctx.globalAlpha = this.flickerAlpha;
    }

    const w = this.width;
    const h = this.height;

    if (this.type === 'moving') {
      this._renderMoving(ctx, w, h);
    } else if (this.type === 'breakable') {
      this._renderBreakable(ctx, w, h);
    } else if (this.type === 'disappearing') {
      this._renderDisappearing(ctx, w, h);
    }

    ctx.restore();
  }

  _renderMoving(ctx, w, h) {
    // Metallic dark surface with cyan glow edges
    const surfGrad = ctx.createLinearGradient(0, 0, 0, h);
    surfGrad.addColorStop(0, '#2a2a3e');
    surfGrad.addColorStop(0.5, '#1a1a2e');
    surfGrad.addColorStop(1, '#0d1b2a');

    ctx.fillStyle = surfGrad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillRect(0, 0, w, h);

    // Top edge glow
    const topGrad = ctx.createLinearGradient(0, 0, w, 0);
    topGrad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
    topGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.8)');
    topGrad.addColorStop(1, 'rgba(0, 240, 255, 0.3)');
    ctx.strokeStyle = topGrad;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, 0);
    ctx.stroke();

    // Bottom edge
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(w, h);
    ctx.stroke();

    // Side edges
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, h);
    ctx.moveTo(w, 0);
    ctx.lineTo(w, h);
    ctx.stroke();

    // Movement indicator arrows
    ctx.fillStyle = 'rgba(0, 240, 255, 0.3)';
    ctx.shadowBlur = 4;
    const arrowPhase = Math.sin(this.globalTime * 3);
    const arrowDir = (this.config.dx || 0) !== 0 ? 'h' : 'v';

    if (arrowDir === 'h') {
      // Horizontal arrows
      for (let i = 0; i < 3; i++) {
        const ax = w * 0.3 + i * (w * 0.2) + arrowPhase * 3;
        const ay = h / 2;
        ctx.beginPath();
        ctx.moveTo(ax - 3, ay - 2);
        ctx.lineTo(ax + 2, ay);
        ctx.lineTo(ax - 3, ay + 2);
        ctx.fill();
      }
    } else {
      for (let i = 0; i < 2; i++) {
        const ax = w * 0.35 + i * (w * 0.3);
        const ay = h / 2 + arrowPhase * 2;
        ctx.beginPath();
        ctx.moveTo(ax - 2, ay - 2);
        ctx.lineTo(ax, ay + 2);
        ctx.lineTo(ax + 2, ay - 2);
        ctx.fill();
      }
    }

    // Corner accents
    const cornerSize = 4;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(0, cornerSize);
    ctx.lineTo(0, 0);
    ctx.lineTo(cornerSize, 0);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(w - cornerSize, 0);
    ctx.lineTo(w, 0);
    ctx.lineTo(w, cornerSize);
    ctx.stroke();
  }

  _renderBreakable(ctx, w, h) {
    // Orange/red warning colors
    const warnColor = this.breakTriggered ? 
      `rgba(255, ${Math.floor(100 - this.crackLevel * 100)}, 0, 1)` : '#ff6600';
    
    const surfGrad = ctx.createLinearGradient(0, 0, 0, h);
    surfGrad.addColorStop(0, '#3a2020');
    surfGrad.addColorStop(0.5, '#2a1515');
    surfGrad.addColorStop(1, '#1a0a0a');

    ctx.fillStyle = surfGrad;
    ctx.shadowColor = warnColor;
    ctx.shadowBlur = this.breakTriggered ? 12 + this.crackLevel * 10 : 6;
    ctx.fillRect(0, 0, w, h);

    // Edge glow
    ctx.strokeStyle = warnColor;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.strokeRect(0, 0, w, h);

    // Warning stripes
    ctx.save();
    ctx.clip();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = warnColor;
    const stripeWidth = 8;
    for (let sx = -h; sx < w + h; sx += stripeWidth * 2) {
      ctx.beginPath();
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx + stripeWidth, 0);
      ctx.lineTo(sx + stripeWidth + h, h);
      ctx.lineTo(sx + h, h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Crack lines (appear when breaking)
    if (this.crackLevel > 0) {
      ctx.strokeStyle = warnColor;
      ctx.lineWidth = 1 + this.crackLevel;
      ctx.shadowColor = warnColor;
      ctx.shadowBlur = 8;
      ctx.globalAlpha = this.crackLevel;

      // Generate deterministic cracks based on width
      const cracks = [
        [[w * 0.3, 0], [w * 0.35, h * 0.4], [w * 0.25, h]],
        [[w * 0.7, 0], [w * 0.65, h * 0.5], [w * 0.75, h]],
        [[0, h * 0.5], [w * 0.2, h * 0.45], [w * 0.5, h * 0.55], [w * 0.8, h * 0.5], [w, h * 0.48]]
      ];

      for (const crack of cracks) {
        if (this.crackLevel < 0.3 && crack === cracks[2]) continue;
        ctx.beginPath();
        ctx.moveTo(crack[0][0], crack[0][1]);
        for (let i = 1; i < crack.length; i++) {
          ctx.lineTo(crack[i][0], crack[i][1]);
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    }

    // Pulsing warning glow
    if (this.breakTriggered) {
      const pulseAlpha = 0.1 + this.crackLevel * 0.2 * (0.5 + Math.sin(this.globalTime * 15) * 0.5);
      ctx.fillStyle = `rgba(255, 60, 0, ${pulseAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  _renderDisappearing(ctx, w, h) {
    // Holographic / ghostly platform
    const surfGrad = ctx.createLinearGradient(0, 0, 0, h);
    surfGrad.addColorStop(0, 'rgba(139, 92, 246, 0.4)');
    surfGrad.addColorStop(1, 'rgba(139, 92, 246, 0.15)');

    ctx.fillStyle = surfGrad;
    ctx.shadowColor = '#8b5cf6';
    ctx.shadowBlur = 10;
    ctx.fillRect(0, 0, w, h);

    // Scan lines effect
    ctx.save();
    ctx.globalAlpha = 0.15;
    for (let sy = 0; sy < h; sy += 2) {
      ctx.fillStyle = '#8b5cf6';
      ctx.fillRect(0, sy, w, 1);
    }
    ctx.restore();

    // Edge glow
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 12;
    ctx.strokeRect(0, 0, w, h);

    // Digital noise/glitch when flickering
    if (this.flickering) {
      ctx.save();
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 3; i++) {
        const gy = Math.random() * h;
        const gw = Math.random() * w * 0.5;
        const gx = Math.random() * w;
        ctx.fillStyle = '#8b5cf6';
        ctx.fillRect(gx, gy, gw, 1);
      }
      ctx.restore();
    }

    // Phase indicators (small dots along top)
    const dotCount = Math.floor(w / 12);
    for (let i = 0; i < dotCount; i++) {
      const dotX = 6 + i * 12;
      const dotAlpha = 0.3 + Math.sin(this.globalTime * 4 + i * 0.5) * 0.2;
      ctx.fillStyle = `rgba(139, 92, 246, ${dotAlpha})`;
      ctx.beginPath();
      ctx.arc(dotX, -3, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _spawnBreakParticles() {
    const fragments = 12;
    for (let i = 0; i < fragments; i++) {
      this.breakParticles.push({
        x: this.x + Math.random() * this.width,
        y: this.y + Math.random() * this.height,
        vx: (Math.random() - 0.5) * 8,
        vy: -(Math.random() * 5 + 2),
        width: 4 + Math.random() * 8,
        height: 3 + Math.random() * 5,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 1.3
      });
    }
  }

  _renderBreakParticles(ctx) {
    for (const p of this.breakParticles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      ctx.fillStyle = '#2a1515';
      ctx.strokeStyle = `rgba(255, 100, 0, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 4;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      ctx.strokeRect(-p.width / 2, -p.height / 2, p.width, p.height);

      ctx.restore();
    }
  }

  /** Trigger breaking (called when player steps on it) */
  triggerBreak() {
    if (this.type === 'breakable' && !this.breakTriggered && !this.broken) {
      this.breakTriggered = true;
      this.breakTimer = this.config.breakDelay || 0.8;
    }
  }

  /** Check if a rect is standing on this platform */
  isStandingOn(entityX, entityY, entityW, entityH, entityVY = 0) {
    if (this.broken || !this.visible) return false;
    const footY = entityY + entityH;
    const onTop = footY >= this.y - 2 && footY <= this.y + 6;
    const prevFootY = footY - entityVY;
    const crossed = prevFootY <= this.y + 2 && footY >= this.y - 2;
    const xOverlap = entityX + entityW > this.x && entityX < this.x + this.width;
    return (onTop || crossed) && xOverlap;
  }

  /** Get the collision rect */
  getRect() {
    if (this.broken || !this.visible) return null;
    return { x: this.x, y: this.y, width: this.width, height: this.height };
  }
}

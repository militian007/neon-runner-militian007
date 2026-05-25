// PowerManager.js - Manages all three powers and their cooldowns/energy
// Q = EMP Shield, E = Phase Dash, R = Neon Storm

export default class PowerManager {
  constructor(player) {
    this.player = player;

    // Q - EMP Shield
    this.empShieldActive = false;
    this.empShieldTimer = 0;
    this.empShieldDuration = 2;
    this.empShieldCooldown = 0;
    this.empShieldMaxCooldown = 8;
    this.empShieldEnergyCost = 40;

    // E - Phase Dash
    this.phaseDashActive = false;
    this.phaseDashTimer = 0;
    this.phaseDashDuration = 0.3;
    this.phaseDashCooldown = 0;
    this.phaseDashMaxCooldown = 5;
    this.phaseDashSpeed = 20;
    this.phaseDashDir = 1;

    // R - Neon Storm
    this.neonStormActive = false;
    this.neonStormTimer = 0;
    this.neonStormDuration = 1.5;
    this.neonStormEnergyCost = 80;

    // Visual effects storage
    this.particles = [];
    this.shieldAngle = 0;
    this.shieldPulse = 0;
    this.stormBolts = [];
    this.stormFlash = 0;
    this.stormShockwave = 0;
    this.dashAfterImages = [];
    this.globalTime = 0;
  }

  update(dt, input) {
    this.globalTime += dt;

    // --- Q: EMP Shield ---
    if (input.isPressed('q') && this.canUseEMP()) {
      this.activateEMP();
    }

    if (this.empShieldActive) {
      this.empShieldTimer -= dt;
      this.shieldAngle += dt * 3;
      this.shieldPulse += dt * 8;
      this.player.powerGlowColor = '#00f0ff';

      // Shield arc particles
      if (Math.random() < 0.5) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 32 + Math.random() * 5;
        this.particles.push({
          x: this.player.getCenterX() + Math.cos(angle) * radius,
          y: this.player.getCenterY() + Math.sin(angle) * radius,
          vx: Math.cos(angle) * 0.5,
          vy: Math.sin(angle) * 0.5,
          life: 0.3,
          maxLife: 0.3,
          size: 1 + Math.random() * 2,
          color: '#00f0ff',
          type: 'shield'
        });
      }

      if (this.empShieldTimer <= 0) {
        this.empShieldActive = false;
        this.empShieldCooldown = this.empShieldMaxCooldown;
        this.player.powerGlowColor = null;
      }
    }

    // --- E: Phase Dash ---
    if (input.isPressed('e') && this.canUsePhase()) {
      this.activatePhase();
    }

    if (this.phaseDashActive) {
      this.phaseDashTimer -= dt;
      this.player.x += this.phaseDashSpeed * this.phaseDashDir * (dt / this.phaseDashDuration) * 60 * dt;
      this.player.powerGlowColor = '#8b5cf6';

      // Store afterimages
      if (Math.random() < 0.8) {
        this.dashAfterImages.push({
          x: this.player.x,
          y: this.player.y,
          facing: this.player.facing,
          alpha: 0.8,
          color: '#8b5cf6'
        });
      }

      // Speed trail particles
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          x: this.player.getCenterX() - this.phaseDashDir * 10 + (Math.random() - 0.5) * 10,
          y: this.player.getCenterY() + (Math.random() - 0.5) * this.player.height,
          vx: -this.phaseDashDir * (Math.random() * 4 + 2),
          vy: (Math.random() - 0.5) * 2,
          life: 0.2 + Math.random() * 0.15,
          maxLife: 0.35,
          size: 2 + Math.random() * 3,
          color: '#8b5cf6',
          type: 'dash'
        });
      }

      if (this.phaseDashTimer <= 0) {
        this.phaseDashActive = false;
        this.phaseDashCooldown = this.phaseDashMaxCooldown;
        this.player.powerGlowColor = null;
        this.player.dashing = false;
      }
    }

    // --- R: Neon Storm ---
    if (input.isPressed('r') && this.canUseNeonStorm()) {
      this.activateNeonStorm();
    }

    if (this.neonStormActive) {
      this.neonStormTimer -= dt;
      this.stormFlash = Math.max(0, this.stormFlash - dt * 2);
      this.stormShockwave += dt * 400;
      this.player.powerGlowColor = '#ffe600';

      // Regenerate lightning bolts periodically
      if (Math.random() < 0.4) {
        this._generateStormBolt();
      }

      // Storm particles
      for (let i = 0; i < 4; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 20 + Math.random() * 80;
        this.particles.push({
          x: this.player.getCenterX() + Math.cos(angle) * dist,
          y: this.player.getCenterY() + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 3,
          vy: -(Math.random() * 3 + 1),
          life: 0.3 + Math.random() * 0.3,
          maxLife: 0.6,
          size: 1 + Math.random() * 2,
          color: Math.random() > 0.5 ? '#ffe600' : '#ffffff',
          type: 'storm'
        });
      }

      if (this.neonStormTimer <= 0) {
        this.neonStormActive = false;
        this.stormBolts = [];
        this.player.powerGlowColor = null;
      }
    }

    // --- Cooldown timers ---
    if (this.empShieldCooldown > 0) this.empShieldCooldown -= dt;
    if (this.phaseDashCooldown > 0) this.phaseDashCooldown -= dt;

    // --- Update particles ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // --- Update dash afterimages ---
    for (let i = this.dashAfterImages.length - 1; i >= 0; i--) {
      this.dashAfterImages[i].alpha -= dt * 4;
      if (this.dashAfterImages[i].alpha <= 0) this.dashAfterImages.splice(i, 1);
    }

    // --- Fade storm bolts ---
    for (let i = this.stormBolts.length - 1; i >= 0; i--) {
      this.stormBolts[i].life -= dt;
      if (this.stormBolts[i].life <= 0) this.stormBolts.splice(i, 1);
    }
  }

  activateEMP() {
    this.empShieldActive = true;
    this.empShieldTimer = this.empShieldDuration;
    this.shieldAngle = 0;
    this.shieldPulse = 0;
    this.player.energy = Math.max(0, this.player.energy - this.empShieldEnergyCost);

    // Burst particles
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      this.particles.push({
        x: this.player.getCenterX(),
        y: this.player.getCenterY(),
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
        life: 0.4,
        maxLife: 0.4,
        size: 2 + Math.random() * 2,
        color: '#00f0ff',
        type: 'shield'
      });
    }
  }

  activatePhase() {
    this.phaseDashActive = true;
    this.phaseDashTimer = this.phaseDashDuration;
    this.phaseDashDir = this.player.facing;
    this.player.vy = 0; // Freeze vertical during dash
    this.player.dashing = true;
  }

  activateNeonStorm() {
    this.neonStormActive = true;
    this.neonStormTimer = this.neonStormDuration;
    this.player.energy = Math.max(0, this.player.energy - this.neonStormEnergyCost);
    this.stormFlash = 1.0;
    this.stormShockwave = 0;

    // Generate initial bolts
    for (let i = 0; i < 12; i++) {
      this._generateStormBolt();
    }
  }

  _generateStormBolt() {
    const angle = Math.random() * Math.PI * 2;
    const length = 60 + Math.random() * 140;
    const cx = this.player.getCenterX();
    const cy = this.player.getCenterY();

    // Generate jagged bolt points
    const points = [{ x: cx, y: cy }];
    const segments = 5 + Math.floor(Math.random() * 4);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const baseX = cx + Math.cos(angle) * length * t;
      const baseY = cy + Math.sin(angle) * length * t;
      const jitter = (1 - t) * 20;
      points.push({
        x: baseX + (Math.random() - 0.5) * jitter,
        y: baseY + (Math.random() - 0.5) * jitter
      });
    }

    this.stormBolts.push({
      points,
      life: 0.15 + Math.random() * 0.15,
      width: 1 + Math.random() * 2,
      color: Math.random() > 0.3 ? '#ffe600' : '#ffffff'
    });
  }

  render(ctx) {
    const px = this.player.getCenterX();
    const py = this.player.getCenterY();

    // --- Dash afterimages ---
    for (const img of this.dashAfterImages) {
      ctx.save();
      ctx.globalAlpha = img.alpha * 0.3;
      ctx.translate(img.x + this.player.width / 2, img.y + this.player.height / 2);
      ctx.scale(img.facing, 1);

      // Simple silhouette
      ctx.fillStyle = img.color;
      ctx.shadowColor = img.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- EMP Shield ---
    if (this.empShieldActive) {
      ctx.save();
      ctx.translate(px, py);

      const r = 32;
      const pulse = Math.sin(this.shieldPulse) * 0.1 + 1;
      const w = r * pulse;
      const h = r * 1.15 * pulse;

      // Draw the shield crest shape path
      const drawCrest = (c) => {
        c.beginPath();
        c.moveTo(0, -h);
        c.lineTo(w, -h * 0.7);
        c.quadraticCurveTo(w * 1.1, 0, w * 0.8, h * 0.5);
        c.quadraticCurveTo(w * 0.4, h * 0.9, 0, h);
        c.quadraticCurveTo(-w * 0.4, h * 0.9, -w * 0.8, h * 0.5);
        c.quadraticCurveTo(-w * 1.1, 0, -w, -h * 0.7);
        c.closePath();
      };

      // Outer glow and border
      ctx.save();
      drawCrest(ctx);
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
      ctx.lineWidth = 8;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 20;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Double-draw border for intensity
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // Fill with neon gradient
      ctx.save();
      drawCrest(ctx);
      const shieldGrad = ctx.createLinearGradient(0, -h, 0, h);
      shieldGrad.addColorStop(0, 'rgba(0, 240, 255, 0.15)');
      shieldGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.05)');
      shieldGrad.addColorStop(1, 'rgba(0, 240, 255, 0.25)');
      ctx.fillStyle = shieldGrad;
      ctx.fill();

      // Clip inside the crest for scanlines and grid patterns
      ctx.clip();

      // Cyber grids and horizontal scanlines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      
      const offset = (this.globalTime * 30) % 15;
      for (let yPos = -h - 15; yPos < h + 15; yPos += 10) {
        const lineY = yPos + offset;
        ctx.beginPath();
        ctx.moveTo(-w * 1.5, lineY);
        ctx.lineTo(w * 1.5, lineY);
        ctx.stroke();
      }

      // Vertical grid lines
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.12)';
      for (let xPos = -w; xPos <= w; xPos += 10) {
        ctx.beginPath();
        ctx.moveTo(xPos, -h);
        ctx.lineTo(xPos, h);
        ctx.stroke();
      }
      ctx.restore();

      // Electric arcs on top of the shield
      if (Math.random() < 0.45) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        
        // Random electric arc on the surface
        const startAngle = Math.random() * Math.PI * 2;
        const startRadius = Math.random() * r * 0.8;
        const startX = Math.cos(startAngle) * startRadius;
        const startY = Math.sin(startAngle) * startRadius;
        ctx.moveTo(startX, startY);
        
        let currX = startX;
        let currY = startY;
        for (let j = 0; j < 3; j++) {
          currX += (Math.random() - 0.5) * 12;
          currY += (Math.random() - 0.5) * 12;
          ctx.lineTo(currX, currY);
        }
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore();
    }

    // --- Neon Storm ---
    if (this.neonStormActive) {
      ctx.save();

      // Screen flash
      if (this.stormFlash > 0) {
        ctx.fillStyle = `rgba(255, 230, 0, ${this.stormFlash * 0.3})`;
        ctx.fillRect(px - 640, py - 360, 1280, 720);
      }

      // Shockwave ring
      if (this.stormShockwave < 300) {
        ctx.strokeStyle = `rgba(255, 230, 0, ${(1 - this.stormShockwave / 300) * 0.5})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ffe600';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(px, py, this.stormShockwave, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Lightning bolts
      for (const bolt of this.stormBolts) {
        ctx.strokeStyle = bolt.color;
        ctx.lineWidth = bolt.width;
        ctx.shadowColor = bolt.color;
        ctx.shadowBlur = 15;
        ctx.globalAlpha = Math.min(1, bolt.life * 5);
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.stroke();

        // Glow duplicate
        ctx.lineWidth = bolt.width + 4;
        ctx.globalAlpha = Math.min(0.3, bolt.life * 2);
        ctx.beginPath();
        ctx.moveTo(bolt.points[0].x, bolt.points[0].y);
        for (let i = 1; i < bolt.points.length; i++) {
          ctx.lineTo(bolt.points[i].x, bolt.points[i].y);
        }
        ctx.stroke();
      }

      ctx.globalAlpha = 1;

      // Center energy orb
      const orbPulse = 8 + Math.sin(this.globalTime * 15) * 4;
      const orbGrad = ctx.createRadialGradient(px, py, 0, px, py, orbPulse);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.3, '#ffe600');
      orbGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = orbGrad;
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(px, py, orbPulse, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // --- Phase Dash speed lines ---
    if (this.phaseDashActive) {
      ctx.save();
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#8b5cf6';
      ctx.shadowBlur = 10;
      for (let i = 0; i < 8; i++) {
        const ly = py - 20 + Math.random() * 40;
        const lx = px - this.phaseDashDir * 20;
        const len = 20 + Math.random() * 40;
        ctx.globalAlpha = 0.3 + Math.random() * 0.4;
        ctx.beginPath();
        ctx.moveTo(lx, ly);
        ctx.lineTo(lx - this.phaseDashDir * len, ly);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // --- Render all particles ---
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, p.color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- Cooldown indicators near player feet ---
    const qCooldown = this.player.energy < this.empShieldEnergyCost ? this.empShieldMaxCooldown : this.empShieldCooldown;
    this._renderCooldownArc(ctx, px - 12, py + this.player.height / 2 + 8, 'Q', qCooldown, this.empShieldMaxCooldown, '#00f0ff', this.empShieldActive);
    this._renderCooldownArc(ctx, px, py + this.player.height / 2 + 8, 'E', this.phaseDashCooldown, this.phaseDashMaxCooldown, '#8b5cf6', this.phaseDashActive);
    this._renderCooldownArc(ctx, px + 12, py + this.player.height / 2 + 8, 'R', 
      this.player.energy < this.neonStormEnergyCost ? 1 : 0, 1, '#ffe600', this.neonStormActive);
  }

  _renderCooldownArc(ctx, x, y, label, cooldown, maxCooldown, color, isActive) {
    const radius = 4;
    const ready = cooldown <= 0;

    ctx.save();
    ctx.translate(x, y);

    if (isActive) {
      // Active indicator - pulsing glow
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.5 + Math.sin(this.globalTime * 10) * 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (ready) {
      // Ready indicator - bright
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cooldown arc
      const progress = 1 - (cooldown / maxCooldown);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(0, 0, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
      ctx.stroke();
    }

    // Label
    ctx.globalAlpha = ready && !isActive ? 0.6 : 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(label, 0, 0);

    ctx.restore();
  }

  canUseEMP() { return this.player.energy >= this.empShieldEnergyCost && this.empShieldCooldown <= 0 && !this.empShieldActive; }
  canUsePhase() { return this.phaseDashCooldown <= 0 && !this.phaseDashActive; }
  canUseNeonStorm() { return this.player.energy >= this.neonStormEnergyCost && !this.neonStormActive; }

  isPlayerIntangible() { return this.phaseDashActive; }
  isShieldActive() { return this.empShieldActive; }

  /** Returns damage area for Neon Storm (for external collision checking) */
  getStormDamageRadius() {
    if (!this.neonStormActive) return 0;
    return Math.min(this.stormShockwave, 250);
  }
}

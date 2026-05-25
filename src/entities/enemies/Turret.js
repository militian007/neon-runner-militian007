import Enemy from '../Enemy.js';

export default class Turret extends Enemy {
  constructor(x, y, direction) {
    super(x, y, 'turret');
    this.direction = direction || 'down';
    this.width = 32;
    this.height = 32;
    this.health = 40;
    this.maxHealth = 40;
    this.shootTimer = 0;
    this.shootInterval = 1.8;
    this.burstCount = 3;
    this.currentBurst = 0;
    this.burstTimer = 0;
    this.burstDelay = 0.12;
    this.detectionRange = 350;
    this.affectedByGravity = false;

    // Set initial and target angles based on mounting direction
    switch (this.direction) {
      case 'down': this.barrelAngle = Math.PI / 2; break;
      case 'up': this.barrelAngle = -Math.PI / 2; break;
      case 'left': this.barrelAngle = Math.PI; break;
      case 'right': this.barrelAngle = 0; break;
      default: this.barrelAngle = Math.PI / 2;
    }
    this.targetAngle = this.barrelAngle;

    this.scoreValue = 150;
    this.warningPulse = 0;
    this.muzzleFlash = 0;
    this.tracking = false;
    this.damage = 12;
  }

  update(dt, tiles, playerX, playerY) {
    if (!this.alive || this.dying) return super.update(dt, tiles, playerX, playerY);

    this.animTimer += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.warningPulse += dt * 4;
    if (this.muzzleFlash > 0) this.muzzleFlash -= dt;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dist = Math.sqrt((playerX - cx) ** 2 + (playerY - cy) ** 2);

    // Check if player is in the correct half-space (facing direction)
    let inHalfSpace = false;
    switch (this.direction) {
      case 'down':
        inHalfSpace = (playerY >= cy - 10); // allow slight overlay
        break;
      case 'up':
        inHalfSpace = (playerY <= cy + 10);
        break;
      case 'left':
        inHalfSpace = (playerX <= cx + 10);
        break;
      case 'right':
        inHalfSpace = (playerX >= cx - 10);
        break;
    }

    this.tracking = (dist < this.detectionRange) && inHalfSpace;

    // Track player with barrel or return to default angle
    if (this.tracking) {
      this.targetAngle = Math.atan2(playerY - cy, playerX - cx);
    } else {
      // Rotate back to default angle
      switch (this.direction) {
        case 'down': this.targetAngle = Math.PI / 2; break;
        case 'up': this.targetAngle = -Math.PI / 2; break;
        case 'left': this.targetAngle = Math.PI; break;
        case 'right': this.targetAngle = 0; break;
      }
    }

    // Smooth barrel rotation
    let diff = this.targetAngle - this.barrelAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.barrelAngle += diff * 4 * dt;

    // Burst shooting
    if (this.currentBurst > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.currentBurst--;
        this.burstTimer = this.burstDelay;
        this.muzzleFlash = 0.1;
        const speed = 220;
        const spread = (Math.random() - 0.5) * 0.1;
        const angle = this.barrelAngle + spread;
        const barrelLen = 18;
        return {
          x: cx + Math.cos(this.barrelAngle) * barrelLen,
          y: cy + Math.sin(this.barrelAngle) * barrelLen,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          damage: this.damage,
          color: '#ff4444'
        };
      }
      return null;
    }

    // Shoot timer
    if (this.tracking) {
      this.shootTimer += dt;
      if (this.shootTimer >= this.shootInterval) {
        this.shootTimer = 0;
        this.currentBurst = this.burstCount;
        this.burstTimer = 0; // fire first immediately
        this.muzzleFlash = 0.1;
        const speed = 220;
        const barrelLen = 18;
        return {
          x: cx + Math.cos(this.barrelAngle) * barrelLen,
          y: cy + Math.sin(this.barrelAngle) * barrelLen,
          vx: Math.cos(this.barrelAngle) * speed,
          vy: Math.sin(this.barrelAngle) * speed,
          damage: this.damage,
          color: '#ff4444'
        };
      }
    }

    return null;
  }

  render(ctx) {
    if (this.dying) { super.render(ctx); return; }
    if (!this.alive) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();

    // --- MOUNTING BASE ---
    // Base plate flush with surface
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff4444';

    let baseAngle = 0;
    switch (this.direction) {
      case 'down': baseAngle = 0; break;
      case 'up': baseAngle = Math.PI; break;
      case 'left': baseAngle = Math.PI / 2; break;
      case 'right': baseAngle = -Math.PI / 2; break;
    }

    // Circular base
    ctx.beginPath();
    ctx.arc(cx, cy, this.width / 2, 0, Math.PI * 2);
    const baseGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.width / 2);
    baseGrad.addColorStop(0, '#3a2a3e');
    baseGrad.addColorStop(0.7, '#2a1a2e');
    baseGrad.addColorStop(1, '#1a0a1e');
    ctx.fillStyle = baseGrad;
    ctx.fill();

    // Outer ring
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, this.width / 2 - 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Neon accent lines on base (cross pattern)
    ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
      ctx.lineTo(cx + Math.cos(a) * 13, cy + Math.sin(a) * 13);
      ctx.stroke();
    }

    // Warning light (pulsing)
    const wPulse = (Math.sin(this.warningPulse) * 0.5 + 0.5);
    ctx.shadowBlur = 10 * wPulse;
    ctx.shadowColor = this.tracking ? '#ff0000' : '#ff8800';
    ctx.fillStyle = this.tracking
      ? `rgba(255, 0, 0, ${0.4 + wPulse * 0.6})`
      : `rgba(255, 136, 0, ${0.3 + wPulse * 0.3})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // --- BARREL ---
    const barrelLen = 18;
    const barrelW = 5;
    const bx = cx + Math.cos(this.barrelAngle) * 6;
    const by = cy + Math.sin(this.barrelAngle) * 6;
    const bex = cx + Math.cos(this.barrelAngle) * barrelLen;
    const bey = cy + Math.sin(this.barrelAngle) * barrelLen;

    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff4444';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = barrelW;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bex, bey);
    ctx.stroke();

    // Barrel neon line
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bex, bey);
    ctx.stroke();

    // Muzzle flash
    if (this.muzzleFlash > 0) {
      const flashSize = 10 + Math.random() * 6;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff4444';
      const flashGrad = ctx.createRadialGradient(bex, bey, 0, bex, bey, flashSize);
      flashGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      flashGrad.addColorStop(0.3, 'rgba(255, 68, 68, 0.7)');
      flashGrad.addColorStop(1, 'rgba(255, 68, 68, 0)');
      ctx.fillStyle = flashGrad;
      ctx.beginPath();
      ctx.arc(bex, bey, flashSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- TARGETING LASER ---
    if (this.tracking) {
      ctx.shadowBlur = 2;
      ctx.shadowColor = '#ff0000';
      ctx.strokeStyle = `rgba(255, 0, 0, ${0.1 + wPulse * 0.15})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(bex, bey);
      ctx.lineTo(
        bex + Math.cos(this.barrelAngle) * this.detectionRange,
        bey + Math.sin(this.barrelAngle) * this.detectionRange
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hurt flash
    this.applyHurtTint(ctx);

    ctx.restore();
    this.drawHealthBar(ctx);
  }
}

import Enemy from '../Enemy.js';

export default class GlitchEntity extends Enemy {
  constructor(x, y) {
    super(x, y, 'glitch');
    this.width = 32;
    this.height = 40;
    this.health = 35;
    this.maxHealth = 35;
    this.affectedByGravity = false;
    this.teleportTimer = 0;
    this.teleportInterval = 3;
    this.teleportRange = 200;
    this.visible = true;
    this.glitchFrames = [];
    this.damage = 25;
    this.scoreValue = 250;
    this.distortionAmount = 0;
    this.teleportPhase = 'none'; // none, dissolve, reform
    this.teleportPhaseTimer = 0;
    this.targetTeleX = 0;
    this.targetTeleY = 0;
    this.pixels = [];
    this.colorShift = 0;
    this.noiseTimer = 0;
    this.floatAngle = 0;
    this.speed = 0.8;
  }

  update(dt, tiles, playerX, playerY) {
    if (!this.alive || this.dying) return super.update(dt, tiles, playerX, playerY);

    this.animTimer += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.colorShift += dt * 8;
    this.noiseTimer += dt * 15;
    this.floatAngle += dt * 2;

    // Update pixel scatter
    for (const p of this.pixels) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.pixels = this.pixels.filter(p => p.life > 0);

    // Teleport logic
    if (this.teleportPhase === 'none') {
      // Slowly float toward player
      const angle = this.angleTo(playerX, playerY);
      this.x += Math.cos(angle) * this.speed * 60 * dt;
      this.y += Math.sin(angle) * this.speed * 60 * dt;
      this.y += Math.sin(this.floatAngle) * 0.5; // gentle bob

      this.teleportTimer += dt;
      if (this.teleportTimer >= this.teleportInterval) {
        this.teleportTimer = 0;
        this.teleportPhase = 'dissolve';
        this.teleportPhaseTimer = 0.4;
        this.distortionAmount = 1;

        // Calculate target position near player
        const tAngle = Math.random() * Math.PI * 2;
        const tDist = 60 + Math.random() * 100;
        this.targetTeleX = playerX + Math.cos(tAngle) * tDist;
        this.targetTeleY = playerY + Math.sin(tAngle) * tDist;

        // Spawn scatter pixels
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        for (let i = 0; i < 30; i++) {
          const a = Math.random() * Math.PI * 2;
          const spd = 50 + Math.random() * 150;
          this.pixels.push({
            x: cx + (Math.random() - 0.5) * this.width,
            y: cy + (Math.random() - 0.5) * this.height,
            vx: Math.cos(a) * spd,
            vy: Math.sin(a) * spd,
            life: 0.4 + Math.random() * 0.3,
            size: 2 + Math.random() * 4,
            color: Math.random() > 0.5 ? '#ff00aa' : '#00ffff',
          });
        }
      }
    } else if (this.teleportPhase === 'dissolve') {
      this.teleportPhaseTimer -= dt;
      this.visible = false;
      if (this.teleportPhaseTimer <= 0) {
        this.x = this.targetTeleX - this.width / 2;
        this.y = this.targetTeleY - this.height / 2;
        this.teleportPhase = 'reform';
        this.teleportPhaseTimer = 0.3;

        // Reform pixels
        const cx = this.x + this.width / 2;
        const cy = this.y + this.height / 2;
        for (let i = 0; i < 20; i++) {
          const a = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * 60;
          this.pixels.push({
            x: cx + Math.cos(a) * dist,
            y: cy + Math.sin(a) * dist,
            vx: -Math.cos(a) * 100,
            vy: -Math.sin(a) * 100,
            life: 0.3,
            size: 2 + Math.random() * 3,
            color: Math.random() > 0.5 ? '#ff00aa' : '#00ffff',
          });
        }
      }
    } else if (this.teleportPhase === 'reform') {
      this.teleportPhaseTimer -= dt;
      this.distortionAmount = this.teleportPhaseTimer / 0.3;
      if (this.teleportPhaseTimer <= 0) {
        this.teleportPhase = 'none';
        this.visible = true;
        this.distortionAmount = 0;
      }
    }

    // Facing
    const cx = this.x + this.width / 2;
    this.facing = playerX > cx ? 1 : -1;

    return null;
  }

  render(ctx) {
    if (this.dying) { super.render(ctx); return; }
    if (!this.alive) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();

    // Render scatter pixels always
    for (const p of this.pixels) {
      const alpha = Math.max(0, p.life * 2);
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 6;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // Don't render body if invisible
    if (!this.visible && this.teleportPhase === 'dissolve') {
      ctx.restore();
      return;
    }

    // Reforming alpha
    let bodyAlpha = 1;
    if (this.teleportPhase === 'reform') {
      bodyAlpha = 1 - this.distortionAmount;
    }

    ctx.globalAlpha = bodyAlpha * 0.85;

    // Static/noise background overlay
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00aa';

    // VHS tracking error - draw body in horizontal slices
    const sliceCount = 10;
    const sliceH = this.height / sliceCount;
    const colorA = Math.sin(this.colorShift) > 0 ? '#ff00aa' : '#00ffff';
    const colorB = Math.sin(this.colorShift) > 0 ? '#00ffff' : '#ff00aa';

    for (let i = 0; i < sliceCount; i++) {
      const glitchOffset = this.distortionAmount > 0
        ? (Math.random() - 0.5) * 16 * this.distortionAmount
        : Math.sin(this.noiseTimer + i * 2) * (2 + Math.sin(this.animTimer * 5 + i) * 3);

      const sy = this.y + i * sliceH;
      const sx = this.x + glitchOffset;

      // Humanoid silhouette slice
      const sliceWidth = this.getHumanoidWidth(i / sliceCount) * this.width;
      const sliceCx = sx + this.width / 2;

      // Main body slice
      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.globalAlpha = bodyAlpha * (0.4 + Math.random() * 0.3);
      ctx.fillRect(sliceCx - sliceWidth / 2, sy, sliceWidth, sliceH + 1);

      // Inner darker slice
      ctx.fillStyle = '#2a1a2e';
      ctx.globalAlpha = bodyAlpha * 0.5;
      ctx.fillRect(sliceCx - sliceWidth / 2 + 2, sy, sliceWidth - 4, sliceH + 1);

      // Occasional bright noise pixel in slice
      if (Math.random() > 0.7) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = bodyAlpha * 0.6;
        const nx = sliceCx - sliceWidth / 2 + Math.random() * sliceWidth;
        ctx.fillRect(nx, sy, 2 + Math.random() * 4, 2);
      }
    }

    ctx.globalAlpha = bodyAlpha;

    // Eyes (two dots in head area)
    const eyeY = this.y + this.height * 0.15;
    const eyeGlow = 0.6 + Math.sin(this.animTimer * 6) * 0.4;
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#00ffff';
    ctx.fillStyle = `rgba(0, 255, 255, ${eyeGlow})`;
    ctx.beginPath();
    ctx.arc(cx - 5, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 5, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Semi-transparent noise overlay
    ctx.globalAlpha = bodyAlpha * 0.15;
    for (let i = 0; i < 15; i++) {
      const nx = this.x + Math.random() * this.width;
      const ny = this.y + Math.random() * this.height;
      ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#000000';
      ctx.fillRect(nx, ny, 1 + Math.random() * 3, 1);
    }

    ctx.globalAlpha = 1;

    // Hurt flash
    this.applyHurtTint(ctx);

    ctx.restore();
    this.drawHealthBar(ctx);
  }

  getHumanoidWidth(ratio) {
    // Returns width factor (0-1) for a humanoid silhouette at given height ratio
    if (ratio < 0.15) return 0.4; // head top
    if (ratio < 0.25) return 0.5; // head
    if (ratio < 0.3) return 0.3;  // neck
    if (ratio < 0.5) return 0.7;  // torso
    if (ratio < 0.6) return 0.8;  // shoulders/arms
    if (ratio < 0.7) return 0.5;  // waist
    if (ratio < 0.85) return 0.6; // legs
    return 0.5; // feet
  }
}

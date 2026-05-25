import Enemy from '../Enemy.js';

export default class MechSoldier extends Enemy {
  constructor(x, y) {
    super(x, y, 'mech');
    this.width = 44;
    this.height = 56;
    this.health = 80;
    this.maxHealth = 80;
    this.speed = 1.2;
    this.damage = 30;
    this.shootTimer = 0;
    this.shootInterval = 2;
    this.meleeRange = 60;
    this.detectionRange = 300;
    this.state = 'patrol';
    this.meleeTimer = 0;
    this.meleeCooldown = 1.5;
    this.scoreValue = 300;
    this.legTimer = 0;
    this.armAngle = 0;
    this.patrolDir = 1;
    this.patrolRange = 120;
    this.startX = x;
    this.cannonGlow = 0;
    this.punchAnim = 0;
    this.dustParticles = [];
    this.shoulderPulse = 0;
  }

  update(dt, tiles, playerX, playerY) {
    if (!this.alive || this.dying) return super.update(dt, tiles, playerX, playerY);

    this.animTimer += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.shoulderPulse += dt * 3;

    // Dust particles
    for (const p of this.dustParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.dustParticles = this.dustParticles.filter(p => p.life > 0);

    if (this.punchAnim > 0) this.punchAnim -= dt * 4;
    if (this.cannonGlow > 0) this.cannonGlow -= dt * 3;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dist = this.distanceTo(playerX, playerY);
    this.facing = playerX > cx ? 1 : -1;

    let projectile = null;

    if (dist < this.detectionRange) {
      this.state = 'tracking';

      // Move toward player (slowly)
      const dir = playerX > cx ? 1 : -1;
      if (dist > this.meleeRange) {
        this.vx = dir * this.speed * 60;
        this.legTimer += dt * this.speed * 3;

        // Footstep dust
        if (this.grounded && Math.sin(this.legTimer) > 0.9) {
          this.dustParticles.push({
            x: cx + dir * -10,
            y: this.y + this.height,
            vx: (Math.random() - 0.5) * 40,
            vy: -10 - Math.random() * 30,
            life: 0.3 + Math.random() * 0.2,
            size: 2 + Math.random() * 3,
          });
        }
      } else {
        this.vx = 0;
      }

      // Check for edge/wall
      if (this.isEdgeAhead(tiles, dir) || this.isWallAhead(tiles, dir)) {
        this.vx = 0;
      }

      // Melee attack
      if (dist < this.meleeRange) {
        this.meleeTimer += dt;
        if (this.meleeTimer >= this.meleeCooldown) {
          this.meleeTimer = 0;
          this.punchAnim = 1;
          // Melee doesn't return a projectile, handled by collision
        }
      }

      // Ranged attack
      if (dist > this.meleeRange && dist < this.detectionRange) {
        this.shootTimer += dt;
        if (this.shootTimer >= this.shootInterval) {
          this.shootTimer = 0;
          this.cannonGlow = 1;
          const angle = this.angleTo(playerX, playerY);
          const speed = 200;
          projectile = {
            x: cx + this.facing * 24,
            y: cy - 6,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage: 15,
            color: '#ff00aa',
          };
        }
      }
    } else {
      // Patrol
      this.state = 'patrol';
      this.vx = this.patrolDir * this.speed * 40;
      this.legTimer += dt * this.speed * 2;
      this.facing = this.patrolDir;

      if (this.x > this.startX + this.patrolRange) this.patrolDir = -1;
      else if (this.x < this.startX) this.patrolDir = 1;

      if (this.isEdgeAhead(tiles, this.patrolDir) || this.isWallAhead(tiles, this.patrolDir)) {
        this.patrolDir *= -1;
      }
    }

    super.update(dt, tiles, playerX, playerY);
    return projectile;
  }

  render(ctx) {
    if (this.dying) { super.render(ctx); return; }
    if (!this.alive) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();

    // Dust particles
    for (const p of this.dustParticles) {
      const alpha = p.life / 0.5;
      ctx.fillStyle = `rgba(100, 90, 110, ${alpha * 0.5})`;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }

    // --- LEGS ---
    const legSwing = Math.sin(this.legTimer) * 0.4;
    const legBaseY = this.y + this.height - 20;
    const thighLen = 12;
    const shinLen = 14;

    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#444';

    // Left leg
    const ll_a = -0.2 + legSwing;
    const ll_kx = cx - 10 + Math.sin(ll_a) * thighLen;
    const ll_ky = legBaseY + Math.cos(ll_a) * thighLen;
    ctx.beginPath();
    ctx.moveTo(cx - 10, legBaseY);
    ctx.lineTo(ll_kx, ll_ky);
    ctx.lineTo(ll_kx + Math.sin(ll_a + 0.3) * shinLen, ll_ky + Math.cos(ll_a + 0.3) * shinLen);
    ctx.stroke();

    // Right leg
    const rl_a = -0.2 - legSwing;
    const rl_kx = cx + 10 + Math.sin(rl_a) * thighLen;
    const rl_ky = legBaseY + Math.cos(rl_a) * thighLen;
    ctx.beginPath();
    ctx.moveTo(cx + 10, legBaseY);
    ctx.lineTo(rl_kx, rl_ky);
    ctx.lineTo(rl_kx + Math.sin(rl_a + 0.3) * shinLen, rl_ky + Math.cos(rl_a + 0.3) * shinLen);
    ctx.stroke();

    // Hydraulic joint glow
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff00aa';
    ctx.fillStyle = '#ff00aa';
    for (const [jx, jy] of [[ll_kx, ll_ky], [rl_kx, rl_ky]]) {
      ctx.beginPath();
      ctx.arc(jx, jy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- BODY (angular armor) ---
    const bodyX = cx - this.width / 2 + 2;
    const bodyY = this.y + 12;
    const bodyW = this.width - 4;
    const bodyH = this.height - 30;

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00aa';

    // Main body
    ctx.beginPath();
    ctx.moveTo(bodyX + 4, bodyY);
    ctx.lineTo(bodyX + bodyW - 4, bodyY);
    ctx.lineTo(bodyX + bodyW, bodyY + bodyH * 0.3);
    ctx.lineTo(bodyX + bodyW - 2, bodyY + bodyH);
    ctx.lineTo(bodyX + 2, bodyY + bodyH);
    ctx.lineTo(bodyX, bodyY + bodyH * 0.3);
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(bodyX, bodyY, bodyX + bodyW, bodyY + bodyH);
    bodyGrad.addColorStop(0, '#2a1a2e');
    bodyGrad.addColorStop(0.5, '#3a2a3e');
    bodyGrad.addColorStop(1, '#2a1a2e');
    ctx.fillStyle = bodyGrad;
    ctx.fill();
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Armor plate lines
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bodyX + 4, bodyY + bodyH * 0.35);
    ctx.lineTo(bodyX + bodyW - 4, bodyY + bodyH * 0.35);
    ctx.moveTo(bodyX + 4, bodyY + bodyH * 0.65);
    ctx.lineTo(bodyX + bodyW - 4, bodyY + bodyH * 0.65);
    ctx.stroke();

    // Energy lines between plates
    ctx.shadowBlur = 6;
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, bodyY + bodyH * 0.35);
    ctx.lineTo(cx - 8, bodyY + bodyH * 0.65);
    ctx.moveTo(cx + 8, bodyY + bodyH * 0.35);
    ctx.lineTo(cx + 8, bodyY + bodyH * 0.65);
    ctx.stroke();

    // --- SHOULDER LIGHTS ---
    const spulse = 0.5 + Math.sin(this.shoulderPulse) * 0.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00aa';
    ctx.fillStyle = `rgba(255, 0, 170, ${spulse})`;
    ctx.beginPath();
    ctx.arc(bodyX + 3, bodyY + 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bodyX + bodyW - 3, bodyY + 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // --- ARMS ---
    // Cannon arm (on facing side)
    const cannonX = cx + this.facing * (bodyW / 2 + 4);
    const cannonY = bodyY + bodyH * 0.3;
    const cannonLen = 20;

    // Cannon body
    ctx.shadowBlur = this.cannonGlow > 0 ? 16 : 6;
    ctx.shadowColor = this.cannonGlow > 0 ? '#ff4444' : '#ff00aa';
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cannonX, cannonY);
    ctx.lineTo(cannonX + this.facing * cannonLen, cannonY + this.armAngle);
    ctx.stroke();

    // Cannon neon accent
    ctx.strokeStyle = this.cannonGlow > 0 ? '#ff4444' : '#ff00aa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cannonX, cannonY);
    ctx.lineTo(cannonX + this.facing * cannonLen, cannonY + this.armAngle);
    ctx.stroke();

    // Cannon glow
    if (this.cannonGlow > 0) {
      const muzzleX = cannonX + this.facing * cannonLen;
      const glowGrad = ctx.createRadialGradient(muzzleX, cannonY, 0, muzzleX, cannonY, 12);
      glowGrad.addColorStop(0, `rgba(255, 68, 68, ${this.cannonGlow})`);
      glowGrad.addColorStop(1, 'rgba(255, 68, 68, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(muzzleX, cannonY, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fist arm (opposite side)
    const fistX = cx - this.facing * (bodyW / 2 + 4);
    const fistY = bodyY + bodyH * 0.35;
    const punchExtend = this.punchAnim * 15 * this.facing;

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(fistX, fistY);
    ctx.lineTo(fistX - this.facing * 12 + punchExtend, fistY + 8);
    ctx.stroke();

    // Fist
    ctx.shadowBlur = this.punchAnim > 0 ? 14 : 6;
    ctx.shadowColor = '#ff00aa';
    ctx.fillStyle = '#3a2a3e';
    ctx.beginPath();
    ctx.arc(fistX - this.facing * 12 + punchExtend, fistY + 10, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // --- HEAD ---
    const headW = 18;
    const headH = 14;
    const headX = cx - headW / 2;
    const headY = this.y + 2;

    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff4444';
    ctx.fillStyle = '#2a1a2e';
    ctx.beginPath();
    ctx.roundRect(headX, headY, headW, headH, 2);
    ctx.fill();
    ctx.strokeStyle = '#ff4444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Visor slit
    const visorGlow = 0.6 + Math.sin(this.animTimer * 4) * 0.4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff4444';
    ctx.fillStyle = `rgba(255, 120, 50, ${visorGlow})`;
    ctx.fillRect(headX + 3, headY + 5, headW - 6, 3);

    // Hurt flash
    this.applyHurtTint(ctx);

    ctx.restore();
    this.drawHealthBar(ctx);
  }
}

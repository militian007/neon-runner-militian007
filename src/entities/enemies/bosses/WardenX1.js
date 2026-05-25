// ============================================
// NEON RUNNER — WardenX1.js
// Zone 1 Boss - Heavily armored security warden
// Multi-phase boss: Phase 1 (stomp & gun), Phase 2 (charge & laser sweep)
// ============================================

import Enemy from '../../Enemy.js';

export default class WardenX1 extends Enemy {
  constructor(x, y) {
    super(x, y, 'boss_warden');
    this.width = 70;
    this.height = 90;
    this.health = 450;
    this.maxHealth = 450;
    this.speed = 1.0;
    this.damage = 25;
    
    // AI states
    this.bossState = 'idle'; // idle, stomp, shoot, charge, laser_sweep
    this.stateTimer = 2.0;
    this.phase = 1;
    this.shieldActive = false;
    
    // Animation/Aesthetic states
    this.stompAnim = 0;
    this.laserCharge = 0;
    this.chargeDir = -1;
    this.eyeGlow = 0;
    this.laserAngle = Math.PI;
    
    this.affectedByGravity = true;
    this.scoreValue = 1500;
  }

  update(dt, tiles, playerX, playerY) {
    // Standard dying/gravity logic
    if (this.dying || !this.alive) {
      return super.update(dt, tiles, playerX, playerY);
    }

    this.animTimer += dt;
    this.eyeGlow += dt * 3;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    // Phase transition check
    if (this.phase === 1 && this.health < this.maxHealth * 0.5) {
      this.phase = 2;
      this.speed = 1.8;
      this.bossState = 'laser_sweep';
      this.stateTimer = 4.0;
      this.shieldActive = true; // Temporary protection during transition
    }

    // AI state machine
    this.stateTimer -= dt;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    this.facing = playerX < cx ? -1 : 1;

    let projToSpawn = null;

    if (this.stateTimer <= 0) {
      this.shieldActive = false;
      this._selectNextState(playerX);
    }

    switch (this.bossState) {
      case 'idle':
      case 'shoot':
        // Walk towards center of the arena (X = 900)
        const targetCenter = 900;
        const bossCenterX = this.x + this.width / 2;
        const distToCenter = targetCenter - bossCenterX;
        if (Math.abs(distToCenter) > 20) {
          this.vx = Math.sign(distToCenter) * this.speed * 110;
        } else {
          this.vx = 0;
        }

        // Spawns bursts of heavy tracking projectiles in shoot state
        if (this.bossState === 'shoot' && Math.sin(this.animTimer * 12) > 0.8 && Math.random() < 0.3) {
          const angle = Math.atan2(playerY - cy, playerX - cx);
          projToSpawn = {
            x: cx + this.facing * 35,
            y: cy - 10,
            vx: Math.cos(angle) * 240,
            vy: Math.sin(angle) * 240,
            damage: 12,
            color: '#00f0ff'
          };
        }
        break;

      case 'stomp':
        // Jumps up and slams down causing horizontal ground shocks
        if (this.stateTimer > 1.2) {
          if (this.grounded) {
            this.vy = -380;
            this.grounded = false;
          }
        } else if (!this.grounded) {
          this.vy += 800 * dt; // fast drop
        } else if (this.stateTimer > 0 && this.stateTimer < 0.2) {
          // Shockwave spawn on stomp land
          this.stateTimer = -1; // Force next state
          projToSpawn = [
            { x: cx - 20, y: this.y + this.height - 20, vx: -250, vy: 0, damage: 15, color: '#ff0055' },
            { x: cx + 20, y: this.y + this.height - 20, vx: 250, vy: 0, damage: 15, color: '#ff0055' }
          ];
        }
        break;

      case 'charge':
        // Fast horizontal charge across the arena
        this.vx = this.chargeDir * this.speed * 180;
        this.resolveTileCollisionsX(tiles);
        
        // Wall collide stops charge
        if (Math.abs(this.vx) < 1) {
          this.stateTimer = 0; // stop charge
        }
        break;

      case 'laser_sweep':
        this.vx = 0;
        this.laserCharge = Math.min(1, this.laserCharge + dt * 2);
        
        // Sweep laser beam downwards/upwards
        if (this.laserCharge >= 1.0) {
          this.laserAngle += this.facing * dt * 0.8;
          if (Math.random() < 0.1) {
            projToSpawn = {
              x: cx + Math.cos(this.laserAngle) * 80,
              y: cy + Math.sin(this.laserAngle) * 80,
              vx: Math.cos(this.laserAngle) * 300,
              vy: Math.sin(this.laserAngle) * 300,
              damage: 20,
              color: '#ff00aa'
            };
          }
        }
        break;
    }

    // Apply gravity
    if (this.affectedByGravity && !this.grounded) {
      this.vy += 900 * dt;
      if (this.vy > 650) this.vy = 650;
    }
    
    // Apply movement
    this.x += this.vx * dt;
    this.resolveTileCollisionsX(tiles);

    this.y += this.vy * dt;
    this.grounded = false;
    this.resolveTileCollisionsY(tiles);

    return projToSpawn;
  }

  _selectNextState(playerX) {
    const states = this.phase === 1 ? 
      ['idle', 'stomp', 'shoot'] : 
      ['idle', 'stomp', 'charge', 'laser_sweep'];
    
    const next = states[Math.floor(Math.random() * states.length)];
    this.bossState = next;
    
    if (next === 'idle') this.stateTimer = 1.0 + Math.random() * 0.8;
    else if (next === 'stomp') this.stateTimer = 2.0;
    else if (next === 'shoot') this.stateTimer = 1.8;
    else if (next === 'charge') {
      this.stateTimer = 1.5;
      this.chargeDir = playerX < (this.x + this.width/2) ? -1 : 1;
    } else if (next === 'laser_sweep') {
      this.stateTimer = 3.5;
      this.laserCharge = 0;
      this.laserAngle = this.facing === 1 ? 0 : Math.PI;
    }
  }

  render(ctx) {
    if (!this.alive) return;
    
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const isHurt = this.hurtTimer > 0;
    
    ctx.save();
    
    // Strobe / warning overlay if boss is charging or stomping
    if (this.bossState === 'charge' || this.bossState === 'stomp') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0055';
    } else {
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f0ff';
    }

    // Draw heavy metallic mech legs
    ctx.fillStyle = '#1b1b2f';
    ctx.strokeStyle = '#4e4e6a';
    ctx.lineWidth = 3;
    
    // Left Leg
    ctx.fillRect(this.x + 12, this.y + this.height - 25, 14, 25);
    ctx.strokeRect(this.x + 12, this.y + this.height - 25, 14, 25);
    // Right Leg
    ctx.fillRect(this.x + this.width - 26, this.y + this.height - 25, 14, 25);
    ctx.strokeRect(this.x + this.width - 26, this.y + this.height - 25, 14, 25);

    // Torso block
    const fillStyle = isHurt ? '#ff4444' : '#141424';
    ctx.fillStyle = fillStyle;
    ctx.fillRect(this.x, this.y + 15, this.width, 50);
    ctx.strokeRect(this.x, this.y + 15, this.width, 50);

    // Heavy shoulders
    ctx.fillStyle = '#22223b';
    ctx.fillRect(this.x - 6, this.y + 12, 14, 18);
    ctx.strokeRect(this.x - 6, this.y + 12, 14, 18);
    ctx.fillRect(this.x + this.width - 8, this.y + 12, 14, 18);
    ctx.strokeRect(this.x + this.width - 8, this.y + 12, 14, 18);

    // Gun arm (right or left depending on facing)
    ctx.save();
    ctx.translate(cx + this.facing * 20, cy);
    ctx.fillStyle = '#1b1b2f';
    ctx.fillRect(-8, -8, 25 * this.facing, 16);
    ctx.strokeRect(-8, -8, 25 * this.facing, 16);
    
    // Gun nozzle glow
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(17 * this.facing, -3, 3 * this.facing, 6);
    ctx.restore();

    // Head / Eye slot visor
    ctx.fillStyle = '#1b1b2f';
    ctx.fillRect(this.x + 15, this.y - 12, 40, 28);
    ctx.strokeRect(this.x + 15, this.y - 12, 40, 28);

    // Visor LED line
    const visorColor = this.phase === 2 ? '#ff0055' : '#00f0ff';
    ctx.shadowColor = visorColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = visorColor;
    const pulseOffset = Math.sin(this.eyeGlow) * 10;
    ctx.fillRect(this.x + 22 + pulseOffset + 6, this.y - 4, 12, 4);

    // Render Laser sweep beam
    if (this.bossState === 'laser_sweep' && this.laserCharge >= 1.0) {
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 8 + Math.sin(this.animTimer * 30) * 2;
      
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(this.laserAngle) * 500, cy + Math.sin(this.laserAngle) * 500);
      ctx.stroke();
      
      // Core beam white
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // Health Bar HUD above boss
    this._renderBossHealthBar(ctx, 'WARDEN X-1');

    ctx.restore();
  }

  _renderBossHealthBar(ctx, name) {
    const bx = this.x + this.width / 2 - 60;
    const by = this.y - 25;
    const bw = 120;
    const bh = 7;
    
    ctx.save();
    // Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name, this.x + this.width / 2, by - 6);

    // Bar background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, bw, bh);
    
    // Fill
    const fillRatio = Math.max(0, this.health / this.maxHealth);
    const barColor = this.phase === 2 ? '#ff0055' : '#00f0ff';
    ctx.fillStyle = barColor;
    ctx.shadowColor = barColor;
    ctx.shadowBlur = 8;
    ctx.fillRect(bx + 1, by + 1, (bw - 2) * fillRatio, bh - 2);
    ctx.restore();
  }
}

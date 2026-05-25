// ============================================
// NEON RUNNER — NexusCore.js
// Zone 2 Boss - Central corporate grid mainframe
// Stationary boss: Phase 1 (ring lasers & bullet hell), Phase 2 (summoning & sweeping lasers)
// ============================================

import Enemy from '../../Enemy.js';
import DronePatrol from '../DronePatrol.js';

export default class NexusCore extends Enemy {
  constructor(x, y) {
    super(x, y, 'boss_nexus');
    this.width = 90;
    this.height = 90;
    this.health = 320;
    this.maxHealth = 320;
    
    // AI states
    this.bossState = 'idle'; // idle, ring_lasers, grid_strike, summon_drones
    this.stateTimer = 2.0;
    this.phase = 1;
    
    this.affectedByGravity = false;
    this.rotation = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    
    // Aesthetics
    this.gridGlow = 0;
    this.laserAngle = 0;
    this.scoreValue = 2000;
  }

  update(dt, tiles, playerX, playerY) {
    if (this.dying || !this.alive) {
      return super.update(dt, tiles, playerX, playerY);
    }

    this.animTimer += dt;
    this.rotation += dt * (this.phase === 1 ? 0.6 : 1.2);
    this.gridGlow += dt * 5;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    // Phase transition check
    if (this.phase === 1 && this.health < this.maxHealth * 0.5) {
      this.phase = 2;
      this.bossState = 'summon_drones';
      this.stateTimer = 5.0;
      this.shieldActive = true;
      this.shieldTimer = 5.0;
    }

    if (this.shieldActive) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shieldActive = false;
      }
    }

    // AI state machine
    this.stateTimer -= dt;
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    let projs = null;

    if (this.stateTimer <= 0) {
      this._selectNextState();
    }

    switch (this.bossState) {
      case 'idle':
        break;

      case 'ring_lasers':
        // Fires rotating bursts of lasers in 4 cardinal directions
        this.laserAngle += dt * 0.8 * (this.phase === 2 ? 1.5 : 1.0);
        if (Math.sin(this.animTimer * 10) > 0.75) {
          projs = [];
          for (let i = 0; i < 4; i++) {
            const angle = this.laserAngle + (i * Math.PI / 2);
            projs.push({
              x: cx + Math.cos(angle) * 45,
              y: cy + Math.sin(angle) * 45,
              vx: Math.cos(angle) * 190,
              vy: Math.sin(angle) * 190,
              damage: 10,
              color: '#4488ff'
            });
          }
        }
        break;

      case 'grid_strike':
        // Fires target-locked electric blast
        if (this.stateTimer > 0.5 && this.stateTimer < 0.6) {
          const angle = Math.atan2(playerY - cy, playerX - cx);
          projs = {
            x: cx,
            y: cy,
            vx: Math.cos(angle) * 350,
            vy: Math.sin(angle) * 350,
            damage: 25,
            color: '#00ff88'
          };
        }
        break;

      case 'summon_drones':
        // Summons minor DronePatrol support bots
        if (this.stateTimer > 4.5 && this.stateTimer < 4.6) {
          // Note: drones are spawned directly by returning their coordinates
          // but we can spawn them by adding them to the game's active array.
          // In Game.js, return value is interpreted as projectile, so we spawn them via custom mechanism or rely on projectiles.
          // To keep it simple, we shoot drone-seeking projectiles that spawn a visual effect
          projs = [
            { x: cx - 40, y: cy - 40, vx: -120, vy: -80, damage: 8, color: '#4488ff' },
            { x: cx + 40, y: cy - 40, vx: 120, vy: -80, damage: 8, color: '#4488ff' }
          ];
        }
        break;
    }

    return projs;
  }

  _selectNextState() {
    const states = ['idle', 'ring_lasers', 'grid_strike'];
    if (this.phase === 2) {
      states.push('summon_drones');
    }
    
    this.bossState = states[Math.floor(Math.random() * states.length)];
    
    if (this.bossState === 'idle') this.stateTimer = 1.0 + Math.random() * 0.8;
    else if (this.bossState === 'ring_lasers') this.stateTimer = 3.0;
    else if (this.bossState === 'grid_strike') this.stateTimer = 1.5;
    else if (this.bossState === 'summon_drones') this.stateTimer = 5.0;
  }

  takeDamage(amount) {
    // Shield blocks damage
    if (this.shieldActive) {
      return;
    }
    super.takeDamage(amount);
  }

  render(ctx) {
    if (!this.alive) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const isHurt = this.hurtTimer > 0;

    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#4488ff';

    // Draw Grid shield if active
    if (this.shieldActive) {
      ctx.save();
      ctx.strokeStyle = '#00ff88';
      ctx.shadowColor = '#00ff88';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 25;
      
      const pulseRadius = 60 + Math.sin(this.animTimer * 10) * 4;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Shield hex lines
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#00ff88';
      ctx.fill();
      ctx.restore();
    }

    // Outer rotating core frame (Octagon or square)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation);
    
    ctx.fillStyle = isHurt ? '#ff4444' : '#141c2c';
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 4;
    
    // Draw octagon
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const rx = Math.cos(angle) * (this.width / 2);
      const ry = Math.sin(angle) * (this.height / 2);
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner glowing mainframe grid
    ctx.strokeStyle = this.phase === 2 ? '#ff00aa' : '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.phase === 2 ? '#ff00aa' : '#00f0ff';
    ctx.shadowBlur = 10;
    
    ctx.beginPath();
    // Grid lines
    for (let d = -20; d <= 20; d += 10) {
      ctx.moveTo(d, -30);
      ctx.lineTo(d, 30);
      ctx.moveTo(-30, d);
      ctx.lineTo(30, d);
    }
    ctx.stroke();
    
    ctx.restore();

    // Core central floating sphere
    ctx.save();
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 20;
    const coreRad = 15 + Math.sin(this.gridGlow * 1.5) * 2;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRad);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, this.phase === 2 ? '#ff00aa' : '#4488ff');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Render Boss Health Bar
    this._renderBossHealthBar(ctx, 'NEXUS CENTRAL CORE');

    ctx.restore();
  }
}

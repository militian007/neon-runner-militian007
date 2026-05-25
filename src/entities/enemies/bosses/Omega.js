// ============================================
// NEON RUNNER — Omega.js
// Zone 4 Final Boss - Omega Singularity Mainframe
// Ultimate boss: Phase 1 (energy rings & lightning strikes), Phase 2 (giga beams & screen sweeps)
// ============================================

import Enemy from '../../Enemy.js';

export default class Omega extends Enemy {
  constructor(x, y) {
    super(x, y, 'boss_omega');
    this.width = 110;
    this.height = 110;
    this.health = 500;
    this.maxHealth = 500;
    
    // AI states
    this.bossState = 'idle'; // idle, singularity_ring, storm_strikes, giga_beam
    this.stateTimer = 2.5;
    this.phase = 1;
    
    this.affectedByGravity = false;
    
    // Visual effects states
    this.rotation1 = 0;
    this.rotation2 = 0;
    this.beamCharge = 0;
    this.pulseFactor = 0;
    
    this.lightningStrikes = [];
    this.scoreValue = 5000;
  }

  update(dt, tiles, playerX, playerY) {
    if (this.dying || !this.alive) {
      return super.update(dt, tiles, playerX, playerY);
    }

    this.animTimer += dt;
    this.rotation1 += dt * (this.phase === 1 ? 0.8 : 1.5);
    this.rotation2 -= dt * (this.phase === 1 ? 0.4 : 0.9);
    
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    
    this.pulseFactor = 1.0 + Math.sin(this.animTimer * 6) * 0.15;

    // Phase transition check
    if (this.phase === 1 && this.health < this.maxHealth * 0.5) {
      this.phase = 2;
      this.bossState = 'giga_beam';
      this.stateTimer = 5.0;
      this.beamCharge = 0;
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

      case 'singularity_ring':
        // Fires expanding helix of 6 purple energy projectiles
        if (Math.sin(this.animTimer * 12) > 0.8 && Math.random() < 0.25) {
          projs = [];
          const count = 6;
          for (let i = 0; i < count; i++) {
            const angle = (i * Math.PI * 2) / count + (this.animTimer * 0.8);
            projs.push({
              x: cx + Math.cos(angle) * 60,
              y: cy + Math.sin(angle) * 60,
              vx: Math.cos(angle) * 220,
              vy: Math.sin(angle) * 220,
              damage: 10,
              color: '#8b5cf6'
            });
          }
        }
        break;

      case 'storm_strikes':
        // Spawns vertical lightning beams at random locations near player
        if (Math.sin(this.animTimer * 8) > 0.75) {
          const strikeX = playerX + (Math.random() - 0.5) * 320;
          this.lightningStrikes.push({
            x: strikeX,
            timer: 0.8, // Warning duration
            fired: false,
            width: 30
          });
        }
        break;

      case 'giga_beam':
        // Charge a massive laser sweep that deals heavy damage
        this.beamCharge = Math.min(1, this.beamCharge + dt * 0.5);
        if (this.beamCharge >= 1.0) {
          // Fire!
          if (Math.random() < 0.15) {
            projs = {
              x: cx - 60,
              y: cy + (Math.random() - 0.5) * 80,
              vx: -400,
              vy: (Math.random() - 0.5) * 150,
              damage: 25,
              color: '#ff8800'
            };
          }
        }
        break;
    }

    // Process lightning warnings/strikes
    for (let i = this.lightningStrikes.length - 1; i >= 0; i--) {
      const strike = this.lightningStrikes[i];
      strike.timer -= dt;
      
      if (strike.timer <= 0) {
        if (!strike.fired) {
          strike.fired = true;
          strike.timer = 0.25; // Hold laser active
          
          // Spawn actual damage projectile at the strike coordinates
          // Since lightning is vertical, we create a falling projectile
          projs = projs || [];
          if (!Array.isArray(projs)) projs = [projs];
          projs.push({
            x: strike.x,
            y: 50,
            vx: 0,
            vy: 600,
            damage: 20,
            color: '#ffaa00'
          });
        } else {
          // Done, remove
          this.lightningStrikes.splice(i, 1);
        }
      }
    }

    return projs;
  }

  _selectNextState() {
    const states = ['idle', 'singularity_ring', 'storm_strikes'];
    if (this.phase === 2) {
      states.push('giga_beam');
    }
    
    this.bossState = states[Math.floor(Math.random() * states.length)];
    this.beamCharge = 0;

    if (this.bossState === 'idle') this.stateTimer = 1.0 + Math.random() * 0.6;
    else if (this.bossState === 'singularity_ring') this.stateTimer = 3.0;
    else if (this.bossState === 'storm_strikes') this.stateTimer = 3.5;
    else if (this.bossState === 'giga_beam') this.stateTimer = 4.0;
  }

  render(ctx) {
    if (!this.alive) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const isHurt = this.hurtTimer > 0;

    ctx.save();
    
    // Draw lightning strikes indicator or lasers
    for (const strike of this.lightningStrikes) {
      ctx.save();
      if (!strike.fired) {
        // Red warning laser line
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(strike.x, 0);
        ctx.lineTo(strike.x, 800);
        ctx.stroke();
      } else {
        // Massive lightning blast
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#ffaa00';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = strike.width;
        ctx.beginPath();
        ctx.moveTo(strike.x, 0);
        ctx.lineTo(strike.x, 800);
        ctx.stroke();
        
        ctx.strokeStyle = '#ffcc00';
        ctx.lineWidth = strike.width * 0.5;
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff8800';

    // RENDER OUTER FLOATING SINGULARITY RINGS
    
    // Ring 1 (outer)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation1);
    ctx.strokeStyle = '#ff8800';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.width / 2 * this.pulseFactor, this.height / 3 * this.pulseFactor, 0, 0, Math.PI * 2);
    ctx.stroke();
    
    // Outer teeth nodes
    ctx.fillStyle = '#ff8800';
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      ctx.fillRect(Math.cos(angle) * (this.width / 2 * this.pulseFactor) - 6, Math.sin(angle) * (this.height / 3 * this.pulseFactor) - 6, 12, 12);
    }
    ctx.restore();

    // Ring 2 (inner, counter-rotating)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.rotation2);
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, this.width / 2.7 * this.pulseFactor, this.height / 2.7 * this.pulseFactor, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Center Core Singularity
    ctx.save();
    const coreRad = 26 + Math.sin(this.animTimer * 8) * 3;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, coreRad);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.3, isHurt ? '#ff4444' : '#ff8800');
    grad.addColorStop(0.7, '#8b5cf6');
    grad.addColorStop(1, 'transparent');
    
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, coreRad, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Giga beam charging visual
    if (this.bossState === 'giga_beam') {
      ctx.save();
      const chargeScale = this.beamCharge;
      ctx.shadowBlur = 30;
      ctx.shadowColor = '#ff8800';
      ctx.fillStyle = '#ffaa00';
      ctx.globalAlpha = 0.3 + chargeScale * 0.7;
      
      // Drawing charging energy balls feeding into core
      const ballCount = 4;
      for (let i = 0; i < ballCount; i++) {
        const angle = this.animTimer * 5 + (i * Math.PI * 2) / ballCount;
        const dist = 70 * (1 - chargeScale);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, 5 + chargeScale * 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Drawing massive charge flare
      if (chargeScale >= 0.95) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 12 + Math.sin(this.animTimer * 40) * 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(0, cy); // massive beam leftward
        ctx.stroke();
      }
      ctx.restore();
    }

    // Boss Health Bar HUD
    this._renderBossHealthBar(ctx, 'OMEGA SINGULARITY PROTOCOL');

    ctx.restore();
  }
}

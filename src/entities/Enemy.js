const TILE_SIZE = 40;
const GRAVITY = 900;

export default class Enemy {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.width = 36;
    this.height = 36;
    this.type = type;
    this.health = 30;
    this.maxHealth = 30;
    this.damage = 15;
    this.alive = true;
    this.grounded = false;
    this.facing = -1;
    this.animTimer = 0;
    this.hurtTimer = 0;
    this.speed = 1.5;
    this.scoreValue = 100;
    this.affectedByGravity = true;
    this.deathParticles = [];
    this.deathTimer = 0;
    this.dying = false;
    this.beepTimer = 0;
  }

  update(dt, tiles, playerX, playerY) {
    if (!this.alive) return null;

    this.animTimer += dt;

    // Hurt flash countdown
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
    }

    // Death / Self-destruct sequence
    if (this.dying) {
      this.deathTimer -= dt;

      if (this.type === 'health_box' || this.type.startsWith('boss')) {
        // Standard fade for bosses and health boxes
        for (const p of this.deathParticles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.life -= dt;
        }
        this.deathParticles = this.deathParticles.filter(p => p.life > 0);
        if (this.deathTimer <= 0) {
          this.alive = false;
        }
      } else {
        // Cyber-grenade physics: gravity and floor collisions so it lands properly
        this.vy += GRAVITY * dt;
        if (this.vy > 600) this.vy = 600;

        this.y += this.vy * dt;
        this.resolveTileCollisionsY(tiles);

        // Find the floor Y coordinate beneath the grenade
        const cx = this.x + this.width / 2;
        let floorY = this.y + this.height;
        const col = Math.floor(cx / TILE_SIZE);
        const startRow = Math.floor((this.y + this.height) / TILE_SIZE);
        if (tiles) {
          for (let r = startRow; r < tiles.length; r++) {
            if (r >= 0 && col >= 0 && col < tiles[r].length && (tiles[r][col] === 1 || tiles[r][col] === 2 || tiles[r][col] === 3)) {
              floorY = r * TILE_SIZE;
              break;
            }
          }
        }
        this.floorY = floorY;

        // warning beep sounds (beep faster as time runs out)
        this.beepTimer -= dt;
        if (this.beepTimer <= 0) {
          const audio = window.__NEON_RUNNER__ && window.__NEON_RUNNER__.audio;
          if (audio) {
            audio.playSFX('deny');
          }
          this.beepTimer = Math.max(0.08, this.deathTimer * 0.35);
        }

        if (this.deathTimer <= 0) {
          this.alive = false;
          this.triggerSelfDestructExplosion(playerX, playerY);
        }
      }
      return null;
    }

    // Gravity
    if (this.affectedByGravity) {
      this.vy += GRAVITY * dt;
      if (this.vy > 600) this.vy = 600;
    }

    // Move X
    this.x += this.vx * dt;
    this.resolveTileCollisionsX(tiles);

    // Move Y
    this.y += this.vy * dt;
    this.grounded = false;
    this.resolveTileCollisionsY(tiles);

    return null;
  }

  resolveTileCollisionsX(tiles) {
    if (!tiles) return;
    const left = Math.floor(this.x / TILE_SIZE);
    const right = Math.floor((this.x + this.width - 1) / TILE_SIZE);
    const top = Math.floor(this.y / TILE_SIZE);
    const bottom = Math.floor((this.y + this.height - 1) / TILE_SIZE);

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (this.isSolid(tiles, col, row)) {
          if (this.vx > 0) {
            this.x = col * TILE_SIZE - this.width;
            this.vx = 0;
          } else if (this.vx < 0) {
            this.x = (col + 1) * TILE_SIZE;
            this.vx = 0;
          }
        }
      }
    }
  }

  resolveTileCollisionsY(tiles) {
    if (!tiles) return;
    const left = Math.floor(this.x / TILE_SIZE);
    const right = Math.floor((this.x + this.width - 1) / TILE_SIZE);
    const top = Math.floor(this.y / TILE_SIZE);
    const bottom = Math.floor((this.y + this.height - 1) / TILE_SIZE);

    for (let row = top; row <= bottom; row++) {
      for (let col = left; col <= right; col++) {
        if (this.isSolid(tiles, col, row)) {
          if (this.vy > 0) {
            this.y = row * TILE_SIZE - this.height;
            this.vy = 0;
            this.grounded = true;
          } else if (this.vy < 0) {
            this.y = (row + 1) * TILE_SIZE;
            this.vy = 0;
          }
        }
      }
    }
  }

  isSolid(tiles, col, row) {
    if (!tiles || row < 0 || col < 0) return false;
    if (row >= tiles.length || col >= (tiles[0] ? tiles[0].length : 0)) return false;
    const t = tiles[row][col];
    return t === 1 || t === 2 || t === 3;
  }

  isEdgeAhead(tiles, direction) {
    const checkX = direction > 0
      ? this.x + this.width + 4
      : this.x - 4;
    const checkY = this.y + this.height + 4;
    const col = Math.floor(checkX / TILE_SIZE);
    const row = Math.floor(checkY / TILE_SIZE);
    return !this.isSolid(tiles, col, row);
  }

  isWallAhead(tiles, direction) {
    const checkX = direction > 0
      ? this.x + this.width + 2
      : this.x - 2;
    const checkY = this.y + this.height / 2;
    const col = Math.floor(checkX / TILE_SIZE);
    const row = Math.floor(checkY / TILE_SIZE);
    return this.isSolid(tiles, col, row);
  }

  distanceTo(px, py) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
  }

  angleTo(px, py) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    return Math.atan2(py - cy, px - cx);
  }

  render(ctx) {
    if (this.dying) {
      if (this.type === 'health_box' || this.type.startsWith('boss')) {
        this.renderDeathParticles(ctx);
      } else {
        this.renderGrenadeCore(ctx);
      }
      return;
    }
  }

  renderGrenadeCore(ctx) {
    const cx = this.x + this.width / 2;
    const cy = this.y + this.height - 12;
    const time = this.animTimer;
    const floorY = this.floorY !== undefined ? this.floorY : cy + 12;

    ctx.save();

    // 1. Draw Projected Ground Warning Ellipse (Pulsing neon red perspective ellipse)
    const circleAlpha = 0.35 + (1.1 - this.deathTimer) * 0.45;
    const speedUp = 10 + (1.1 - this.deathTimer) * 22;
    const isBlinking = Math.sin(time * speedUp) > 0;
    
    ctx.save();
    ctx.translate(cx, floorY);
    ctx.scale(1, 0.3); // Flatten to make it look like it's flat on the 2D floor plane
    
    // Outer glowing boundary
    ctx.strokeStyle = `rgba(255, 0, 85, ${circleAlpha})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    
    // Outer dashed ring
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Inner solid ring
    ctx.strokeStyle = `rgba(255, 0, 85, ${circleAlpha * 0.5})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.stroke();

    // Pulse filled red caution zone
    const fillAlpha = (0.07 + Math.sin(time * speedUp) * 0.04) * circleAlpha;
    ctx.fillStyle = `rgba(255, 0, 85, ${fillAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, 90, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    // 2. Draw ground shadow directly under the grenade
    ctx.save();
    ctx.translate(cx, floorY - 2);
    ctx.scale(1, 0.3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    const distToFloor = Math.max(0, floorY - (cy + 12));
    const shadowScale = Math.max(0.4, 1 - distToFloor / 180);
    ctx.arc(0, 0, 18 * shadowScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Draw WARNING & Countdown text above the grenade
    const gy = cy - 6;
    ctx.shadowBlur = isBlinking ? 12 : 0;
    ctx.shadowColor = '#ff0055';
    
    ctx.font = 'bold 11px Orbitron, sans-serif';
    ctx.fillStyle = isBlinking ? '#ff3366' : '#990022';
    ctx.textAlign = 'center';
    ctx.fillText('⚠️ WARNING', cx, gy - 28);
    
    ctx.font = 'bold 13px Rajdhani, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00f0ff';
    ctx.fillText(Math.max(0, this.deathTimer).toFixed(1) + 's', cx, gy - 16);

    // 4. Draw Grenade Body (Pulsing cyber core, metallic ribs, glowing ring)
    const radius = 15;
    const coreColor = isBlinking ? '#ff0055' : '#880022';
    const coreGlow = isBlinking ? 18 : 6;
    
    ctx.shadowBlur = coreGlow;
    ctx.shadowColor = '#ff0055';
    
    // Grey metallic shell
    ctx.fillStyle = '#2f2f3f';
    ctx.strokeStyle = '#5f5f7f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, gy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // Segmented ribs
    ctx.strokeStyle = '#1a1a26';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, gy - radius);
    ctx.lineTo(cx, gy + radius);
    ctx.moveTo(cx - radius, gy);
    ctx.lineTo(cx + radius, gy);
    ctx.moveTo(cx - radius * 0.7, gy - radius * 0.7);
    ctx.lineTo(cx + radius * 0.7, gy + radius * 0.7);
    ctx.moveTo(cx - radius * 0.7, gy + radius * 0.7);
    ctx.lineTo(cx + radius * 0.7, gy - radius * 0.7);
    ctx.stroke();

    // Central pulsing laser core
    ctx.fillStyle = coreColor;
    ctx.shadowBlur = coreGlow + 4;
    ctx.shadowColor = '#ff0055';
    ctx.beginPath();
    ctx.arc(cx, gy, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight reflect
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(cx - 2, gy - 2, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Glowing cyan accent ring
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.6)';
    ctx.lineWidth = 1.2;
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.arc(cx, gy, radius + Math.sin(time * 15) * 2, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Electric arcing crackles
    if (Math.random() < 0.45) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 1.0;
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(cx, gy);
      const arcTargetX = cx + (Math.random() - 0.5) * 36;
      const arcTargetY = gy + (Math.random() - 0.5) * 36;
      ctx.lineTo(arcTargetX, arcTargetY);
      ctx.stroke();
    }

    ctx.restore();
  }

  triggerSelfDestructExplosion(playerX, playerY) {
    const game = window.__NEON_RUNNER__;
    if (!game) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height - 12;

    // Play explosion sound
    if (game.audio) {
      game.audio.playSFX('storm');
    }

    // Screen shake and flash
    if (game.effects) {
      game.effects.shake(8, 0.3);
      game.effects.flashScreen('rgba(255, 50, 50, 0.4)', 0.2);
    }

    // Spawn visual explosion particles
    if (game.particles) {
      game.particles.emit(cx, cy, 'explosion', 20, { color: '#ff00aa' });
      game.particles.emit(cx, cy, 'spark', 15, { color: '#ffe600' });
      game.particles.emit(cx, cy, 'electric', 8, { color: '#00f0ff' });
    }

    // Calculate damage to player
    const player = game.player;
    if (player && player.alive && !player.invincible) {
      const px = player.getCenterX();
      const py = player.getCenterY();
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const explosionRadius = 90;

      if (dist <= explosionRadius) {
        const powerManager = game.powerManager;
        if (powerManager && powerManager.isShieldActive()) {
          if (game.audio) game.audio.playSFX('emp');
        } else if (powerManager && powerManager.isPlayerIntangible()) {
          // Dash - intangible
        } else {
          // Apply damage and knockback
          player.takeDamage(20);
          if (game.audio) game.audio.playSFX('hit');
          
          player.vx = dx > 0 ? 8 : -8;
          player.vy = -6;
        }
      }
    }
  }

  renderDeathParticles(ctx) {
    for (const p of this.deathParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  takeDamage(amount) {
    if (this.dying) return;
    this.health -= amount;
    this.hurtTimer = 0.15;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  die() {
    this.dying = true;
    
    if (this.type === 'health_box' || this.type.startsWith('boss')) {
      this.deathTimer = 0.5;
      this.vx = 0;
      this.vy = 0;
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;
      const colors = ['#ff00aa', '#ff4444', '#ff66cc', '#ffffff'];
      for (let i = 0; i < 20; i++) {
        const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.3;
        const speed = 80 + Math.random() * 200;
        this.deathParticles.push({
          x: cx + (Math.random() - 0.5) * this.width * 0.5,
          y: cy + (Math.random() - 0.5) * this.height * 0.5,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 2 + Math.random() * 5,
          life: 0.3 + Math.random() * 0.5,
          maxLife: 0.8,
          color: colors[Math.floor(Math.random() * colors.length)]
        });
      }
      const audio = window.__NEON_RUNNER__ && window.__NEON_RUNNER__.audio;
      if (audio) audio.playSFX('enemy_die');
    } else {
      this.deathTimer = 1.1; // 1.1 seconds fuse
      this.beepTimer = 0.0;
      this.vx = 0;
      this.vy = -180; // pop up bounce
      
      const audio = window.__NEON_RUNNER__ && window.__NEON_RUNNER__.audio;
      if (audio) audio.playSFX('deny');
    }
  }

  drawHealthBar(ctx) {
    if (this.health >= this.maxHealth || this.dying) return;

    const barWidth = this.width + 4;
    const barHeight = 4;
    const bx = this.x + this.width / 2 - barWidth / 2;
    const by = this.y - 10;
    const ratio = this.health / this.maxHealth;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);

    // Health fill with glow
    ctx.save();
    ctx.shadowBlur = 6;
    ctx.shadowColor = '#ff00aa';
    const grad = ctx.createLinearGradient(bx, by, bx + barWidth * ratio, by);
    grad.addColorStop(0, '#ff00aa');
    grad.addColorStop(1, '#ff4444');
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, barWidth * ratio, barHeight);
    ctx.restore();

    // Border
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.5)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(bx - 1, by - 1, barWidth + 2, barHeight + 2);
  }

  drawBossHealthBar(ctx, canvasWidth, name) {
    if (this.dying) return;
    const barWidth = canvasWidth * 0.6;
    const barHeight = 12;
    const bx = (canvasWidth - barWidth) / 2;
    const by = 30;
    const ratio = this.health / this.maxHealth;

    // Boss name
    ctx.save();
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff00aa';
    ctx.fillStyle = '#ffe600';
    ctx.fillText(name || this.type.toUpperCase(), canvasWidth / 2, by - 8);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(bx - 2, by - 2, barWidth + 4, barHeight + 4);

    // Health fill
    ctx.shadowBlur = 12;
    ctx.shadowColor = this.phase === 3 ? '#ff0000' : this.phase === 2 ? '#ffe600' : '#ff00aa';
    const grad = ctx.createLinearGradient(bx, by, bx + barWidth * ratio, by);
    if (this.phase === 3) {
      grad.addColorStop(0, '#ff0000');
      grad.addColorStop(0.5, '#ff4444');
      grad.addColorStop(1, '#ff0000');
    } else if (this.phase === 2) {
      grad.addColorStop(0, '#ff00aa');
      grad.addColorStop(1, '#ffe600');
    } else {
      grad.addColorStop(0, '#ff00aa');
      grad.addColorStop(1, '#ff66cc');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(bx, by, barWidth * ratio, barHeight);

    // Phase markers
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(bx + barWidth * 0.33 - 0.5, by, 1, barHeight);
    ctx.fillRect(bx + barWidth * 0.66 - 0.5, by, 1, barHeight);

    // Border
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx - 2, by - 2, barWidth + 4, barHeight + 4);

    ctx.restore();
  }

  applyHurtTint(ctx) {
    if (this.hurtTimer > 0) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(255, 255, 255, ${this.hurtTimer / 0.15 * 0.7})`;
      ctx.fillRect(this.x - 5, this.y - 5, this.width + 10, this.height + 10);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}

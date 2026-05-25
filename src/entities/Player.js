import { resolveHorizontalTileCollisions, resolveVerticalTileCollisions } from '../engine.js';
import playerNewSpriteImg from '../assets/ninja_sprite_new.png';

const TILE_SIZE = 40;
const GRAVITY = 0.7;
const MAX_FALL_SPEED = 15;

export default class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 30;
    this.height = 48;
    this.vx = 0;
    this.vy = 0;

    // Movement constants
    this.moveSpeed = 5;
    this.jumpForce = -13;
    this.doubleJumpForce = -13;
    this.friction = 0.85;
    this.acceleration = 0.8;

    // State
    this.grounded = false;
    this.canDoubleJump = true;
    this.facing = 1; // 1 = right, -1 = left
    this.state = 'idle'; // idle, run, jump, fall, attack, hurt, dead
    this.alive = true;

    // Combat
    this.health = 100;
    this.maxHealth = 100;
    this.maxEnergy = 100;
    this.energy = this.maxEnergy;
    this.attacking = false;
    this.attackTimer = 0;
    this.attackDuration = 0.3;
    this.attackCooldown = 0;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.invincibleDuration = 1.5;

    // Animation
    this.animTimer = 0;
    this.animFrame = 0;
    this.runCycle = 0;
    this.breathCycle = 0;
    this.globalTime = 0;
    this.landSquashTimer = 0;

    // Trail effect
    this.trail = []; // Array of {x, y, alpha, facing}
    this.trailTimer = 0;

    // Coyote time
    this.coyoteTime = 0;
    this.coyoteTimeDuration = 0.1;

    // Jump buffer
    this.jumpBuffer = 0;
    this.jumpBufferDuration = 0.1;

    // Particles
    this.jumpParticles = [];
    this.landParticles = [];
    this.runParticles = [];
    this.attackParticles = [];
    this.thrusterParticles = [];

    // Active power glow color override (set by PowerManager)
    this.powerGlowColor = null;
    this.dashing = false;

    // Platform tracking
    this.standingOnPlatform = null;

    // Sprite loading
    this.spritesheet = new Image();
    this.spritesheet.src = playerNewSpriteImg;
    this.spritesheetLoaded = false;
    this.transparentPlayerSprite = null;
    this.spritesheet.onload = () => {
      this._makeSpriteTransparent();
      this.spritesheetLoaded = true;
    };
  }

  _makeSpriteTransparent() {
    try {
      const img = this.spritesheet;
      const offscreen = document.createElement('canvas');
      offscreen.width = img.width;
      offscreen.height = img.height;
      const ctx = offscreen.getContext('2d');
      ctx.drawImage(img, 0, 0);

      // Pre-scale to max 256px for quality and performance
      const maxDimension = 256;
      let targetW = img.width;
      let targetH = img.height;
      if (img.width > maxDimension || img.height > maxDimension) {
        if (img.width > img.height) {
          targetW = maxDimension;
          targetH = Math.round((img.height / img.width) * maxDimension);
        } else {
          targetH = maxDimension;
          targetW = Math.round((img.width / img.height) * maxDimension);
        }
      }

      const cropped = document.createElement('canvas');
      cropped.width = targetW;
      cropped.height = targetH;
      const cropCtx = cropped.getContext('2d');
      cropCtx.imageSmoothingEnabled = true;
      cropCtx.imageSmoothingQuality = 'high';
      cropCtx.drawImage(offscreen, 0, 0, img.width, img.height, 0, 0, targetW, targetH);

      this.transparentPlayerSprite = cropped;
    } catch (e) {
      console.error("Error processing player sprite:", e);
      this.transparentPlayerSprite = this.spritesheet;
    }
  }

  update(dt, input, tiles) {
    if (!this.alive) return null;

    this.globalTime += dt;
    this.breathCycle += dt * 3;
    let attackHitbox = null;

    // Update land squash timer
    if (this.landSquashTimer > 0) {
      this.landSquashTimer -= dt;
    }

    // --- 1. Horizontal Movement ---
    let moveDir = 0;
    if (input.isDown('a')) moveDir -= 1;
    if (input.isDown('d')) moveDir += 1;

    if (moveDir !== 0) {
      this.vx += moveDir * this.acceleration;
      if (this.vx > this.moveSpeed) this.vx = this.moveSpeed;
      if (this.vx < -this.moveSpeed) this.vx = -this.moveSpeed;
      this.facing = moveDir;
    } else {
      this.vx *= this.friction;
      if (Math.abs(this.vx) < 0.1) this.vx = 0;
    }

    // --- 2. Jumping ---
    const wantJump = input.isPressed('w') || input.isPressed('space');

    if (wantJump) {
      this.jumpBuffer = this.jumpBufferDuration;
    }

    // Normal jump (grounded or coyote time)
    if (this.jumpBuffer > 0 && (this.grounded || this.coyoteTime > 0)) {
      this.vy = this.jumpForce;
      this.grounded = false;
      this.coyoteTime = 0;
      this.jumpBuffer = 0;
      this.canDoubleJump = true;
      this._spawnJumpParticles();
    }
    // Double jump
    else if (wantJump && !this.grounded && this.canDoubleJump) {
      this.vy = this.doubleJumpForce;
      this.canDoubleJump = false;
      this.jumpBuffer = 0;
      this._spawnJumpParticles();
      // Spawn extra double-jump pneumatic blast particles
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        this.jumpParticles.push({
          x: this.x + this.width / 2,
          y: this.y + this.height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed + 1,
          life: 0.35 + Math.random() * 0.2,
          maxLife: 0.55,
          size: 2.5 + Math.random() * 2.5
        });
      }
    }

    // Variable jump height - cut jump short on key release
    if (!input.isDown('w') && !input.isDown('space') && this.vy < -2) {
      this.vy *= 0.7;
    }

    // --- 3. Drop through platforms with S ---
    if (input.isPressed('s')) {
      this.dropThrough = true;
      setTimeout(() => { this.dropThrough = false; }, 150);
    }

    // --- 4. Gravity ---
    this.vy += GRAVITY;
    if (this.vy > MAX_FALL_SPEED) this.vy = MAX_FALL_SPEED;

    // --- 5. Movement & Tile Collision ---
    const wasGrounded = this.grounded;
    this.grounded = false;

    // Horizontal movement + collision
    this.x += this.vx;
    this._resolveHorizontalTileCollisions(tiles);

    // Vertical movement + collision
    this.y += this.vy;
    this._resolveVerticalTileCollisions(tiles);

    // Landing particles & squash trigger
    if (!wasGrounded && this.grounded) {
      this._spawnLandParticles();
      this.landSquashTimer = 0.12;
    }

    // --- 6. Attack ---
    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if ((input.isMouseDown() || input.isPressed('j')) && !this.attacking && this.attackCooldown <= 0) {
      this.attacking = true;
      this.attackTimer = this.attackDuration;
      this.attackCooldown = 0.15;
      this.vx = this.facing * (this.moveSpeed * 1.2);
    }

    if (this.attacking) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attacking = false;
        this.attackTimer = 0;
      }
      attackHitbox = this.getAttackHitbox();

      if (Math.random() < 0.6) {
        const progress = 1 - (this.attackTimer / this.attackDuration);
        const startAngle = -Math.PI * 0.6;
        const endAngle = Math.PI * 0.4;
        const currentAngle = startAngle + (endAngle - startAngle) * progress;

        const relativeX = (5 + Math.cos(currentAngle) * 30) * this.facing;
        const relativeY = -5 + Math.sin(currentAngle) * 30;

        this.attackParticles.push({
          x: this.x + this.width / 2 + relativeX,
          y: this.y + this.height / 2 + relativeY,
          vx: this.facing * (Math.random() * 3 + 1),
          vy: (Math.random() - 0.5) * 3,
          life: 0.2 + Math.random() * 0.15,
          maxLife: 0.35,
          size: 1.5 + Math.random() * 2
        });
      }
    }

    // --- 7. Invincibility ---
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.invincibleTimer = 0;
      }
    }

    // --- 8. Animation State ---
    this.animTimer += dt;
    if (this.attacking) {
      this.state = 'attack';
    } else if (this.dashing) {
      this.state = 'run';
      this.runCycle += dt * 25; // Speed run animation during dash!
    } else if (this.invincible && this.state !== 'dead') {
      this.state = 'hurt';
    } else if (this.grounded) {
      if (Math.abs(this.vx) > 0.5) {
        this.state = 'run';
        this.runCycle += dt * Math.abs(this.vx) * 1.5;
      } else {
        this.state = 'idle';
      }
    } else {
      this.state = this.vy < 0 ? 'jump' : 'fall';
    }

    // --- 9. Trail ---
    this.trailTimer += dt;
    if (this.trailTimer > 0.03 && (Math.abs(this.vx) > 1 || Math.abs(this.vy) > 2)) {
      this.trail.push({ x: this.x, y: this.y, alpha: 0.6, facing: this.facing });
      this.trailTimer = 0;
    }
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].alpha -= dt * 2.5;
      if (this.trail[i].alpha <= 0) this.trail.splice(i, 1);
    }

    // --- 10. Coyote Time & Jump Buffer ---
    if (wasGrounded && !this.grounded && this.vy >= 0) {
      this.coyoteTime = this.coyoteTimeDuration;
    }
    if (this.coyoteTime > 0) this.coyoteTime -= dt;
    if (this.jumpBuffer > 0) this.jumpBuffer -= dt;

    if (this.grounded) {
      this.canDoubleJump = true;
    }

    // --- 11. Spawn Jetpack Thruster Particles ---
    if (this.spritesheetLoaded && this.transparentPlayerSprite) {
      const drawW = 60;
      const drawH = 50;
      const isMoving = Math.abs(this.vx) > 0.5;

      const animBob = this.state === 'idle' ? Math.sin(this.breathCycle) * 0.8 : (this.state === 'run' ? Math.abs(Math.sin(this.runCycle)) * 3 : 0);
      const jetX = this.x + this.width / 2 - this.facing * (drawW * 0.2);
      const jetY = this.y + this.height / 2 - (drawH * 0.2) + animBob;

      let spawnRate = 0;
      let particleVx = 0;
      let particleVy = 0;
      let pLife = 0.2;

      if (this.dashing) {
        spawnRate = 0.95;
        particleVx = -this.facing * (2.5 + Math.random() * 2.5);
        particleVy = (Math.random() - 0.5) * 1.0;
        pLife = 0.25;
      } else if (this.state === 'jump') {
        spawnRate = 0.45;
        particleVx = -this.facing * (Math.random() * 0.8);
        particleVy = Math.random() * 2.5 + 2.5;
        pLife = 0.3;
      } else if (this.state === 'fall') {
        spawnRate = 0.15;
        particleVx = -this.facing * (Math.random() * 0.6);
        particleVy = Math.random() * 1.5 + 1.5;
        pLife = 0.2;
      } else if (this.state === 'run' && isMoving) {
        spawnRate = 0.25;
        particleVx = -this.facing * (1.5 + Math.random() * 1.5);
        particleVy = Math.random() * 0.8 + 0.3;
        pLife = 0.22;
      }

      if (spawnRate > 0 && Math.random() < spawnRate) {
        const colors = ['#00f0ff', '#ff00aa', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.thrusterParticles.push({
          x: jetX,
          y: jetY,
          vx: particleVx,
          vy: particleVy,
          life: pLife + Math.random() * 0.1,
          maxLife: pLife + 0.1,
          size: 1.5 + Math.random() * 2.5,
          color: color
        });
      }
    }

    // --- Update all particle lists ---
    this._updateParticles(dt);

    // Run particles
    if (this.state === 'run' && this.grounded && Math.random() < 0.3) {
      this.runParticles.push({
        x: this.x + this.width / 2 - this.facing * 5,
        y: this.y + this.height,
        vx: -this.facing * (Math.random() * 2 + 0.5),
        vy: -(Math.random() * 1.5 + 0.5),
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.3 + Math.random() * 0.2,
        size: 2 + Math.random() * 2
      });
    }

    return attackHitbox;
  }

  _getTile(tiles, col, row) {
    if (!tiles || row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return 1;
    return tiles[row][col];
  }

  _isSolid(tile) {
    return tile === 1 || tile === 2 || tile === 3;
  }

  _resolveHorizontalTileCollisions(tiles) {
    resolveHorizontalTileCollisions(this, tiles);
  }

  _resolveVerticalTileCollisions(tiles) {
    resolveVerticalTileCollisions(this, tiles);
  }

  _spawnJumpParticles() {
    for (let i = 0; i < 8; i++) {
      this.jumpParticles.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
        y: this.y + this.height,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 2 + 1,
        life: 0.3 + Math.random() * 0.2,
        maxLife: 0.3 + Math.random() * 0.2,
        size: 2 + Math.random() * 3
      });
    }
  }

  _spawnLandParticles() {
    for (let i = 0; i < 6; i++) {
      this.landParticles.push({
        x: this.x + this.width / 2 + (Math.random() - 0.5) * 20,
        y: this.y + this.height,
        vx: (Math.random() - 0.5) * 6,
        vy: -(Math.random() * 2 + 0.5),
        life: 0.25 + Math.random() * 0.15,
        maxLife: 0.25 + Math.random() * 0.15,
        size: 2 + Math.random() * 3
      });
    }
  }

  _updateParticles(dt) {
    const updateList = (list) => {
      for (let i = list.length - 1; i >= 0; i--) {
        const p = list[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= dt;
        if (p.life <= 0) list.splice(i, 1);
      }
    };
    updateList(this.jumpParticles);
    updateList(this.landParticles);
    updateList(this.runParticles);
    updateList(this.attackParticles);
    updateList(this.thrusterParticles);
  }

  render(ctx) {
    if (!this.alive && this.state === 'dead') return;

    // Invincibility blink
    if (this.invincible && Math.floor(this.invincibleTimer * 10) % 2 === 0) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const glowColor = this.powerGlowColor || '#00f0ff';

    // --- Render Trail ---
    for (const t of this.trail) {
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.35;
      ctx.translate(t.x + this.width / 2, t.y + this.height / 2);
      ctx.scale(t.facing, 1);
      this._drawBody(ctx, '#00f0ff', true);
      ctx.restore();
    }

    // --- Render Particles ---
    this._renderParticles(ctx, this.jumpParticles, '#00f0ff');
    this._renderParticles(ctx, this.landParticles, '#00f0ff');
    this._renderParticles(ctx, this.runParticles, '#8b5cf6');
    this._renderParticles(ctx, this.attackParticles, '#00f0ff');
    this._renderParticles(ctx, this.thrusterParticles, '#00f0ff');

    // --- Render Character ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(this.facing, 1);

    // Neon body glow
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = this.state === 'attack' ? 20 : (this.dashing ? 22 : 12);

    this._drawBody(ctx, glowColor, false);

    // Attack slash
    if (this.attacking) {
      this._drawAttackSlash(ctx);
    }

    ctx.restore();
  }

  _drawBody(ctx, glowColor, isTrail) {
    // If sprite not loaded yet, fallback to original vector rendering
    if (!this.spritesheetLoaded || !this.transparentPlayerSprite) {
      const breathOff = Math.sin(this.breathCycle) * 1.5;

      // Legs
      ctx.save();
      const legSpread = this.state === 'run' ? Math.sin(this.runCycle * 4) * 8 : 0;
      const legY = 8;

      ctx.strokeStyle = glowColor;
      ctx.lineWidth = isTrail ? 1.5 : 3;
      ctx.lineCap = 'round';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isTrail ? 4 : 10;

      ctx.beginPath();
      ctx.moveTo(-5, legY);
      ctx.lineTo(-6 + (this.state === 'fall' ? -3 : 0), legY + 14 + legSpread);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(5, legY);
      ctx.lineTo(6 + (this.state === 'fall' ? 3 : 0), legY + 14 - legSpread);
      ctx.stroke();

      if (!isTrail) {
        ctx.fillStyle = glowColor;
        ctx.shadowBlur = 8;
        ctx.fillRect(-9 + (this.state === 'fall' ? -3 : 0), legY + 12 + legSpread, 6, 3);
        ctx.fillRect(3 + (this.state === 'fall' ? 3 : 0), legY + 12 - legSpread, 6, 3);
      }
      ctx.restore();

      // Torso
      ctx.save();
      const bodyGrad = ctx.createLinearGradient(0, -20 + breathOff, 0, 10);
      bodyGrad.addColorStop(0, '#1a1a2e');
      bodyGrad.addColorStop(1, '#0d1b2a');
      ctx.fillStyle = bodyGrad;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isTrail ? 3 : 8;

      ctx.beginPath();
      ctx.moveTo(-8, -14 + breathOff);
      ctx.lineTo(8, -14 + breathOff);
      ctx.lineTo(10, 10);
      ctx.lineTo(-10, 10);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = glowColor;
      ctx.lineWidth = isTrail ? 1 : 1.8;
      ctx.stroke();

      if (!isTrail) {
        const coreColor = this.powerGlowColor || '#00f0ff';
        const corePulse = 3 + Math.sin(this.globalTime * 5) * 1.5;
        const coreGrad = ctx.createRadialGradient(0, -2, 0, 0, -2, corePulse);
        coreGrad.addColorStop(0, '#ffffff');
        coreGrad.addColorStop(0.4, coreColor);
        coreGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = coreGrad;
        ctx.shadowColor = coreColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, -2, corePulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.4;
        ctx.shadowBlur = 3;
        ctx.beginPath();
        ctx.moveTo(0, -2);
        ctx.lineTo(-7, 5);
        ctx.moveTo(0, -2);
        ctx.lineTo(7, 5);
        ctx.moveTo(0, -2);
        ctx.lineTo(0, 8);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }
      ctx.restore();

      // Arms
      ctx.save();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = isTrail ? 1.5 : 2.5;
      ctx.lineCap = 'round';
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isTrail ? 3 : 8;

      const armSwing = this.state === 'run' ? Math.sin(this.runCycle * 4) * 12 : 0;
      const jumpArmOff = this.state === 'jump' ? -8 : this.state === 'fall' ? 5 : 0;

      ctx.beginPath();
      ctx.moveTo(-10, -10 + breathOff);
      ctx.lineTo(-14, 2 - armSwing + jumpArmOff);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(10, -10 + breathOff);
      if (this.attacking) {
        ctx.lineTo(18, -12);
      } else {
        ctx.lineTo(14, 2 + armSwing + jumpArmOff);
      }
      ctx.stroke();
      ctx.restore();

      // Head
      ctx.save();
      const headY = -20 + breathOff;
      const headGrad = ctx.createLinearGradient(0, headY - 7, 0, headY + 7);
      headGrad.addColorStop(0, '#1a1a2e');
      headGrad.addColorStop(1, '#0d1b2a');

      ctx.fillStyle = headGrad;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = isTrail ? 3 : 10;

      ctx.beginPath();
      ctx.moveTo(-7, headY + 5);
      ctx.lineTo(-9, headY - 2);
      ctx.lineTo(-5, headY - 8);
      ctx.lineTo(5, headY - 8);
      ctx.lineTo(9, headY - 2);
      ctx.lineTo(7, headY + 5);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = glowColor;
      ctx.lineWidth = isTrail ? 0.8 : 1.2;
      ctx.stroke();

      if (!isTrail) {
        const visorGrad = ctx.createLinearGradient(-8, headY, 8, headY);
        visorGrad.addColorStop(0, 'transparent');
        visorGrad.addColorStop(0.2, glowColor);
        visorGrad.addColorStop(0.8, glowColor);
        visorGrad.addColorStop(1, 'transparent');

        ctx.strokeStyle = visorGrad;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.moveTo(-8, headY - 1);
        ctx.lineTo(8, headY - 1);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.moveTo(-5, headY - 1);
        ctx.lineTo(5, headY - 1);
        ctx.stroke();

        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 1;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(4, headY - 8);
        ctx.lineTo(6, headY - 13);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(6, headY - 13, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    // DRAW THE HIGH QUALITY SPRITE TEXTURE
    const sprite = this.transparentPlayerSprite;
    const sWidth = sprite.width;
    const sHeight = sprite.height;
    const aspectRatio = sWidth / sHeight;

    const drawH = 54;
    const drawW = drawH * aspectRatio;

    let bobY = 0;
    let scaleX = 1.0;
    let scaleY = 1.0;
    let tiltAngle = 0;

    // Apply state transforms
    if (this.state === 'idle') {
      bobY = Math.sin(this.breathCycle) * 0.8;
      scaleY = 1.0 + Math.sin(this.breathCycle) * 0.015;
      scaleX = 1.0 - Math.sin(this.breathCycle) * 0.015;
      tiltAngle = Math.sin(this.breathCycle) * 0.01;
    } else if (this.state === 'run') {
      bobY = Math.abs(Math.sin(this.runCycle)) * 3;
      tiltAngle = 0.06;
      scaleY = 0.98 + Math.sin(this.runCycle * 2) * 0.02;
    } else if (this.state === 'jump') {
      tiltAngle = -0.05;
      scaleY = 1.06;
      scaleX = 0.94;
    } else if (this.state === 'fall') {
      tiltAngle = 0.04;
      scaleY = 1.02;
      scaleX = 0.98;
    } else if (this.state === 'attack') {
      tiltAngle = 0.16;
      scaleY = 0.92;
      scaleX = 1.08;
    } else if (this.state === 'hurt') {
      const shakeX = (Math.random() - 0.5) * 3;
      const shakeY = (Math.random() - 0.5) * 3;
      ctx.translate(shakeX, shakeY);
      tiltAngle = -0.12;
    }

    // Land squash compaction overrides normal state scale
    if (this.landSquashTimer > 0) {
      scaleY = 0.88;
      scaleX = 1.12;
      bobY += 3;
    }

    ctx.save();
    // Pivot at bottom-center of the hitbox (X = 0, Y = 24)
    ctx.translate(0, 24);
    ctx.scale(scaleX, scaleY);
    ctx.rotate(tiltAngle);
    ctx.translate(0, -24);

    // Flip sprite horizontally because original sprite faces left
    ctx.scale(-1, 1);

    ctx.drawImage(
      sprite,
      0, 0, sWidth, sHeight,
      -drawW / 2, -drawH + 24 + bobY, drawW, drawH
    );
    ctx.restore();

    // Speed lines when running
    if (this.state === 'run' && !isTrail) {
      ctx.save();
      ctx.strokeStyle = glowColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3 + Math.abs(this.vx) * 0.05;
      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 4;
      for (let i = 0; i < 3; i++) {
        const ly = -10 + i * 10;
        ctx.beginPath();
        ctx.moveTo(-15, ly);
        ctx.lineTo(-15 - Math.abs(this.vx) * 3 - i * 4, ly);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawAttackSlash(ctx) {
    const progress = 1 - (this.attackTimer / this.attackDuration);
    const startAngle = -Math.PI * 0.6;
    const endAngle = Math.PI * 0.4;
    const currentAngle = startAngle + (endAngle - startAngle) * progress;

    ctx.save();
    ctx.translate(5, -5);

    const outerR = 35;
    const innerR = 15;
    
    ctx.beginPath();
    ctx.arc(0, 0, outerR, startAngle, currentAngle);
    ctx.lineTo(Math.cos(currentAngle) * innerR, Math.sin(currentAngle) * innerR);
    ctx.arc(0, 0, innerR, currentAngle, startAngle, true);
    ctx.closePath();

    const trailGrad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
    trailGrad.addColorStop(0, 'rgba(0, 240, 255, 0.0)');
    trailGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.55)');
    trailGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = trailGrad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.fill();

    const leadingX = Math.cos(currentAngle);
    const leadingY = Math.sin(currentAngle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(leadingX * innerR, leadingY * innerR);
    ctx.lineTo(leadingX * outerR, leadingY * outerR);
    ctx.stroke();

    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.beginPath();
    ctx.arc(0, 0, (outerR + innerR) / 2, currentAngle - 0.4, currentAngle);
    ctx.stroke();

    ctx.restore();
  }

  _renderParticles(ctx, particles, color) {
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      const pColor = p.color || color;
      ctx.shadowColor = pColor;
      ctx.shadowBlur = 6;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, pColor);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  takeDamage(amount) {
    if (this.invincible || !this.alive) return;
    this.health -= amount;
    this.invincible = true;
    this.invincibleTimer = this.invincibleDuration;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }
  }

  heal(amount) {
    this.health = Math.min(this.health + amount, this.maxHealth);
  }

  addEnergy(amount) {
    this.energy = Math.min(this.energy + amount, this.maxEnergy);
  }

  getAttackHitbox() {
    if (!this.attacking) return null;
    const hitboxWidth = 50;
    const hitboxHeight = 40;
    return {
      x: this.facing === 1 ? this.x + this.width : this.x - hitboxWidth,
      y: this.y + (this.height - hitboxHeight) / 2,
      width: hitboxWidth,
      height: hitboxHeight
    };
  }

  die() {
    this.alive = false;
    this.state = 'dead';
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.health = this.maxHealth;
    this.energy = 0;
    this.alive = true;
    this.state = 'idle';
    this.grounded = false;
    this.canDoubleJump = true;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.attacking = false;
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.dashing = false;
    this.landSquashTimer = 0;
    this.trail = [];
    this.jumpParticles = [];
    this.landParticles = [];
    this.runParticles = [];
    this.attackParticles = [];
    this.thrusterParticles = [];
    this.standingOnPlatform = null;
  }

  getCenterX() { return this.x + this.width / 2; }
  getCenterY() { return this.y + this.height / 2; }
}

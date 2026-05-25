import Enemy from '../Enemy.js';
import securityBotImg from '../../assets/security_bot.png';

// Static sprite loading - shared across all SecurityBot instances
const securitySprites = {
  loaded: false,
  sprite: null,
};

function makeTransparent(img) {
  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = img.width;
    offscreen.height = img.height;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imgData.data;

    // Background color reference from corner pixel (transparent or background color)
    const cornerR = data[0];
    const cornerG = data[1];
    const cornerB = data[2];
    const cornerA = data[3];

    const threshold = 45;
    let minX = img.width;
    let maxX = 0;
    let minY = img.height;
    let maxY = 0;

    for (let y = 0; y < img.height; y++) {
      for (let x = 0; x < img.width; x++) {
        const idx = (y * img.width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        let isBackground = false;
        if (cornerA === 0) {
          isBackground = (a === 0);
        } else {
          const dr = r - cornerR;
          const dg = g - cornerG;
          const db = b - cornerB;
          const dist = Math.sqrt(dr * dr + dg * dg + db * db);
          isBackground = (dist < threshold);
        }

        if (isBackground) {
          data[idx + 3] = 0; // Make transparent
        } else {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Crop to tight bounding box
    const cropW = (maxX >= minX) ? (maxX - minX + 1) : img.width;
    const cropH = (maxY >= minY) ? (maxY - minY + 1) : img.height;

    // High-quality pre-scaling to max 256px to eliminate aliasing/pixelation when drawn in-game
    const maxDimension = 256;
    let targetW = cropW;
    let targetH = cropH;
    if (cropW > maxDimension || cropH > maxDimension) {
      if (cropW > cropH) {
        targetW = maxDimension;
        targetH = Math.round((cropH / cropW) * maxDimension);
      } else {
        targetH = maxDimension;
        targetW = Math.round((cropW / cropH) * maxDimension);
      }
    }

    const cropped = document.createElement('canvas');
    cropped.width = targetW;
    cropped.height = targetH;
    const cropCtx = cropped.getContext('2d');
    cropCtx.imageSmoothingEnabled = true;
    cropCtx.imageSmoothingQuality = 'high';
    cropCtx.drawImage(offscreen, minX, minY, cropW, cropH, 0, 0, targetW, targetH);

    return cropped;
  } catch (e) {
    console.error('SecurityBot: sprite processing error', e);
    return img;
  }
}

let loadingStarted = false;
function loadSecuritySprites() {
  if (loadingStarted) return;
  loadingStarted = true;

  const botImage = new Image();
  botImage.src = securityBotImg;
  botImage.onload = () => {
    securitySprites.sprite = makeTransparent(botImage);
    securitySprites.loaded = true;
  };
}

export default class SecurityBot extends Enemy {
  constructor(x, y) {
    super(x, y, 'security');
    this.width = 40;
    this.height = 48;
    this.health = 50;
    this.maxHealth = 50;
    this.speed = 1.5;
    this.chargeSpeed = 5;
    this.patrolRange = 160;
    this.startX = x;
    this.state = 'patrol';
    this.alertTimer = 0;
    this.stunTimer = 0;
    this.detectionRange = 250;
    this.chargeRange = 180;
    this.damage = 20;
    this.scoreValue = 200;
    this.legTimer = 0;
    this.patrolDir = 1;
    this.chargeDir = 1;
    this.visorFlash = 0;
    this.sparkParticles = [];
    this.thrusterParticles = [];
    this.chargeTrails = [];
    this.chargeDist = 0;

    // Trigger sprite loading on first construction
    loadSecuritySprites();
  }

  update(dt, tiles, playerX, playerY) {
    if (!this.alive || this.dying) return super.update(dt, tiles, playerX, playerY);

    this.animTimer += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.visorFlash += dt * 15; // Speed up visor flash for alerts

    // Spark particles (for stunned state)
    for (const s of this.sparkParticles) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
    }
    this.sparkParticles = this.sparkParticles.filter(s => s.life > 0);

    // Update thruster particles
    for (const p of this.thrusterParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.thrusterParticles = this.thrusterParticles.filter(p => p.life > 0);

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const dist = Math.sqrt((playerX - cx) ** 2 + (playerY - cy) ** 2);

    const isCharging = this.state === 'charge';
    const isAlert = this.state === 'alert';

    // Generate thruster exhaust particles
    if (isCharging || isAlert) {
      const spawnRate = isCharging ? 0.8 : 0.2;
      if (Math.random() < spawnRate) {
        // Select one of three jets on the back of the mech
        const jetYOffset = [this.height * 0.22, this.height * 0.45, this.height * 0.68][Math.floor(Math.random() * 3)];
        const jetX = cx - this.facing * (this.width * 0.6);
        const jetY = this.y + jetYOffset;

        // Colors: Cyan (#00f0ff), Magenta (#ff00aa), White (#ffffff)
        const colors = ['#00f0ff', '#ff00aa', '#ffffff'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.thrusterParticles.push({
          x: jetX,
          y: jetY,
          vx: -this.facing * (isCharging ? (200 + Math.random() * 120) : (90 + Math.random() * 60)),
          vy: (Math.random() - 0.5) * 40,
          color: color,
          life: 0.12 + Math.random() * 0.12,
          size: 1.5 + Math.random() * 2.5
        });
      }
    }

    // Handle charge trails
    if (isCharging) {
      this.chargeTrails.push({
        x: this.x,
        y: this.y,
        facing: this.facing,
        legTimer: this.legTimer
      });
      if (this.chargeTrails.length > 4) {
        this.chargeTrails.shift();
      }
    } else {
      if (this.chargeTrails.length > 0) {
        this.chargeTrails.shift();
      }
    }

    switch (this.state) {
      case 'patrol':
        this.vx = this.speed * this.patrolDir * 60;
        this.legTimer += dt * this.speed * 4;
        this.facing = this.patrolDir;

        if (this.x > this.startX + this.patrolRange) this.patrolDir = -1;
        else if (this.x < this.startX) this.patrolDir = 1;

        if (this.isEdgeAhead(tiles, this.patrolDir) || this.isWallAhead(tiles, this.patrolDir)) {
          this.patrolDir *= -1;
        }

        if (dist < this.detectionRange) {
          this.state = 'alert';
          this.alertTimer = 1.0;
          this.vx = 0;
        }
        break;

      case 'alert':
        this.vx = 0;
        this.alertTimer -= dt;
        this.facing = playerX > cx ? 1 : -1;

        if (this.alertTimer <= 0) {
          this.state = 'charge';
          this.chargeDir = this.facing;
          this.chargeDist = 0;
        }
        break;

      case 'charge':
        this.vx = this.chargeSpeed * this.chargeDir * 60;
        this.legTimer += dt * this.chargeSpeed * 6;
        this.facing = this.chargeDir;
        this.chargeDist += Math.abs(this.vx) * dt;

        if (this.chargeDist > this.chargeRange + 60 || this.isWallAhead(tiles, this.chargeDir)) {
          this.state = 'stunned';
          this.stunTimer = 1.5;
          this.vx = 0;
          // Generate sparks
          for (let i = 0; i < 8; i++) {
            this.sparkParticles.push({
              x: cx + (Math.random() - 0.5) * this.width,
              y: cy + (Math.random() - 0.5) * this.height,
              vx: (Math.random() - 0.5) * 200,
              vy: -Math.random() * 150,
              life: 0.3 + Math.random() * 0.4,
            });
          }
        }
        break;

      case 'stunned':
        this.vx = 0;
        this.stunTimer -= dt;
        if (this.stunTimer <= 0) {
          this.state = 'patrol';
          this.startX = this.x;
        }
        break;
    }

    // Gravity & collisions
    super.update(dt, tiles, playerX, playerY);
    return null;
  }

  drawMech(ctx, x, y, facing, state, animTimer, legTimer, alpha = 1.0) {
    const cx = x + this.width / 2;
    const cy = y + this.height / 2;
    const drawW = 62;
    const drawH = 50;
    const drawX = cx - drawW / 2;
    const drawY = y + this.height - drawH; // align bottom with hitbox bottom

    ctx.save();
    ctx.globalAlpha = alpha;

    const isStunned = state === 'stunned';
    const isCharging = state === 'charge';
    const isAlert = state === 'alert';

    // Bobbing and Tilting for patrol stride
    if (state === 'patrol') {
      const bobY = Math.abs(Math.sin(legTimer)) * 2.5;
      const tiltAngle = Math.sin(legTimer) * 0.05;
      ctx.translate(cx, y + this.height);
      ctx.rotate(tiltAngle);
      ctx.translate(-cx, -(y + this.height) + bobY);
    }

    // Leaning forward when charging
    if (isCharging) {
      ctx.translate(cx, y + this.height);
      ctx.rotate(facing * 0.18); // lean forward
      const bobY = Math.abs(Math.sin(legTimer)) * 3;
      ctx.translate(-cx, -(y + this.height) + bobY);
    }

    // Alert wobble
    if (isAlert) {
      const wobble = Math.sin(animTimer * 15) * 1.5;
      ctx.translate(wobble, 0);
    }

    // Tilt back when stunned
    if (isStunned) {
      ctx.translate(cx, y + this.height);
      ctx.rotate(-facing * 0.3); // tilt backwards
      // Vibration
      const vibrate = Math.sin(animTimer * 20) * 1.2;
      ctx.translate(-cx + vibrate, -(y + this.height));
    }

    // Draw sprite image
    ctx.save();
    // Neon outer glow
    ctx.shadowBlur = isCharging ? 22 : (isAlert ? 15 : 6);
    ctx.shadowColor = isCharging ? '#ff00aa' : (isAlert ? '#ffe600' : '#ff00aa');

    if (facing > 0) { // Facing right (original sprite faces left)
      ctx.translate(cx, cy);
      ctx.scale(-1, 1);
      ctx.drawImage(securitySprites.sprite, -drawW / 2, y + this.height - drawH - cy, drawW, drawH);
    } else {
      ctx.drawImage(securitySprites.sprite, drawX, drawY, drawW, drawH);
    }
    ctx.restore();

    // Draw custom head visor glowing overlay
    ctx.save();
    const visorW = 8;
    const visorH = 4;
    const visorColor = isAlert
      ? (Math.sin(this.visorFlash) > 0 ? '#ffe600' : '#ff8800')
      : isStunned
        ? 'rgba(68, 68, 68, 0.4)'
        : '#ff00aa';

    ctx.fillStyle = visorColor;
    ctx.shadowColor = visorColor;
    ctx.shadowBlur = isAlert ? 15 : 6;

    // Draw visor relative to head center
    let vx = drawX + drawW * 0.45;
    let vy = drawY + drawH * 0.23;

    if (facing > 0) {
      vx = cx + (cx - (drawX + drawW * 0.45)) - visorW;
    }

    ctx.fillRect(vx, vy, visorW, visorH);
    ctx.restore();

    ctx.restore();
  }

  render(ctx) {
    if (this.dying) { super.render(ctx); return; }
    if (!this.alive) return;

    // Draw thruster flame particles
    for (const p of this.thrusterParticles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.globalAlpha = p.life / 0.24;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Render active bot and afterimages
    if (securitySprites.loaded && securitySprites.sprite) {
      // Draw trails
      if (this.state === 'charge') {
        for (let i = 0; i < this.chargeTrails.length; i++) {
          const trail = this.chargeTrails[i];
          const opacity = 0.08 * (i + 1) / this.chargeTrails.length;
          this.drawMech(ctx, trail.x, trail.y, trail.facing, 'charge', this.animTimer, trail.legTimer, opacity);
        }
      }

      // Draw active bot
      this.drawMech(ctx, this.x, this.y, this.facing, this.state, this.animTimer, this.legTimer, 1.0);
    } else {
      // Fallback: original vector rendering
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;
      const isStunned = this.state === 'stunned';
      const isCharging = this.state === 'charge';
      const isAlert = this.state === 'alert';

      ctx.save();

      if (isCharging) {
        ctx.translate(cx, this.y + this.height);
        ctx.rotate(this.facing * 0.15);
        ctx.translate(-cx, -(this.y + this.height));
      }

      if (isStunned) {
        ctx.translate(cx, cy);
        ctx.rotate(0.2 + Math.sin(this.animTimer * 3) * 0.05);
        ctx.translate(-cx, -cy);
      }

      // Legs
      const legSwing = Math.sin(this.legTimer) * 0.5;
      const legY = this.y + this.height - 16;
      const legLen = 14;
      const kneeLen = 12;

      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = isStunned ? '#555' : '#666';

      const ll_angle = -0.3 + legSwing;
      const ll_kneeX = cx - 8 + Math.sin(ll_angle) * legLen;
      const ll_kneeY = legY + Math.cos(ll_angle) * legLen;
      ctx.beginPath();
      ctx.moveTo(cx - 8, legY);
      ctx.lineTo(ll_kneeX, ll_kneeY);
      ctx.lineTo(ll_kneeX + Math.sin(ll_angle + 0.4) * kneeLen, ll_kneeY + Math.cos(ll_angle + 0.4) * kneeLen);
      ctx.stroke();

      const rl_angle = -0.3 - legSwing;
      const rl_kneeX = cx + 8 + Math.sin(rl_angle) * legLen;
      const rl_kneeY = legY + Math.cos(rl_angle) * legLen;
      ctx.beginPath();
      ctx.moveTo(cx + 8, legY);
      ctx.lineTo(rl_kneeX, rl_kneeY);
      ctx.lineTo(rl_kneeX + Math.sin(rl_angle + 0.4) * kneeLen, rl_kneeY + Math.cos(rl_angle + 0.4) * kneeLen);
      ctx.stroke();

      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ff00aa';
      ctx.fillStyle = '#ff00aa';
      ctx.beginPath();
      ctx.arc(ll_kneeX, ll_kneeY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rl_kneeX, rl_kneeY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Body
      const bodyTop = this.y + 8;
      const bodyH = this.height - 22;
      const bodyW = this.width - 6;
      const bodyX = cx - bodyW / 2;

      ctx.shadowBlur = isCharging ? 18 : 8;
      ctx.shadowColor = isCharging ? '#ff4444' : '#ff00aa';

      const bodyGrad = ctx.createLinearGradient(bodyX, bodyTop, bodyX + bodyW, bodyTop + bodyH);
      bodyGrad.addColorStop(0, isStunned ? '#1a1a1a' : '#2a1a2e');
      bodyGrad.addColorStop(1, isStunned ? '#111' : '#1a0a1e');
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.roundRect(bodyX, bodyTop, bodyW, bodyH, 4);
      ctx.fill();

      ctx.strokeStyle = isStunned ? '#555' : '#ff00aa';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Core
      ctx.shadowBlur = 16;
      ctx.shadowColor = isCharging ? '#ff0000' : '#ff00aa';
      const coreGrad = ctx.createRadialGradient(cx, bodyTop + bodyH * 0.45, 0, cx, bodyTop + bodyH * 0.45, 8);
      coreGrad.addColorStop(0, '#ffffff');
      coreGrad.addColorStop(0.3, isCharging ? '#ff4444' : '#ff00aa');
      coreGrad.addColorStop(1, 'rgba(255, 0, 170, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, bodyTop + bodyH * 0.45, 7, 0, Math.PI * 2);
      ctx.fill();

      // Shield arm
      const shieldX = cx - this.facing * (bodyW / 2 + 4);
      ctx.shadowBlur = 4;
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(shieldX - 5, bodyTop + 4, 10, bodyH - 10);
      ctx.strokeStyle = 'rgba(255, 0, 170, 0.4)';
      ctx.lineWidth = 1;
      ctx.strokeRect(shieldX - 5, bodyTop + 4, 10, bodyH - 10);

      // Head
      const headW = 22;
      const headH = 14;
      const headX = cx - headW / 2;
      const headY = this.y;

      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ff00aa';
      ctx.fillStyle = '#2a1a2e';
      ctx.beginPath();
      ctx.roundRect(headX, headY, headW, headH, 3);
      ctx.fill();
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Visor
      const visorColor = isAlert
        ? (Math.sin(this.visorFlash) > 0 ? '#ffe600' : '#ff8800')
        : isStunned
          ? '#444'
          : '#ff4444';
      ctx.shadowBlur = isAlert ? 14 : 8;
      ctx.shadowColor = visorColor;
      ctx.fillStyle = visorColor;
      ctx.fillRect(headX + 3, headY + 5, headW - 6, 3);

      if (!isStunned) {
        const scanX = headX + 3 + ((Math.sin(this.animTimer * 4) * 0.5 + 0.5) * (headW - 10));
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(scanX, headY + 6.5, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Spark particles for stunned state
    for (const s of this.sparkParticles) {
      const alpha = s.life / 0.7;
      ctx.save();
      ctx.shadowBlur = 6;
      ctx.shadowColor = '#ffe600';
      ctx.fillStyle = `rgba(255, 230, 0, ${alpha})`;
      ctx.fillRect(s.x - 1, s.y - 1, 3, 3);
      ctx.restore();
    }

    // Hurt flash tint
    this.applyHurtTint(ctx);

    this.drawHealthBar(ctx);
  }
}

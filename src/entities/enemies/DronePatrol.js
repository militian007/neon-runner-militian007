import Enemy from '../Enemy.js';
import droneViperImg from '../../assets/drone_viper.png';
import droneSentinelImg from '../../assets/drone_sentinel.png';
import droneScavengerImg from '../../assets/drone_scavenger.png';

// Static sprite loading - shared across all DronePatrol instances
const droneSprites = {
  loaded: false,
  viper: null,      // Variant 0 - Magenta
  sentinel: null,    // Variant 1 - Cyan
  scavenger: null,   // Variant 2 - Yellow
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

    // Background color reference from corner pixel
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
    console.error('DronePatrol: sprite processing error', e);
    return img;
  }
}

// Load all drone sprites once
let loadingStarted = false;
function loadDroneSprites() {
  if (loadingStarted) return;
  loadingStarted = true;

  let loadCount = 0;
  const checkDone = () => {
    loadCount++;
    if (loadCount === 3) droneSprites.loaded = true;
  };

  const viperImage = new Image();
  viperImage.src = droneViperImg;
  viperImage.onload = () => { droneSprites.viper = makeTransparent(viperImage); checkDone(); };

  const sentinelImage = new Image();
  sentinelImage.src = droneSentinelImg;
  sentinelImage.onload = () => { droneSprites.sentinel = makeTransparent(sentinelImage); checkDone(); };

  const scavengerImage = new Image();
  scavengerImage.src = droneScavengerImg;
  scavengerImage.onload = () => { droneSprites.scavenger = makeTransparent(scavengerImage); checkDone(); };
}

export default class DronePatrol extends Enemy {
  constructor(x, y, variant = null) {
    super(x, y, 'drone');
    this.width = 36;
    this.height = 28;
    this.health = 20;
    this.maxHealth = 20;
    this.speed = 2;
    this.patrolRange = 200;
    this.startX = x;
    this.variant = variant !== null ? variant : (Math.floor(x / 160) % 3);
    this.shootTimer = 0;
    this.shootInterval = 2.5;
    this.affectedByGravity = false;
    this.hoverOffset = 0;
    this.propellerAngle = 0;
    this.scoreValue = 100;
    this.eyePulse = 0;
    this.thrusterFlicker = 0;
    this.baseY = y;
    this.patrolDir = 1;

    // Trigger sprite loading on first construction
    loadDroneSprites();
  }

  update(dt, tiles, playerX, playerY) {
    if (!this.alive || this.dying) return super.update(dt, tiles, playerX, playerY);

    this.animTimer += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    // Propeller spin
    this.propellerAngle += dt * 25;
    this.eyePulse += dt * 3;
    this.thrusterFlicker += dt * 20;

    // Patrol horizontal
    this.x += this.speed * this.patrolDir * 60 * dt;
    if (this.x > this.startX + this.patrolRange) {
      this.patrolDir = -1;
    } else if (this.x < this.startX) {
      this.patrolDir = 1;
    }

    // Hover sine wave
    this.hoverOffset = Math.sin(this.animTimer * 2.5) * 8;
    this.y = this.baseY + this.hoverOffset;

    // Face toward player
    const cx = this.x + this.width / 2;
    this.facing = playerX > cx ? 1 : -1;

    // Shooting
    this.shootTimer += dt;
    if (this.shootTimer >= this.shootInterval) {
      this.shootTimer = 0;
      const angle = this.angleTo(playerX, playerY);
      const speed = 180;
      return {
        x: cx,
        y: this.y + this.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage: 10,
        color: this.variant === 1 ? '#00f0ff' : (this.variant === 2 ? '#ffe600' : '#ff00aa')
      };
    }

    return null;
  }

  render(ctx) {
    if (this.dying) { super.render(ctx); return; }
    if (!this.alive) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();

    // Color setup for glow effects
    let primaryColor;
    if (this.variant === 1) {
      primaryColor = '#00f0ff';
    } else if (this.variant === 2) {
      primaryColor = '#ffe600';
    } else {
      primaryColor = '#ff00aa';
    }

    // Thruster glow beneath drone
    const thrusterAlpha = 0.3 + Math.sin(this.thrusterFlicker) * 0.15;
    const thrusterGrad = ctx.createRadialGradient(cx, cy + this.height / 2 + 4, 0, cx, cy + this.height / 2 + 4, 22);
    thrusterGrad.addColorStop(0, this.variant === 1 ? `rgba(0, 240, 255, ${thrusterAlpha})` : (this.variant === 2 ? `rgba(255, 230, 0, ${thrusterAlpha})` : `rgba(255, 0, 170, ${thrusterAlpha})`));
    thrusterGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = thrusterGrad;
    ctx.fillRect(cx - 22, cy + this.height / 2 - 2, 44, 28);

    // Select the sprite for this variant
    let sprite = null;
    if (droneSprites.loaded) {
      if (this.variant === 1) sprite = droneSprites.sentinel;
      else if (this.variant === 2) sprite = droneSprites.scavenger;
      else sprite = droneSprites.viper;
    }

    if (sprite) {
      // Draw the sprite image, scaled to fit the drone's bounding box
      const drawW = this.width + 20; // Slightly larger than hitbox for visual impact
      const drawH = this.height + 16;
      const drawX = cx - drawW / 2;
      const drawY = cy - drawH / 2;

      ctx.save();
      // Outer neon glow behind the sprite
      ctx.shadowBlur = 16;
      ctx.shadowColor = primaryColor;

      // Flip sprite when facing right (since original sprite nose points left)
      if (this.facing > 0) {
        ctx.translate(cx, cy);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.drawImage(sprite, drawX, drawY, drawW, drawH);
      }
      ctx.restore();
    } else {
      // Fallback: simple glowing circle while sprites load
      ctx.shadowBlur = 12;
      ctx.shadowColor = primaryColor;
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Shoot flash effect
    if (this.shootTimer < 0.15) {
      ctx.shadowBlur = 20;
      ctx.shadowColor = primaryColor;
      ctx.fillStyle = primaryColor;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(cx + this.facing * 12, cy, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Hurt flash
    this.applyHurtTint(ctx);

    ctx.restore();
    this.drawHealthBar(ctx);
  }
}

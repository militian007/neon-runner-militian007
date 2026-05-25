import Enemy from '../Enemy.js';
import droneViperImg from '../../assets/drone_viper.png';
import droneSentinelImg from '../../assets/drone_sentinel.png';
import droneScavengerImg from '../../assets/drone_scavenger.png';

// Static sprite loading - shared across all HackerDrone instances
const hackerSprites = {
  loaded: false,
  viper: null,      // Variant 0 - Green tinted
  sentinel: null,    // Variant 1 - Cyan tinted
  scavenger: null,   // Variant 2 - Purple tinted
};

function makeTransparentTinted(img, tintR, tintG, tintB, tintStrength) {
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
          data[idx + 3] = 0;
        } else {
          // Apply color tint to non-background pixels
          data[idx]     = Math.min(255, Math.round(r * (1 - tintStrength) + tintR * tintStrength));
          data[idx + 1] = Math.min(255, Math.round(g * (1 - tintStrength) + tintG * tintStrength));
          data[idx + 2] = Math.min(255, Math.round(b * (1 - tintStrength) + tintB * tintStrength));

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
    console.error('HackerDrone: sprite processing error', e);
    return img;
  }
}

// Load all hacker drone sprites once
let loadingStarted = false;
function loadHackerSprites() {
  if (loadingStarted) return;
  loadingStarted = true;

  let loadCount = 0;
  const checkDone = () => {
    loadCount++;
    if (loadCount === 3) hackerSprites.loaded = true;
  };

  // Variant 0: Viper body tinted green
  const viperImage = new Image();
  viperImage.src = droneViperImg;
  viperImage.onload = () => { hackerSprites.viper = makeTransparentTinted(viperImage, 0, 255, 136, 0.3); checkDone(); };

  // Variant 1: Sentinel body tinted cyan
  const sentinelImage = new Image();
  sentinelImage.src = droneSentinelImg;
  sentinelImage.onload = () => { hackerSprites.sentinel = makeTransparentTinted(sentinelImage, 0, 240, 255, 0.25); checkDone(); };

  // Variant 2: Scavenger body tinted purple
  const scavengerImage = new Image();
  scavengerImage.src = droneScavengerImg;
  scavengerImage.onload = () => { hackerSprites.scavenger = makeTransparentTinted(scavengerImage, 139, 92, 246, 0.3); checkDone(); };
}

export default class HackerDrone extends Enemy {
  constructor(x, y, variant = null) {
    super(x, y, 'hacker');
    this.width = 30;
    this.height = 30;
    this.health = 25;
    this.maxHealth = 25;
    this.affectedByGravity = false;
    this.amplitude = 80;
    this.frequency = 1.5;
    this.startY = y;
    this.speed = 2.5;
    this.startX = x;
    this.variant = variant !== null ? variant : (Math.floor(x / 160) % 3);
    this.patrolRange = 250;
    this.scoreValue = 150;
    this.hexAngle = 0;
    this.dataParticles = [];
    this.patrolDir = 1;
    this.pulseTimer = 0;
    this.circuitAngle = 0;
    this.damage = 15;
    this.particleSpawnTimer = 0;
    this.facing = 1;

    // Trigger sprite loading on first construction
    loadHackerSprites();
  }

  update(dt, tiles, playerX, playerY) {
    if (!this.alive || this.dying) return super.update(dt, tiles, playerX, playerY);

    this.animTimer += dt;
    if (this.hurtTimer > 0) this.hurtTimer -= dt;

    this.hexAngle += dt * 1.5;
    this.pulseTimer += dt * 3;
    this.circuitAngle += dt * 2;

    // Horizontal patrol
    this.x += this.speed * this.patrolDir * 60 * dt;
    if (this.x > this.startX + this.patrolRange) this.patrolDir = -1;
    else if (this.x < this.startX) this.patrolDir = 1;

    // Sine wave vertical movement
    this.y = this.startY + Math.sin(this.animTimer * this.frequency) * this.amplitude;

    // Face toward player
    const cx = this.x + this.width / 2;
    this.facing = playerX > cx ? 1 : -1;

    // Spawn data particles
    this.particleSpawnTimer += dt;
    if (this.particleSpawnTimer > 0.15) {
      this.particleSpawnTimer = 0;
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 20;
      this.dataParticles.push({
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 30,
        vy: -20 - Math.random() * 40,
        char: Math.random() > 0.5 ? '1' : '0',
        life: 0.8 + Math.random() * 0.6,
        maxLife: 1.4,
      });
    }

    // Update particles
    for (const p of this.dataParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    this.dataParticles = this.dataParticles.filter(p => p.life > 0);

    return null;
  }

  render(ctx) {
    if (this.dying) { super.render(ctx); return; }
    if (!this.alive) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();

    // Color Palette Setup depending on Variant
    let primaryColor, shadowRGB;
    if (this.variant === 1) {
      primaryColor = '#00f0ff';
      shadowRGB = '0, 240, 255';
    } else if (this.variant === 2) {
      primaryColor = '#8b5cf6';
      shadowRGB = '139, 92, 246';
    } else {
      primaryColor = '#00ff88';
      shadowRGB = '0, 255, 136';
    }

    // Pulsing energy field around the drone
    const pulse = 0.2 + Math.sin(this.pulseTimer) * 0.15;
    ctx.shadowBlur = 20;
    ctx.shadowColor = primaryColor;
    const fieldGrad = ctx.createRadialGradient(cx, cy, this.width / 2, cx, cy, this.width / 2 + 14);
    fieldGrad.addColorStop(0, `rgba(${shadowRGB}, ${pulse})`);
    fieldGrad.addColorStop(1, `rgba(${shadowRGB}, 0)`);
    ctx.fillStyle = fieldGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, this.width / 2 + 14, 0, Math.PI * 2);
    ctx.fill();

    // Data particles (0s and 1s)
    ctx.shadowBlur = 4;
    ctx.shadowColor = primaryColor;
    ctx.font = '8px "Courier New", monospace';
    ctx.textAlign = 'center';
    for (const p of this.dataParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = `rgba(${shadowRGB}, ${alpha * 0.8})`;
      ctx.fillText(p.char, p.x, p.y);
    }

    // Select the sprite for this variant
    let sprite = null;
    if (hackerSprites.loaded) {
      if (this.variant === 1) sprite = hackerSprites.sentinel;
      else if (this.variant === 2) sprite = hackerSprites.scavenger;
      else sprite = hackerSprites.viper;
    }

    if (sprite) {
      // Draw the sprite image with rotation animation
      const drawW = this.width + 18;
      const drawH = this.height + 18;

      ctx.save();
      ctx.translate(cx, cy);
      // Slow rotation for hacker drone
      ctx.rotate(Math.sin(this.hexAngle * 0.3) * 0.15);
      ctx.shadowBlur = 18;
      ctx.shadowColor = primaryColor;
      // Flip sprite when facing right (since original sprite nose points left)
      if (this.facing > 0) {
        ctx.scale(-1, 1);
      }
      ctx.drawImage(sprite, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // Fallback: glowing hexagon while sprites load
      ctx.shadowBlur = 14;
      ctx.shadowColor = primaryColor;
      ctx.fillStyle = primaryColor;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        const px = cx + Math.cos(a) * 12;
        const py = cy + Math.sin(a) * 12;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Hurt flash
    this.applyHurtTint(ctx);

    ctx.restore();
    this.drawHealthBar(ctx);
  }
}

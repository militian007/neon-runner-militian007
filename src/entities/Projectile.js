// Projectile.js - Energy bolts fired by player or enemies
// Modern vector/neon visual style - NO pixel art

const TILE_SIZE = 40;

export default class Projectile {
  constructor(x, y, vx, vy, owner, damage, color) {
    // owner: 'player' or 'enemy'
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.width = 12;
    this.height = 6;
    this.owner = owner;
    this.damage = damage || 10;
    this.color = color || '#ff00aa';
    this.alive = true;
    this.trail = []; // Array of {x, y, alpha}
    this.lifetime = 3; // seconds before auto-destroy
    this.globalTime = 0;
    this.speed = Math.sqrt(vx * vx + vy * vy);
    this.angle = Math.atan2(vy, vx);
  }

  update(dt) {
    if (!this.alive) return;

    this.globalTime += dt;

    // Store trail position
    this.trail.push({ x: this.x, y: this.y, alpha: 1.0 });
    if (this.trail.length > 10) this.trail.shift();

    // Fade trail
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = (i + 1) / this.trail.length;
    }

    // Move
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Update angle based on velocity
    this.angle = Math.atan2(this.vy, this.vx);

    // Decrease lifetime
    this.lifetime -= dt;
    if (this.lifetime <= 0) {
      this.destroy();
    }
  }

  render(ctx) {
    if (!this.alive) return;

    const cx = this.x;
    const cy = this.y;

    // --- Trail ---
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const progress = (i + 1) / this.trail.length;
      const trailSize = 3 + progress * 4;

      ctx.save();
      ctx.globalAlpha = t.alpha * 0.5;
      ctx.translate(t.x, t.y);
      ctx.rotate(this.angle);

      // Trail segment - elongated ellipse fading out
      const trailGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, trailSize);
      trailGrad.addColorStop(0, this.color);
      trailGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = trailGrad;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 4;

      ctx.beginPath();
      ctx.ellipse(0, 0, trailSize * 1.5, trailSize * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // --- Main projectile body ---
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.angle);

    // Outer glow
    const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
    outerGrad.addColorStop(0, this.color + '60');
    outerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Energy bolt shape - pointed elongated form
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 20;

    // Main body gradient
    const bodyGrad = ctx.createLinearGradient(-8, 0, 8, 0);
    bodyGrad.addColorStop(0, 'transparent');
    bodyGrad.addColorStop(0.3, this.color);
    bodyGrad.addColorStop(0.7, '#ffffff');
    bodyGrad.addColorStop(1, this.color);

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(8, 0);      // tip
    ctx.lineTo(2, -3);     // top right
    ctx.lineTo(-6, -2);   // top left
    ctx.lineTo(-8, 0);    // tail
    ctx.lineTo(-6, 2);    // bottom left
    ctx.lineTo(2, 3);     // bottom right
    ctx.closePath();
    ctx.fill();

    // Bright core
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(1, 0, 4, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Leading point flare
    const flarePulse = 2 + Math.sin(this.globalTime * 20) * 1;
    const flareGrad = ctx.createRadialGradient(7, 0, 0, 7, 0, flarePulse);
    flareGrad.addColorStop(0, '#ffffff');
    flareGrad.addColorStop(0.5, this.color);
    flareGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = flareGrad;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(7, 0, flarePulse, 0, Math.PI * 2);
    ctx.fill();

    // Energy lines along body
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4 + Math.sin(this.globalTime * 15) * 0.2;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.stroke();

    ctx.restore();
  }

  /** Check if projectile overlaps with a rectangle */
  overlaps(rx, ry, rw, rh) {
    return this.x - 6 < rx + rw &&
           this.x + 6 > rx &&
           this.y - 3 < ry + rh &&
           this.y + 3 > ry;
  }

  /** Check if projectile hit a tile */
  hitsTile(tiles) {
    if (!tiles) return false;
    const col = Math.floor(this.x / TILE_SIZE);
    const row = Math.floor(this.y / TILE_SIZE);
    if (row < 0 || row >= tiles.length || col < 0 || col >= tiles[0].length) return true;
    return tiles[row][col] === 1 || tiles[row][col] === 2 || tiles[row][col] === 3;
  }

  destroy() {
    this.alive = false;
  }
}

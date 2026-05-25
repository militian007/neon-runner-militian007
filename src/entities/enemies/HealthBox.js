import Enemy from '../Enemy.js';

export default class HealthBox extends Enemy {
  constructor(x, y) {
    super(x, y, 'health_box');
    this.width = 30;
    this.height = 30;
    this.health = 1; // Breaks in one hit
    this.maxHealth = 1;
    this.damage = 0; // No contact damage
    this.affectedByGravity = true;
    this.scoreValue = 50;
  }

  update(dt, tiles, playerX, playerY) {
    return super.update(dt, tiles, playerX, playerY);
  }

  render(ctx) {
    if (this.dying || !this.alive) {
      super.render(ctx);
      return;
    }

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;

    ctx.save();

    // Health box styling: neon green cube with health cross inside
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff88';
    
    // Draw box border
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(0, 30, 15, 0.7)';
    ctx.strokeRect(this.x, this.y, this.width, this.height);
    ctx.fillRect(this.x, this.y, this.width, this.height);

    // Draw tech brackets on corners
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    const b = 5; // bracket length
    
    // Top-Left bracket
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + b);
    ctx.lineTo(this.x, this.y);
    ctx.lineTo(this.x + b, this.y);
    ctx.stroke();

    // Top-Right bracket
    ctx.beginPath();
    ctx.moveTo(this.x + this.width - b, this.y);
    ctx.lineTo(this.x + this.width, this.y);
    ctx.lineTo(this.x + this.width, this.y + b);
    ctx.stroke();

    // Bottom-Left bracket
    ctx.beginPath();
    ctx.moveTo(this.x, this.y + this.height - b);
    ctx.lineTo(this.x, this.y + this.height);
    ctx.lineTo(this.x + b, this.y + this.height);
    ctx.stroke();

    // Bottom-Right bracket
    ctx.beginPath();
    ctx.moveTo(this.x + this.width - b, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height);
    ctx.lineTo(this.x + this.width, this.y + this.height - b);
    ctx.stroke();

    // Green cross inside
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(cx - 2, cy - 6, 4, 12);
    ctx.fillRect(cx - 6, cy - 2, 12, 4);

    // Minor internal grid lines
    ctx.strokeStyle = 'rgba(0, 255, 136, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(this.x, cy);
    ctx.lineTo(this.x + this.width, cy);
    ctx.moveTo(cx, this.y);
    ctx.lineTo(cx, this.y + this.height);
    ctx.stroke();

    this.applyHurtTint(ctx);
    ctx.restore();
  }
}

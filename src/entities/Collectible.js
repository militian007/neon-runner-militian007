// Collectible.js - Pickups: data chips (energy), health packs, extra lives
// Modern vector/neon visual style - NO pixel art

const TILE_SIZE = 40;

export default class Collectible {
  constructor(x, y, type) {
    // type: 'chip' (data chip = energy), 'health' (health pack), 'life' (extra life)
    this.x = x;
    this.y = y;
    this.width = 24;
    this.height = 24;
    this.type = type;
    this.collected = false;
    this.bobTimer = Math.random() * Math.PI * 2;
    this.baseY = y;
    this.rotation = Math.random() * Math.PI * 2;
    this.sparkles = [];
    this.globalTime = Math.random() * 10;

    // Colors per type
    this.colors = {
      chip: { primary: '#d000ff', secondary: '#00f0ff', glow: '#ff00aa' },
      health: { primary: '#00ff88', secondary: '#00cc66', glow: '#00ff88' },
      life: { primary: '#00f0ff', secondary: '#0088ff', glow: '#00f0ff' }
    };
  }

  update(dt) {
    if (this.collected) return;

    this.globalTime += dt;
    this.bobTimer += dt * 3;
    this.rotation += dt * 1.5;

    // Bobbing
    this.y = this.baseY + Math.sin(this.bobTimer) * 4;

    // Sparkle particles
    if (Math.random() < 0.15) {
      const col = this.colors[this.type];
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * 10;
      this.sparkles.push({
        x: this.x + this.width / 2 + Math.cos(angle) * dist,
        y: this.y + this.height / 2 + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 0.3,
        vy: -(Math.random() * 1.5 + 0.5),
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 1 + Math.random() * 2,
        color: Math.random() > 0.3 ? col.primary : '#ffffff'
      });
    }

    // Update sparkles
    for (let i = this.sparkles.length - 1; i >= 0; i--) {
      const s = this.sparkles[i];
      s.x += s.vx;
      s.y += s.vy;
      s.life -= dt;
      if (s.life <= 0) this.sparkles.splice(i, 1);
    }
  }

  render(ctx) {
    if (this.collected) return;

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const col = this.colors[this.type];

    // --- Sparkles (behind) ---
    for (const s of this.sparkles) {
      const alpha = s.life / s.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // --- Ambient glow ---
    ctx.save();
    const glowPulse = 18 + Math.sin(this.globalTime * 4) * 5;
    const ambientGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowPulse);
    ambientGrad.addColorStop(0, col.glow + '30');
    ambientGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, glowPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy);

    if (this.type === 'chip') {
      this._renderChip(ctx, col);
    } else if (this.type === 'health') {
      this._renderHealth(ctx, col);
    } else if (this.type === 'life') {
      this._renderLife(ctx, col);
    }

    ctx.restore();
  }

  _renderChip(ctx, col) {
    // Unstable dimensional rift (vertical jagged tear)
    ctx.save();

    // Unstable vibration scale
    const vibration = 1 + Math.sin(this.globalTime * 25) * 0.08;
    ctx.scale(vibration, 1);

    // Outer thick glow path
    ctx.strokeStyle = col.primary;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = col.glow;
    ctx.shadowBlur = 18;

    const jitter = Math.sin(this.globalTime * 30) * 1.5;

    ctx.beginPath();
    ctx.moveTo(0 + jitter * 0.2, -14);
    ctx.lineTo(-4 + jitter, -7);
    ctx.lineTo(4 - jitter, 0);
    ctx.lineTo(-3 + jitter, 7);
    ctx.lineTo(0 - jitter * 0.2, 14);
    ctx.stroke();

    // Inner glowing path
    ctx.strokeStyle = col.secondary;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0 + jitter * 0.2, -14);
    ctx.lineTo(-4 + jitter, -7);
    ctx.lineTo(4 - jitter, 0);
    ctx.lineTo(-3 + jitter, 7);
    ctx.lineTo(0 - jitter * 0.2, 14);
    ctx.stroke();

    // Core bright white tear
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(-4 * 0.5 + jitter * 0.5, -7);
    ctx.lineTo(4 * 0.5 - jitter * 0.5, 0);
    ctx.lineTo(-3 * 0.5 + jitter * 0.5, 7);
    ctx.lineTo(0, 14);
    ctx.stroke();

    ctx.restore();
  }

  _renderHealth(ctx, col) {
    // Green cross with glow
    const pulse = 1 + Math.sin(this.globalTime * 3) * 0.1;

    ctx.save();
    ctx.scale(pulse, pulse);

    // Background circle
    ctx.fillStyle = '#0d1b2a';
    ctx.strokeStyle = col.primary;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = col.glow;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cross shape
    ctx.fillStyle = col.primary;
    ctx.shadowBlur = 15;
    ctx.fillRect(-3, -8, 6, 16);
    ctx.fillRect(-8, -3, 16, 6);

    // Bright center
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.5 + Math.sin(this.globalTime * 5) * 0.3;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    // Rotating ring
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = col.primary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 13, this.rotation, this.rotation + Math.PI * 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 13, this.rotation + Math.PI, this.rotation + Math.PI * 2.2);
    ctx.stroke();

    ctx.restore();
  }

  _renderLife(ctx, col) {
    // Glowing skull/cyberpunk heart
    const pulse = 1 + Math.sin(this.globalTime * 4) * 0.08;

    ctx.save();
    ctx.scale(pulse, pulse);

    // Heart shape with cyberpunk style
    ctx.fillStyle = col.primary;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.shadowColor = col.glow;
    ctx.shadowBlur = 18;

    // Geometric heart
    ctx.beginPath();
    ctx.moveTo(0, 9);          // bottom point
    ctx.lineTo(-10, -1);       // left
    ctx.lineTo(-8, -7);        // upper left
    ctx.lineTo(-4, -9);        // top left
    ctx.lineTo(0, -5);         // center dip
    ctx.lineTo(4, -9);         // top right
    ctx.lineTo(8, -7);         // upper right
    ctx.lineTo(10, -1);        // right
    ctx.closePath();
    ctx.fill();

    // Inner circuit pattern
    ctx.strokeStyle = '#0d1b2a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(0, 6);
    ctx.moveTo(-5, -3);
    ctx.lineTo(5, -3);
    ctx.stroke();

    // Bright core
    const coreGrad = ctx.createRadialGradient(0, -1, 0, 0, -1, 5);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = coreGrad;
    ctx.globalAlpha = 0.6 + Math.sin(this.globalTime * 6) * 0.3;
    ctx.beginPath();
    ctx.arc(0, -1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Outer halo ring
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = col.primary;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  collect() {
    this.collected = true;
  }

  /** Returns { type, value } describing what the player gets */
  getReward() {
    switch (this.type) {
      case 'chip': return { type: 'energy', value: 15 };
      case 'health': return { type: 'health', value: 25 };
      case 'life': return { type: 'life', value: 1 };
      default: return { type: 'energy', value: 10 };
    }
  }
}

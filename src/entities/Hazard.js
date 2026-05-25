// Hazard.js - Environmental hazards: spikes, lasers, electric arcs
// Modern vector/neon visual style - NO pixel art

const TILE_SIZE = 40;

export default class Hazard {
  constructor(x, y, type, config) {
    // type: 'spikes', 'laser_h', 'laser_v', 'electric'
    // config: {width, height, interval, offset}
    this.x = x;
    this.y = y;
    this.type = type;
    if (type === 'laser_vertical') this.type = 'laser_v';
    if (type === 'laser_horizontal') this.type = 'laser_h';
    
    this.config = config || {};
    this.width = config?.width || TILE_SIZE;
    this.height = config?.height || TILE_SIZE;
    this.active = true;
    this.timer = config?.offset || 0;
    this.damage = config?.damage || 20;
    this.globalTime = config?.offset || 0;

    // Laser state
    this.laserWarning = false;
    this.laserAlpha = 1;
    this.computedXStart = this.x;
    this.computedXEnd = this.x + this.width;
    this.computedYStart = this.y;
    this.computedYEnd = this.y + this.height;

    // Electric arc points (pre-generated, regenerated each frame)
    this.arcPoints = [];

    // Particles
    this.particles = [];
  }

  update(dt) {
    this.globalTime += dt;
    this.timer += dt;

    if (this.type === 'laser_h' || this.type === 'laser_v') {
      if (this.config.interval && this.config.interval > 0) {
        const interval = this.config.interval;
        const phase = (this.timer % (interval * 2)) / interval;

        if (phase < 1) {
          // Active phase
          this.active = true;
          this.laserWarning = false;
          this.laserAlpha = 1;

          // Flickering near toggle
          if (phase > 0.85) {
            this.laserWarning = true;
            this.laserAlpha = Math.random() > 0.3 ? 0.8 : 0.2;
          }
        } else {
          // Inactive phase
          this.active = false;
          this.laserWarning = false;
          this.laserAlpha = 0;

          // Warning before turning on
          if (phase > 1.8) {
            this.laserWarning = true;
            this.laserAlpha = Math.random() > 0.6 ? 0.3 : 0.05;
          }
        }
      } else {
        // Permanent laser gate
        this.active = true;
        this.laserWarning = false;
        this.laserAlpha = 1;
      }

      // Laser particles when active
      if (this.active && Math.random() < 0.3) {
        const isH = this.type === 'laser_h';
        this.particles.push({
          x: this.x + Math.random() * (isH ? this.width : 4),
          y: this.y + Math.random() * (isH ? 4 : this.height),
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 0.2 + Math.random() * 0.15,
          maxLife: 0.35,
          size: 1 + Math.random() * 2,
          color: '#ff00aa'
        });
      }
    }

    if (this.type === 'electric') {
      // Regenerate arc points
      this._generateArcPoints();

      // Electric particles
      if (Math.random() < 0.2) {
        const midX = this.x + this.width / 2;
        const midY = this.y + this.height / 2;
        this.particles.push({
          x: midX + (Math.random() - 0.5) * this.width,
          y: midY + (Math.random() - 0.5) * this.height,
          vx: (Math.random() - 0.5) * 3,
          vy: (Math.random() - 0.5) * 3,
          life: 0.15 + Math.random() * 0.1,
          maxLife: 0.25,
          size: 1 + Math.random() * 1.5,
          color: Math.random() > 0.5 ? '#88ccff' : '#ffffff'
        });
      }

      // Pulsing toggle for electric
      if (this.config.interval) {
        const interval = this.config.interval;
        const phase = (this.timer % (interval * 2)) / interval;
        this.active = phase < 1;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _generateArcPoints() {
    this.arcPoints = [];
    const segments = 8 + Math.floor(Math.random() * 4);
    const isVertical = this.height > this.width;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      let px, py;
      if (isVertical) {
        px = this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.6;
        py = this.y + t * this.height;
      } else {
        px = this.x + t * this.width;
        py = this.y + this.height / 2 + (Math.random() - 0.5) * this.height * 0.6;
      }
      this.arcPoints.push({ x: px, y: py });
    }
  }

  render(ctx, tiles) {
    // Render particles
    this._renderParticles(ctx);

    if (this.type === 'spikes') {
      this._renderSpikes(ctx);
    } else if (this.type === 'laser_h') {
      this._renderLaserH(ctx, tiles);
    } else if (this.type === 'laser_v') {
      this._renderLaserV(ctx, tiles);
    } else if (this.type === 'electric') {
      this._renderElectric(ctx);
    }
  }

  _renderSpikes(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const spikeCount = Math.floor(this.width / 10);
    const spikeWidth = this.width / spikeCount;
    const spikeHeight = this.height * 0.85;

    for (let i = 0; i < spikeCount; i++) {
      const sx = i * spikeWidth;
      const wobble = Math.sin(this.globalTime * 2 + i * 0.7) * 0.5;

      // Spike gradient - metallic to red tip
      const spikeGrad = ctx.createLinearGradient(sx + spikeWidth / 2, this.height, sx + spikeWidth / 2, this.height - spikeHeight);
      spikeGrad.addColorStop(0, '#3a3a4e');
      spikeGrad.addColorStop(0.6, '#5a5a6e');
      spikeGrad.addColorStop(0.9, '#ff3333');
      spikeGrad.addColorStop(1, '#ff6666');

      ctx.fillStyle = spikeGrad;
      ctx.shadowColor = '#ff3333';
      ctx.shadowBlur = 4 + Math.sin(this.globalTime * 3 + i) * 2;

      ctx.beginPath();
      ctx.moveTo(sx + 1, this.height);
      ctx.lineTo(sx + spikeWidth / 2 + wobble, this.height - spikeHeight);
      ctx.lineTo(sx + spikeWidth - 1, this.height);
      ctx.closePath();
      ctx.fill();

      // Red glow at tip
      ctx.fillStyle = '#ff3333';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sx + spikeWidth / 2 + wobble, this.height - spikeHeight + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Base metallic strip with caution stripes
    ctx.fillStyle = '#1a1a2e';
    ctx.shadowBlur = 0;
    ctx.fillRect(0, this.height - 8, this.width, 8);

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, this.height - 8, this.width, 8);
    ctx.clip();
    
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 2;
    for (let sx = -8; sx < this.width; sx += 8) {
      ctx.beginPath();
      ctx.moveTo(sx, this.height);
      ctx.lineTo(sx + 6, this.height - 8);
      ctx.stroke();
    }
    ctx.restore();

    // Base edge highlights
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ff3333';
    ctx.shadowBlur = 6;
    ctx.strokeRect(0, this.height - 8, this.width, 8);

    ctx.restore();
  }

  _renderLaserH(ctx, tiles) {
    if (this.laserAlpha <= 0 && !this.laserWarning) return;

    ctx.save();
    ctx.globalAlpha = this.laserAlpha;

    let lxStart = this.x;
    let lxEnd = this.x + this.width;
    const ly = this.y + this.height / 2;

    // Scan for solid tiles to adjust the horizontal beam
    if (tiles && tiles.length > 0) {
      const row = Math.floor(ly / TILE_SIZE);
      const startCol = Math.floor(this.x / TILE_SIZE);

      // Find first solid tile from left to right (scanning rightwards)
      for (let c = startCol; c < tiles[0].length; c++) {
        if (row >= 0 && row < tiles.length && tiles[row] && tiles[row][c] === 1) {
          lxEnd = c * TILE_SIZE;
          break;
        }
      }

      // Find first solid tile from right to left (scanning leftwards)
      for (let c = startCol; c >= 0; c--) {
        if (row >= 0 && row < tiles.length && tiles[row] && tiles[row][c] === 1) {
          lxStart = (c + 1) * TILE_SIZE;
          break;
        }
      }
    }

    this.computedXStart = lxStart;
    this.computedXEnd = lxEnd;

    // Render saw blades or emitter nodes
    if (this.active || this.laserWarning) {
      this._renderSawBlade(ctx, lxStart, ly, 16, this.active);
      this._renderSawBlade(ctx, lxEnd, ly, 16, this.active);
    } else {
      this._renderLaserEmitter(ctx, lxStart, ly);
      this._renderLaserEmitter(ctx, lxEnd, ly);
    }

    if (this.active || this.laserWarning) {
      // Outer glow
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = 'rgba(255, 0, 170, 0.3)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(lxStart, ly);
      ctx.lineTo(lxEnd, ly);
      ctx.stroke();

      // Main beam
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lxStart, ly);
      ctx.lineTo(lxEnd, ly);
      ctx.stroke();

      // Core beam (white)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(lxStart, ly);
      ctx.lineTo(lxEnd, ly);
      ctx.stroke();

      // Scanning pulse
      const beamWidth = lxEnd - lxStart;
      if (this.active && beamWidth > 0) {
        const scanPos = (this.globalTime * 200) % beamWidth;
        const scanGrad = ctx.createRadialGradient(lxStart + scanPos, ly, 0, lxStart + scanPos, ly, 8);
        scanGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        scanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = scanGrad;
        ctx.beginPath();
        ctx.arc(lxStart + scanPos, ly, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _renderLaserV(ctx, tiles) {
    if (this.laserAlpha <= 0 && !this.laserWarning) return;

    ctx.save();
    ctx.globalAlpha = this.laserAlpha;

    const lx = this.x + this.width / 2;
    let lyStart = this.y;
    let lyEnd = this.y + this.height;

    // Scan for solid tiles along the vertical beam
    if (tiles && tiles.length > 0) {
      const col = Math.floor(lx / TILE_SIZE);
      const startRow = Math.floor(this.y / TILE_SIZE);

       // Find first solid tile from top to bottom (scanning downwards)
      let r_floor = tiles.length;
      for (let r = startRow; r < tiles.length; r++) {
        if (col >= 0 && col < tiles[0].length && tiles[r] && tiles[r][col] === 1) {
          lyEnd = r * TILE_SIZE;
          r_floor = r;
          break;
        }
      }

      // Find first solid tile from floor upwards to startRow (scanning upwards)
      for (let r = r_floor - 1; r >= startRow; r--) {
        if (col >= 0 && col < tiles[0].length && tiles[r] && tiles[r][col] === 1) {
          lyStart = (r + 1) * TILE_SIZE;
          break;
        }
      }
    }

    this.computedYStart = lyStart;
    this.computedYEnd = lyEnd;

    // Render saw blades or emitter nodes
    if (this.active || this.laserWarning) {
      this._renderSawBlade(ctx, lx, lyStart, 16, this.active);
      this._renderSawBlade(ctx, lx, lyEnd, 16, this.active);
    } else {
      this._renderLaserEmitter(ctx, lx, lyStart);
      this._renderLaserEmitter(ctx, lx, lyEnd);
    }

    if (this.active || this.laserWarning) {
      // Outer glow
      ctx.shadowColor = '#ff00aa';
      ctx.shadowBlur = 20;
      ctx.strokeStyle = 'rgba(255, 0, 170, 0.3)';
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(lx, lyStart);
      ctx.lineTo(lx, lyEnd);
      ctx.stroke();

      // Main beam
      ctx.strokeStyle = '#ff00aa';
      ctx.lineWidth = 3;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.moveTo(lx, lyStart);
      ctx.lineTo(lx, lyEnd);
      ctx.stroke();

      // Core (white)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(lx, lyStart);
      ctx.lineTo(lx, lyEnd);
      ctx.stroke();

      // Scanning pulse
      const beamHeight = lyEnd - lyStart;
      if (this.active && beamHeight > 0) {
        const scanPos = (this.globalTime * 200) % beamHeight;
        const scanGrad = ctx.createRadialGradient(lx, lyStart + scanPos, 0, lx, lyStart + scanPos, 8);
        scanGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        scanGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = scanGrad;
        ctx.beginPath();
        ctx.arc(lx, lyStart + scanPos, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  _renderLaserEmitter(ctx, ex, ey) {
    // Small metallic node
    ctx.save();
    ctx.fillStyle = '#3a3a4e';
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#ff00aa';
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner dot
    ctx.fillStyle = this.active ? '#ff00aa' : '#553355';
    ctx.shadowBlur = this.active ? 12 : 3;
    ctx.beginPath();
    ctx.arc(ex, ey, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderSawBlade(ctx, cx, cy, radius, active) {
    ctx.save();
    ctx.translate(cx, cy);
    
    // Rotate based on time
    const rotationSpeed = active ? 8 : 1.5;
    ctx.rotate(this.globalTime * rotationSpeed);

    const teethCount = 10;
    const innerRadius = radius * 0.65;
    const outerRadius = radius;

    // Draw the saw teeth
    ctx.fillStyle = active ? '#1e0008' : '#221122';
    ctx.strokeStyle = active ? '#ff00aa' : '#552244';
    ctx.lineWidth = 1.5;
    ctx.shadowColor = active ? '#ff00aa' : 'transparent';
    ctx.shadowBlur = active ? 12 : 0;

    ctx.beginPath();
    for (let i = 0; i < teethCount; i++) {
      const angle = (i * Math.PI * 2) / teethCount;
      const nextAngle = ((i + 0.5) * Math.PI * 2) / teethCount;
      const endAngle = ((i + 1) * Math.PI * 2) / teethCount;

      ctx.lineTo(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius);
      ctx.lineTo(Math.cos(nextAngle) * outerRadius, Math.sin(nextAngle) * outerRadius);
      ctx.lineTo(Math.cos(endAngle) * innerRadius, Math.sin(endAngle) * innerRadius);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central metal plate
    ctx.fillStyle = '#3a3a4e';
    ctx.strokeStyle = active ? '#ffffff' : '#666688';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Central bolt
    ctx.fillStyle = active ? '#ff00aa' : '#553355';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderElectric(ctx) {
    if (!this.active) return;

    ctx.save();

    const pulse = 0.6 + Math.sin(this.globalTime * 8) * 0.4;

    // Ambient glow
    const midX = this.x + this.width / 2;
    const midY = this.y + this.height / 2;
    const ambientGrad = ctx.createRadialGradient(midX, midY, 0, midX, midY, Math.max(this.width, this.height) * 0.6);
    ambientGrad.addColorStop(0, `rgba(100, 180, 255, ${0.1 * pulse})`);
    ambientGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = ambientGrad;
    ctx.beginPath();
    ctx.arc(midX, midY, Math.max(this.width, this.height) * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Draw multiple arc layers
    for (let layer = 0; layer < 3; layer++) {
      if (this.arcPoints.length < 2) continue;

      ctx.strokeStyle = layer === 0 ? '#88ccff' : layer === 1 ? '#aaddff' : '#ffffff';
      ctx.lineWidth = layer === 0 ? 3 : layer === 1 ? 1.5 : 0.8;
      ctx.shadowColor = '#44aaff';
      ctx.shadowBlur = layer === 0 ? 15 : 8;
      ctx.globalAlpha = pulse * (layer === 0 ? 0.5 : layer === 1 ? 0.7 : 1);

      ctx.beginPath();
      ctx.moveTo(this.arcPoints[0].x + (Math.random() - 0.5) * 2 * layer,
                 this.arcPoints[0].y + (Math.random() - 0.5) * 2 * layer);
      for (let i = 1; i < this.arcPoints.length; i++) {
        ctx.lineTo(this.arcPoints[i].x + (Math.random() - 0.5) * 3 * layer,
                   this.arcPoints[i].y + (Math.random() - 0.5) * 3 * layer);
      }
      ctx.stroke();
    }

    // Endpoint nodes
    if (this.arcPoints.length > 0) {
      const first = this.arcPoints[0];
      const last = this.arcPoints[this.arcPoints.length - 1];

      for (const node of [first, last]) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = '#44aaff';
        ctx.shadowBlur = 12;
        ctx.globalAlpha = pulse;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3, 0, Math.PI * 2);
        ctx.fill();

        // Node ring
        ctx.strokeStyle = '#88ccff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 5 + Math.sin(this.globalTime * 6) * 1, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  _renderParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /** Get the damage hitbox (only when active) */
  getHitbox() {
    if (!this.active) return null;

    if (this.type === 'spikes') {
      // Slightly smaller than visual to be fair
      return {
        x: this.x + 2,
        y: this.y + this.height * 0.3,
        width: this.width - 4,
        height: this.height * 0.7
      };
    }

    if (this.type === 'laser_h') {
      return {
        x: this.computedXStart,
        y: this.y + this.height / 2 - 4,
        width: this.computedXEnd - this.computedXStart,
        height: 8
      };
    }

    if (this.type === 'laser_v') {
      return {
        x: this.x + this.width / 2 - 4,
        y: this.computedYStart,
        width: 8,
        height: this.computedYEnd - this.computedYStart
      };
    }

    if (this.type === 'electric') {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height
      };
    }

    return null;
  }
}

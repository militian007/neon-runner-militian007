// Interactive.js - Interactive objects: terminals, doors, elevators, checkpoints
// Modern vector/neon visual style - NO pixel art

const TILE_SIZE = 40;

export default class Interactive {
  constructor(x, y, type, config) {
    // type: 'terminal', 'door', 'elevator', 'checkpoint'
    // config: {target, action, message}
    this.x = x;
    this.y = y;
    this.type = type;
    this.config = config || {};
    this.activated = false;
    this.animTimer = 0;
    this.showPrompt = false;
    this.globalTime = 0;

    // Dimensions based on type
    switch (type) {
      case 'door':
        this.width = TILE_SIZE;
        this.height = TILE_SIZE * 2;
        this.doorOpenProgress = 0; // 0 = closed, 1 = open
        break;
      case 'elevator':
        this.width = TILE_SIZE * 2;
        this.height = TILE_SIZE / 2;
        break;
      case 'checkpoint':
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        this.pillarHeight = 0;
        this.pillarMaxHeight = 80;
        break;
      case 'terminal':
      default:
        this.width = TILE_SIZE;
        this.height = TILE_SIZE;
        break;
    }

    // Screen content for terminal
    this.terminalLines = [];
    this._generateTerminalText();

    // Prompt animation
    this.promptPulse = 0;

    // Particles for checkpoint
    this.particles = [];
  }

  _generateTerminalText() {
    const lines = [
      '> SYS.INIT...',
      '> NEON_LINK v3.7',
      '> AUTH: GRANTED',
      '> SCAN: 0xF4C8',
      '> UPLINK READY',
      '> DATA: 98.2%',
      '> ROUTE: CLEAR',
      '> NODE: ACTIVE'
    ];
    this.terminalLines = [];
    for (let i = 0; i < 5; i++) {
      this.terminalLines.push(lines[Math.floor(Math.random() * lines.length)]);
    }
  }

  update(dt, playerDist) {
    this.globalTime += dt;
    this.animTimer += dt;
    this.promptPulse += dt * 4;

    // Show F prompt if player is within range and NOT already activated (for checkpoints and terminals)
    const interactRange = 60;
    const canInteract = !this.activated || (this.type !== 'checkpoint' && this.type !== 'terminal');
    this.showPrompt = playerDist !== undefined && playerDist < interactRange && canInteract;

    // Door animation
    if (this.type === 'door') {
      const targetOpen = this.activated ? 1 : 0;
      this.doorOpenProgress += (targetOpen - this.doorOpenProgress) * dt * 5;
      this.doorOpenProgress = Math.max(0, Math.min(1, this.doorOpenProgress));
    }

    // Checkpoint activation animation
    if (this.type === 'checkpoint' && this.activated) {
      if (this.pillarHeight < this.pillarMaxHeight) {
        this.pillarHeight = Math.min(this.pillarMaxHeight, this.pillarHeight + dt * 200);
      }

      // Floating particles
      if (Math.random() < 0.3) {
        this.particles.push({
          x: this.x + this.width / 2 + (Math.random() - 0.5) * 15,
          y: this.y + this.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -(Math.random() * 3 + 1),
          life: 1 + Math.random() * 0.5,
          maxLife: 1.5,
          size: 1 + Math.random() * 2,
          color: Math.random() > 0.5 ? '#00f0ff' : '#ffffff'
        });
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

  render(ctx) {
    // Render particles (behind)
    this._renderParticles(ctx);

    if (this.type === 'terminal') {
      this._renderTerminal(ctx);
    } else if (this.type === 'door') {
      this._renderDoor(ctx);
    } else if (this.type === 'elevator') {
      this._renderElevator(ctx);
    } else if (this.type === 'checkpoint') {
      this._renderCheckpoint(ctx);
    }

    // F prompt
    if (this.showPrompt && !this.activated) {
      this._renderPrompt(ctx);
    }
  }

  _renderTerminal(ctx) {
    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Terminal body
    const bodyGrad = ctx.createLinearGradient(x, y, x, y + h);
    bodyGrad.addColorStop(0, '#1a2a1a');
    bodyGrad.addColorStop(1, '#0d1b0d');
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = this.activated ? 15 : 6;
    ctx.fillRect(x, y, w, h);

    // Screen border
    ctx.strokeStyle = this.activated ? '#00ff88' : '#006633';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 3, y + 3, w - 6, h - 10);

    // Screen content
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 4, y + 4, w - 8, h - 12);
    ctx.clip();

    // Screen background with scan lines
    ctx.fillStyle = 'rgba(0, 20, 0, 0.9)';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 12);

    // Scan lines
    ctx.globalAlpha = 0.1;
    for (let sy = 0; sy < h - 12; sy += 2) {
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(x + 4, y + 4 + sy, w - 8, 1);
    }
    ctx.globalAlpha = 1;

    // Scrolling text
    ctx.fillStyle = '#00ff88';
    ctx.font = '7px monospace';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 4;
    const scrollOffset = (this.globalTime * 15) % (this.terminalLines.length * 9 + 20);
    for (let i = 0; i < this.terminalLines.length; i++) {
      const textY = y + 12 + i * 9 - scrollOffset % (this.terminalLines.length * 9 + 20);
      if (textY > y + 2 && textY < y + h - 10) {
        ctx.fillText(this.terminalLines[i], x + 6, textY);
      }
    }

    // Cursor blink
    if (Math.floor(this.globalTime * 2) % 2 === 0) {
      const cursorY = y + 12 + this.terminalLines.length * 9 - scrollOffset % (this.terminalLines.length * 9 + 20);
      if (cursorY > y + 2 && cursorY < y + h - 10) {
        ctx.fillRect(x + 6, cursorY - 6, 4, 7);
      }
    }

    ctx.restore();

    // Status LED
    ctx.fillStyle = this.activated ? '#00ff88' : '#004422';
    ctx.shadowColor = this.activated ? '#00ff88' : '#004422';
    ctx.shadowBlur = this.activated ? 8 : 2;
    ctx.beginPath();
    ctx.arc(x + w - 8, y + h - 5, 2, 0, Math.PI * 2);
    ctx.fill();

    // Base stand
    ctx.fillStyle = '#2a2a3e';
    ctx.shadowBlur = 0;
    ctx.fillRect(x + w / 2 - 5, y + h, 10, 4);
    ctx.fillRect(x + w / 2 - 10, y + h + 3, 20, 2);

    ctx.restore();
  }

  _renderDoor(ctx) {
    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;
    const openOffset = this.doorOpenProgress * (h / 2 - 4);

    ctx.save();

    // Door frame
    ctx.fillStyle = '#3a3a4e';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.fillRect(x - 3, y - 2, w + 6, h + 4);

    // Frame neon outline
    ctx.strokeStyle = this.activated ? '#00ff88' : '#00f0ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.strokeRect(x - 2, y - 1, w + 4, h + 2);

    // Door panels (top and bottom sliding)
    const panelColor = '#1a1a2e';

    // Top panel
    ctx.fillStyle = panelColor;
    ctx.shadowBlur = 0;
    ctx.fillRect(x, y, w, h / 2 - openOffset);

    // Bottom panel
    ctx.fillRect(x, y + h / 2 + openOffset, w, h / 2 - openOffset);

    // Panel edge lines
    ctx.strokeStyle = this.activated ? 'rgba(0, 255, 136, 0.5)' : 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 6;

    // Top panel bottom edge
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h / 2 - openOffset);
    ctx.lineTo(x + w - 2, y + h / 2 - openOffset);
    ctx.stroke();

    // Bottom panel top edge
    ctx.beginPath();
    ctx.moveTo(x + 2, y + h / 2 + openOffset);
    ctx.lineTo(x + w - 2, y + h / 2 + openOffset);
    ctx.stroke();

    // Panel detail lines (tech grooves)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.shadowBlur = 0;

    for (let i = 1; i < 4; i++) {
      // Top panel
      const ty = y + (h / 2 - openOffset) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(x + 4, ty);
      ctx.lineTo(x + w - 4, ty);
      ctx.stroke();

      // Bottom panel
      const by = y + h / 2 + openOffset + (h / 2 - openOffset) * (i / 4);
      ctx.beginPath();
      ctx.moveTo(x + 4, by);
      ctx.lineTo(x + w - 4, by);
      ctx.stroke();
    }

    // Center split line glow (gap between panels)
    if (this.doorOpenProgress > 0.01) {
      const gapGrad = ctx.createLinearGradient(x, y + h / 2 - openOffset, x, y + h / 2 + openOffset);
      gapGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
      gapGrad.addColorStop(0.3, 'rgba(0, 240, 255, 0.3)');
      gapGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.5)');
      gapGrad.addColorStop(0.7, 'rgba(0, 240, 255, 0.3)');
      gapGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
      ctx.fillStyle = gapGrad;
      ctx.fillRect(x, y + h / 2 - openOffset, w, openOffset * 2);
    }

    // Lock indicator
    const lockColor = this.activated ? '#00ff88' : '#ff3333';
    ctx.fillStyle = lockColor;
    ctx.shadowColor = lockColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _renderElevator(ctx) {
    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;

    ctx.save();

    // Platform surface
    const surfGrad = ctx.createLinearGradient(x, y, x, y + h);
    surfGrad.addColorStop(0, '#3a3a4e');
    surfGrad.addColorStop(1, '#2a2a3e');
    ctx.fillStyle = surfGrad;
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 8;
    ctx.fillRect(x, y, w, h);

    // Edge glow
    ctx.strokeStyle = '#ffe600';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w, y);
    ctx.stroke();

    // Side edges
    ctx.strokeStyle = 'rgba(255, 230, 0, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + h);
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h);
    ctx.stroke();

    // Arrow indicators
    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 6;
    const arrowBob = Math.sin(this.globalTime * 4) * 3;

    // Up arrow
    ctx.beginPath();
    ctx.moveTo(x + 15, y - 8 + arrowBob);
    ctx.lineTo(x + 20, y - 14 + arrowBob);
    ctx.lineTo(x + 25, y - 8 + arrowBob);
    ctx.closePath();
    ctx.fill();

    // Down arrow
    ctx.beginPath();
    ctx.moveTo(x + w - 25, y - 4 - arrowBob);
    ctx.lineTo(x + w - 20, y - 10 - arrowBob);
    ctx.lineTo(x + w - 15, y - 4 - arrowBob);
    ctx.closePath();
    ctx.fill();

    // Safety stripes on platform
    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffe600';
    const stripeW = 6;
    for (let sx = 0; sx < w; sx += stripeW * 2) {
      ctx.fillRect(x + sx, y, stripeW, h);
    }
    ctx.restore();

    ctx.restore();
  }

  _renderCheckpoint(ctx) {
    const x = this.x;
    const y = this.y;
    const cx = x + this.width / 2;
    const baseY = y + this.height;

    ctx.save();

    // Base pad
    const padGrad = ctx.createLinearGradient(x - 5, baseY, x + this.width + 5, baseY);
    padGrad.addColorStop(0, 'transparent');
    padGrad.addColorStop(0.2, this.activated ? '#00f0ff' : '#334455');
    padGrad.addColorStop(0.5, this.activated ? '#00f0ff' : '#334455');
    padGrad.addColorStop(0.8, this.activated ? '#00f0ff' : '#334455');
    padGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = padGrad;
    ctx.shadowColor = this.activated ? '#00f0ff' : '#334455';
    ctx.shadowBlur = this.activated ? 10 : 3;
    ctx.fillRect(x - 5, baseY - 3, this.width + 10, 3);

    // Inactive: pulsing neon beacon pole
    if (!this.activated) {
      // Base circle
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.ellipse(cx, baseY - 2, 10, 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Vertical pole
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 2);
      ctx.lineTo(cx, baseY - 25);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, baseY - 2);
      ctx.lineTo(cx, baseY - 25);
      ctx.stroke();

      // Pulsing top sphere/diamond
      const pulse = 0.5 + Math.sin(this.globalTime * 4) * 0.3;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10 + pulse * 6;
      
      ctx.save();
      ctx.translate(cx, baseY - 28 + Math.sin(this.globalTime * 3) * 1.5);
      ctx.rotate(this.globalTime * 1.5);
      
      // Draw a nice diamond
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(4, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Ring around the top
      ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 + pulse * 0.3})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, baseY - 28 + Math.sin(this.globalTime * 3) * 1.5, 8 + pulse * 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
      return;
    }

    // Active: pillar of light
    const pillarAlpha = 0.15 + Math.sin(this.globalTime * 3) * 0.05;
    const pillarGrad = ctx.createLinearGradient(cx, baseY, cx, baseY - this.pillarHeight);
    pillarGrad.addColorStop(0, `rgba(0, 240, 255, ${pillarAlpha + 0.1})`);
    pillarGrad.addColorStop(0.5, `rgba(0, 240, 255, ${pillarAlpha})`);
    pillarGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = pillarGrad;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 20;

    // Tapered pillar shape
    const baseW = 16;
    const topW = 6;
    ctx.beginPath();
    ctx.moveTo(cx - baseW / 2, baseY);
    ctx.lineTo(cx - topW / 2, baseY - this.pillarHeight);
    ctx.lineTo(cx + topW / 2, baseY - this.pillarHeight);
    ctx.lineTo(cx + baseW / 2, baseY);
    ctx.closePath();
    ctx.fill();

    // Core beam
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx, baseY - this.pillarHeight);
    ctx.stroke();

    // Bright core line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.lineTo(cx, baseY - this.pillarHeight);
    ctx.stroke();

    // Horizontal rings going up
    const ringCount = 4;
    for (let i = 0; i < ringCount; i++) {
      const ringY = baseY - (this.pillarHeight * (i + 1) / (ringCount + 1));
      const ringProgress = (this.globalTime * 2 + i * 0.5) % 1;
      const ringAlpha = 0.2 + Math.sin(this.globalTime * 4 + i * 1.5) * 0.1;
      const ringW = baseW * (1 - (i / ringCount) * 0.5);

      ctx.strokeStyle = `rgba(0, 240, 255, ${ringAlpha})`;
      ctx.lineWidth = 1;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(cx, ringY, ringW / 2, 2, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Floating data fragments
    for (let i = 0; i < 3; i++) {
      const fragAngle = this.globalTime * 2 + i * (Math.PI * 2 / 3);
      const fragDist = 10 + Math.sin(this.globalTime * 3 + i) * 3;
      const fragY = baseY - this.pillarHeight * 0.3 - i * 15 + Math.sin(this.globalTime * 2 + i) * 5;

      ctx.fillStyle = '#00f0ff';
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.6 + Math.sin(this.globalTime * 4 + i * 2) * 0.2;

      ctx.save();
      ctx.translate(cx + Math.cos(fragAngle) * fragDist, fragY);
      ctx.rotate(fragAngle * 2);
      ctx.fillRect(-2, -2, 4, 4);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  _renderPrompt(ctx) {
    const cx = this.x + this.width / 2;
    const cy = this.y - 20;
    const pulse = Math.sin(this.promptPulse) * 0.2 + 0.8;

    ctx.save();
    ctx.translate(cx, cy);

    // Background pill
    ctx.fillStyle = 'rgba(10, 10, 15, 0.85)';
    ctx.strokeStyle = `rgba(0, 240, 255, ${pulse})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;

    // Rounded rect background
    const pw = 18;
    const ph = 18;
    ctx.beginPath();
    ctx.roundRect(-pw / 2, -ph / 2, pw, ph, 4);
    ctx.fill();
    ctx.stroke();

    // "F" text
    ctx.fillStyle = `rgba(0, 240, 255, ${pulse})`;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 8;
    ctx.fillText('F', 0, 1);

    // Bobbing arrow below
    const arrowY = ph / 2 + 3 + Math.sin(this.promptPulse * 2) * 2;
    ctx.fillStyle = `rgba(0, 240, 255, ${pulse * 0.6})`;
    ctx.beginPath();
    ctx.moveTo(-4, arrowY);
    ctx.lineTo(0, arrowY + 4);
    ctx.lineTo(4, arrowY);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  _renderParticles(ctx) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  interact() {
    if (this.type === 'checkpoint' || this.type === 'terminal') {
      this.activated = true;
    } else {
      this.activated = !this.activated;
    }
    this.animTimer = 0;
    return this.config;
  }

  /** Get collision rect for blocking (only doors when closed) */
  getBlockingRect() {
    if (this.type === 'door' && !this.activated) {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    return null;
  }

  /** Get the platform rect for elevators */
  getPlatformRect() {
    if (this.type === 'elevator') {
      return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
    return null;
  }
}

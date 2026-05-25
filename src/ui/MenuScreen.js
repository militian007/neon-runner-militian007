export default class MenuScreen {
  constructor() {
    this.selectedOption = 0;
    this.options = ['PLAY', 'LEVELS', 'OPTIONS'];
    this.titleGlow = 0;
    this.time = 0;
    this.particles = [];
    this.transitionAlpha = 1;
    this.visible = true;
    this.gridOffset = 0;
    this.wasMouseDown = false;
    this.initParticles();
  }

  initParticles() {
    this.particles = [];
    for (let i = 0; i < 60; i++) {
      this.particles.push({
        x: Math.random() * 1280,
        y: Math.random() * 720,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        size: 1 + Math.random() * 3,
        color: ['#00f0ff', '#ff00aa', '#ffe600', '#8b5cf6'][Math.floor(Math.random() * 4)],
        alpha: 0.2 + Math.random() * 0.4,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt, input) {
    this.time += dt;
    this.titleGlow = 0.5 + Math.sin(this.time * 2) * 0.5;
    this.gridOffset = (this.gridOffset + dt * 20) % 40;

    // Fade in
    if (this.transitionAlpha > 0) {
      this.transitionAlpha = Math.max(0, this.transitionAlpha - dt * 2);
    }

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha = 0.2 + Math.sin(this.time * 2 + p.pulse) * 0.2;
      if (p.x < 0 || p.x > 1280) p.vx *= -1;
      if (p.y < 0 || p.y > 720) p.vy *= -1;
    }

    // Mouse hover & click support
    const mousePos = input.getMousePos();
    const isMouseDown = input.isMouseDown();
    let mouseClicked = false;
    if (isMouseDown && !this.wasMouseDown) {
      mouseClicked = true;
    }
    this.wasMouseDown = isMouseDown;

    const optY = 720 * 0.6;
    const optSpacing = 55;
    const halfW = 120; // total width is 240
    const halfH = 18;  // total height is 36

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * optSpacing;
      const xStart = 1280 / 2 - halfW;
      const xEnd = 1280 / 2 + halfW;
      const yStart = y - halfH;
      const yEnd = y + halfH;

      if (mousePos.x >= xStart && mousePos.x <= xEnd && mousePos.y >= yStart && mousePos.y <= yEnd) {
        this.selectedOption = i;
        if (mouseClicked) {
          return this.options[i].toLowerCase();
        }
      }
    }

    // Keyboard Navigation
    if (input.isPressed('w') || input.isPressed('arrowup')) {
      this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
      return null;
    }
    if (input.isPressed('s') || input.isPressed('arrowdown')) {
      this.selectedOption = (this.selectedOption + 1) % this.options.length;
      return null;
    }
    if (input.isPressed(' ') || input.isPressed('enter')) {
      return this.options[this.selectedOption].toLowerCase();
    }

    return null;
  }

  render(ctx, width, height) {
    // Dark background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Animated grid
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    for (let x = -this.gridOffset; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = -this.gridOffset; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();

    // Floating particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // City silhouette at bottom
    this.renderCitySilhouette(ctx, width, height);

    // Title: "NEON RUNNER"
    const titleY = height * 0.28;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title shadow
    ctx.font = 'bold 72px Orbitron, monospace';
    const glowAlpha = 0.3 + this.titleGlow * 0.3;

    // "NEON" in cyan
    ctx.shadowBlur = 30 + this.titleGlow * 20;
    ctx.shadowColor = '#00f0ff';
    ctx.fillStyle = '#00f0ff';
    ctx.globalAlpha = 0.8 + this.titleGlow * 0.2;
    ctx.fillText('NEON', width / 2 - 5, titleY);

    // Second layer for extra glow
    ctx.globalAlpha = glowAlpha;
    ctx.fillText('NEON', width / 2 - 5, titleY);

    // "RUNNER" in magenta
    ctx.shadowColor = '#ff00aa';
    ctx.fillStyle = '#ff00aa';
    ctx.globalAlpha = 0.8 + this.titleGlow * 0.2;
    ctx.fillText('RUNNER', width / 2, titleY + 75);

    ctx.globalAlpha = glowAlpha;
    ctx.fillText('RUNNER', width / 2, titleY + 75);

    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '16px Rajdhani, sans-serif';
    ctx.fillStyle = '#8b5cf6';
    ctx.globalAlpha = 0.5 + Math.sin(this.time * 3) * 0.2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#8b5cf6';
    ctx.fillText('[ CYBERPUNK PLATFORMER ]', width / 2, titleY + 120);
    ctx.restore();

    // Menu options
    const optY = height * 0.6;
    const optSpacing = 55;
    ctx.save();
    ctx.textAlign = 'center';

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * optSpacing;
      const selected = i === this.selectedOption;

      if (selected) {
        // Selection background
        const bgAlpha = 0.1 + Math.sin(this.time * 4) * 0.05;
        ctx.fillStyle = `rgba(0,240,255,${bgAlpha})`;
        ctx.fillRect(width / 2 - 120, y - 18, 240, 36);

        // Selection border
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.6;
        ctx.strokeRect(width / 2 - 120, y - 18, 240, 36);
        ctx.globalAlpha = 1;

        // Arrow indicators
        ctx.font = '20px Rajdhani, sans-serif';
        ctx.fillStyle = '#00f0ff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f0ff';
        const arrowBounce = Math.sin(this.time * 5) * 5;
        ctx.fillText('▶', width / 2 - 105 - arrowBounce, y + 1);
        ctx.fillText('◀', width / 2 + 105 + arrowBounce, y + 1);
      }

      ctx.font = `${selected ? 'bold ' : ''}28px Rajdhani, sans-serif`;
      ctx.fillStyle = selected ? '#ffffff' : '#556677';
      ctx.shadowBlur = selected ? 15 : 0;
      ctx.shadowColor = selected ? '#00f0ff' : 'transparent';
      ctx.globalAlpha = selected ? 1 : 0.6;
      ctx.fillText(this.options[i], width / 2, y + 2);
    }
    ctx.restore();

    // Bottom hint
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillStyle = '#334455';
    ctx.globalAlpha = 0.5 + Math.sin(this.time * 2) * 0.2;
    ctx.fillText('[ W/S ] Navigate   [ SPACE ] Select', width / 2, height - 40);
    ctx.restore();

    // Fade transition
    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(10,10,15,${this.transitionAlpha})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  renderCitySilhouette(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#0f1520';
    const baseY = height - 40;

    // Random buildings
    const seed = 42;
    for (let i = 0; i < 25; i++) {
      const bx = i * 55 + Math.sin(i * seed) * 15;
      const bw = 25 + Math.sin(i * 7.3) * 15;
      const bh = 40 + Math.sin(i * 3.1) * 60 + 30;
      ctx.fillRect(bx, baseY - bh, bw, bh + 40);
    }

    // Glow line at base
    ctx.globalAlpha = 0.1;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, baseY);
    ctx.lineTo(width, baseY);
    ctx.stroke();

    ctx.restore();
  }

  reset() {
    this.selectedOption = 0;
    this.transitionAlpha = 1;
    this.time = 0;
  }
}

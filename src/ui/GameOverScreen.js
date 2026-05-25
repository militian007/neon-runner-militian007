// ============================================
// NEON RUNNER — GameOverScreen.js
// Renders the Game Over overlay with modern visual cyberpunk style
// ============================================

export default class GameOverScreen {
  constructor() {
    this.selectedOption = 0;
    this.options = ['RETRY', 'MENU'];
    this.time = 0;
    this.glitchOffset = 0;
  }

  update(dt, input) {
    this.time += dt;
    this.glitchOffset = Math.random() > 0.94 ? (Math.random() - 0.5) * 10 : 0;

    // Mouse tracking and click detection
    const mousePos = input.getMousePos();
    const optX = 1280 / 2;
    const optY = 720 * 0.6;
    const spacing = 65;

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * spacing;
      const xStart = optX - 120;
      const xEnd = optX + 120;
      const yStart = y - 18;
      const yEnd = y + 18;

      if (mousePos.x >= xStart && mousePos.x <= xEnd &&
          mousePos.y >= yStart && mousePos.y <= yEnd) {
        if (this.selectedOption !== i) {
          this.selectedOption = i;
          return 'sfx_move';
        }
        if (input.isMouseDown()) {
          return this.options[this.selectedOption].toLowerCase();
        }
      }
    }

    if (input.isPressed('w') || input.isPressed('arrowup') || input.isPressed('a') || input.isPressed('arrowleft')) {
      this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
      return 'sfx_move';
    }
    if (input.isPressed('s') || input.isPressed('arrowdown') || input.isPressed('d') || input.isPressed('arrowright')) {
      this.selectedOption = (this.selectedOption + 1) % this.options.length;
      return 'sfx_move';
    }
    if (input.isPressed(' ') || input.isPressed('enter')) {
      return this.options[this.selectedOption].toLowerCase();
    }

    return null;
  }

  render(ctx, width, height) {
    // Red tint overlay
    ctx.fillStyle = 'rgba(20, 5, 5, 0.82)';
    ctx.fillRect(0, 0, width, height);

    // Grid Scanline Overlay
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < height; y += 4) {
      ctx.fillRect(0, y, width, 2);
    }
    ctx.restore();

    // Glitchy Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 72px Orbitron, monospace';
    
    // Chromatic aberration glow
    if (Math.random() > 0.8) {
      ctx.fillStyle = '#ff00aa';
      ctx.globalAlpha = 0.5;
      ctx.fillText('CONNECTION LOST', width / 2 + 5, height * 0.35 + 3);
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('CONNECTION LOST', width / 2 - 4, height * 0.35 - 2);
    }
    
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ff0055';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#ff0055';
    ctx.fillText('CONNECTION LOST', width / 2 + this.glitchOffset, height * 0.35);
    ctx.restore();

    // Subtitle
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '20px Rajdhani, sans-serif';
    ctx.fillStyle = '#8a99ad';
    ctx.globalAlpha = 0.7;
    ctx.fillText('SYSTEM HAS RUN OUT OF LIVES. PROTOCOL TERMINATED.', width / 2, height * 0.45);
    ctx.restore();

    // Options
    const optX = width / 2;
    const optY = height * 0.6;
    const spacing = 65;

    ctx.save();
    ctx.textAlign = 'center';

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * spacing;
      const selected = i === this.selectedOption;

      if (selected) {
        // Neon Selection box
        ctx.fillStyle = 'rgba(255, 0, 85, 0.08)';
        ctx.fillRect(optX - 120, y - 18, 240, 36);
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(optX - 120, y - 18, 240, 36);

        // Neon corners
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(optX - 122, y - 20, 6, 6);
        ctx.fillRect(optX + 116, y - 20, 6, 6);
        ctx.fillRect(optX - 122, y + 14, 6, 6);
        ctx.fillRect(optX + 116, y + 14, 6, 6);

        // Arrows
        ctx.font = '16px Rajdhani, sans-serif';
        const bounce = Math.sin(this.time * 6) * 5;
        ctx.fillText('▶', optX - 140 - bounce, y + 4);
        ctx.fillText('◀', optX + 140 + bounce, y + 4);
      }

      ctx.font = `${selected ? 'bold ' : ''}26px Rajdhani, sans-serif`;
      ctx.fillStyle = selected ? '#ffffff' : '#663344';
      ctx.shadowBlur = selected ? 12 : 0;
      ctx.shadowColor = '#ff0055';
      ctx.globalAlpha = selected ? 1 : 0.4;
      ctx.fillText(this.options[i], optX, y + 4);
    }

    ctx.restore();

    // Controls hints
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillStyle = '#55333c';
    ctx.globalAlpha = 0.6;
    ctx.fillText('[ W/S ] Navigate   [ SPACE ] Confirm Retry / Menu', width / 2, height - 50);
    ctx.restore();
  }

  reset() {
    this.selectedOption = 0;
    this.time = 0;
  }
}

export default class PauseMenu {
  constructor() {
    this.selectedOption = 0;
    this.options = ['RESUME', 'RESTART', 'OPTIONS', 'QUIT TO MENU'];
    this.time = 0;
    this.glitchOffset = 0;
  }

  update(dt, input) {
    this.time += dt;
    this.glitchOffset = Math.random() > 0.95 ? (Math.random() - 0.5) * 6 : 0;

    // Mouse tracking and click detection
    const mousePos = input.getMousePos();
    const optX = 1280 / 2;
    const optY = 720 * 0.45;
    const spacing = 50;

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * spacing;
      const xStart = optX - 140;
      const xEnd = optX + 140;
      const yStart = y - 16;
      const yEnd = y + 16;

      if (mousePos.x >= xStart && mousePos.x <= xEnd &&
          mousePos.y >= yStart && mousePos.y <= yEnd) {
        if (this.selectedOption !== i) {
          this.selectedOption = i;
          return { action: 'sfx', sfx: 'menu_move' };
        }
        if (input.isMouseDown()) {
          return this.options[this.selectedOption].toLowerCase();
        }
      }
    }

    if (input.isPressed('w') || input.isPressed('arrowup')) {
      this.selectedOption = (this.selectedOption - 1 + this.options.length) % this.options.length;
      return { action: 'sfx', sfx: 'menu_move' };
    }
    if (input.isPressed('s') || input.isPressed('arrowdown')) {
      this.selectedOption = (this.selectedOption + 1) % this.options.length;
      return { action: 'sfx', sfx: 'menu_move' };
    }
    if (input.isPressed(' ') || input.isPressed('enter')) {
      const opt = this.options[this.selectedOption].toLowerCase();
      return opt;
    }
    if (input.isPressed('escape')) {
      return 'resume';
    }

    return null;
  }

  render(ctx, width, height) {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(5,5,10,0.75)';
    ctx.fillRect(0, 0, width, height);

    // Scanline overlay
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }
    ctx.restore();

    // "PAUSED" title with glitch
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 56px Orbitron, monospace';

    // Glitch layers
    if (Math.random() > 0.9) {
      ctx.fillStyle = '#ff0044';
      ctx.globalAlpha = 0.4;
      ctx.fillText('PAUSED', width / 2 + 3, height * 0.3 + 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fillText('PAUSED', width / 2 - 2, height * 0.3 - 1);
    }

    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00f0ff';
    ctx.fillText('PAUSED', width / 2 + this.glitchOffset, height * 0.3);
    ctx.restore();

    // Options
    const optY = height * 0.45;
    const spacing = 50;

    ctx.save();
    ctx.textAlign = 'center';

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * spacing;
      const selected = i === this.selectedOption;

      if (selected) {
        // Selection highlight bar
        ctx.fillStyle = 'rgba(0,240,255,0.08)';
        ctx.fillRect(width / 2 - 140, y - 16, 280, 32);
        ctx.strokeStyle = '#00f0ff';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(width / 2 - 140, y - 16, 280, 32);
        ctx.globalAlpha = 1;

        // Arrows
        ctx.font = '18px Rajdhani, sans-serif';
        ctx.fillStyle = '#00f0ff';
        const bounce = Math.sin(this.time * 5) * 4;
        ctx.fillText('▶', width / 2 - 125 - bounce, y + 2);
        ctx.fillText('◀', width / 2 + 125 + bounce, y + 2);
      }

      ctx.font = `${selected ? 'bold ' : ''}24px Rajdhani, sans-serif`;
      ctx.fillStyle = selected ? '#ffffff' : '#445566';
      ctx.shadowBlur = selected ? 10 : 0;
      ctx.shadowColor = '#00f0ff';
      ctx.globalAlpha = selected ? 1 : 0.5;
      ctx.fillText(this.options[i], width / 2, y + 2);
    }

    ctx.restore();

    // Controls hint
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillStyle = '#334455';
    ctx.globalAlpha = 0.5;
    ctx.fillText('[ ESC ] Resume   [ W/S ] Navigate   [ SPACE ] Select', width / 2, height - 40);
    ctx.restore();
  }

  reset() {
    this.selectedOption = 0;
    this.time = 0;
  }
}

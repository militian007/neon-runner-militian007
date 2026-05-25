// ============================================
// NEON RUNNER — VictoryScreen.js
// Renders the Victory screen when a level is completed successfully
// ============================================

export default class VictoryScreen {
  constructor() {
    this.selectedOption = 0;
    this.options = ['NEXT LEVEL', 'LEVEL SELECT', 'MENU'];
    this.score = 0;
    this.stars = 0;
    this.isLastLevel = false;
    this.time = 0;
    this.starScale = [0, 0, 0];
  }

  setup(score, stars, isLastLevel) {
    this.score = score;
    this.stars = stars;
    this.isLastLevel = isLastLevel;
    this.selectedOption = 0;
    this.time = 0;
    this.starScale = [0, 0, 0];
    
    if (isLastLevel) {
      this.options = ['PLAY AGAIN', 'LEVEL SELECT', 'MENU'];
    } else {
      this.options = ['NEXT LEVEL', 'LEVEL SELECT', 'MENU'];
    }
  }

  update(dt, input) {
    this.time += dt;

    // Animate star popping in
    for (let i = 0; i < 3; i++) {
      const delay = 0.3 + i * 0.25;
      if (this.time > delay) {
        this.starScale[i] = Math.min(1, this.starScale[i] + dt * 5);
      }
    }

    // Mouse tracking and click detection
    const mousePos = input.getMousePos();
    const optX = 1280 / 2;
    const optY = 720 * 0.62;
    const spacing = 50;

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * spacing;
      const xStart = optX - 120;
      const xEnd = optX + 120;
      const yStart = y - 16;
      const yEnd = y + 16;

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
      const selection = this.options[this.selectedOption].toLowerCase();
      return selection;
    }

    return null;
  }

  render(ctx, width, height) {
    // Greenish cyberpunk tint overlay
    ctx.fillStyle = 'rgba(5, 18, 12, 0.85)';
    ctx.fillRect(0, 0, width, height);

    // Glowing border around screen
    ctx.save();
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff88';
    ctx.strokeRect(20, 20, width - 40, height - 40);
    ctx.restore();

    // Scanline Matrix Overlay
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1.5);
    }
    ctx.restore();

    // VICTORY TITLE
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 64px Orbitron, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#00ff88';
    
    const titleText = this.isLastLevel ? 'NEON RUNNER COMPLETED' : 'SECTOR CLEARED';
    ctx.fillText(titleText, width / 2, height * 0.22);
    ctx.restore();

    // STARS RATING
    ctx.save();
    const starSize = 35;
    const starSpacing = 65;
    const starY = height * 0.38;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffe600';
    
    for (let i = 0; i < 3; i++) {
      const x = width / 2 + (i - 1) * starSpacing;
      const filled = i < this.stars;
      const scale = this.starScale[i];
      
      if (scale > 0) {
        ctx.save();
        ctx.translate(x, starY);
        ctx.scale(scale, scale);
        
        ctx.fillStyle = filled ? '#ffe600' : 'rgba(255, 230, 0, 0.1)';
        ctx.strokeStyle = '#ffe600';
        ctx.lineWidth = 2;
        
        this._drawStar(ctx, 0, 0, 5, starSize, starSize / 2);
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
      }
    }
    ctx.restore();

    // SCORE & STATS
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px Rajdhani, sans-serif';
    ctx.fillStyle = '#83e8a2';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ff88';
    ctx.fillText(`DATA EXTRACTED: ${this.score} PTS`, width / 2, height * 0.49);
    
    if (this.isLastLevel) {
      ctx.font = '16px Rajdhani, sans-serif';
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.fillText('ALL NETWORK SECTORS OVERRIDDEN. SYSTEM UNLOCKED.', width / 2, height * 0.54);
    }
    ctx.restore();

    // OPTIONS
    const optX = width / 2;
    const optY = height * 0.62;
    const spacing = 50;

    ctx.save();
    ctx.textAlign = 'center';

    for (let i = 0; i < this.options.length; i++) {
      const y = optY + i * spacing;
      const selected = i === this.selectedOption;

      if (selected) {
        // Selection highlight block
        ctx.fillStyle = 'rgba(0, 255, 136, 0.08)';
        ctx.fillRect(optX - 120, y - 16, 240, 32);
        ctx.strokeStyle = '#00ff88';
        ctx.lineWidth = 1;
        ctx.strokeRect(optX - 120, y - 16, 240, 32);

        // Arrows
        ctx.font = '16px Rajdhani, sans-serif';
        ctx.fillStyle = '#00ff88';
        const bounce = Math.sin(this.time * 6) * 5;
        ctx.fillText('▶', optX - 135 - bounce, y + 4);
        ctx.fillText('◀', optX + 135 + bounce, y + 4);
      }

      ctx.font = `${selected ? 'bold ' : ''}22px Rajdhani, sans-serif`;
      ctx.fillStyle = selected ? '#ffffff' : '#446655';
      ctx.shadowBlur = selected ? 10 : 0;
      ctx.shadowColor = '#00ff88';
      ctx.globalAlpha = selected ? 1 : 0.45;
      ctx.fillText(this.options[i], optX, y + 4);
    }
    ctx.restore();
    
    // Hint
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillStyle = '#3f5e4f';
    ctx.globalAlpha = 0.6;
    ctx.fillText('[ W/S ] Navigate   [ SPACE ] Continue', width / 2, height - 45);
    ctx.restore();
  }

  // Draw star shape helper
  _drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }
}

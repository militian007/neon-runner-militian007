export default class LevelSelect {
  constructor() {
    this.selectedLevel = 1;
    this.unlockedLevels = [1];
    this.completedLevels = {};
    this.scrollOffset = 0;
    this.targetScrollOffset = 0;
    this.time = 0;

    // Drag-to-scroll state
    this.isDragging = false;
    this.hasDragged = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragStartScrollOffset = 0;
    this.wasMouseDown = false;

    this.zoneNames = ['LOWER CITY', 'CORPORATE TOWERS', 'THE GRID', 'SKY FORTRESS'];
    this.zoneColors = ['#00f0ff', '#4488ff', '#00ff88', '#ff8800'];
    this.levelNames = [
      'Despertar', 'Callejón', 'Azoteas', 'Terminal', 'WardenX1',
      'Ascenso', 'Red Interna', 'Laboratorio', 'Ventilación', 'NexusCore',
      'Inmersión', 'Firewall', 'Corrupción', 'Fragmentos', 'MalwareZero',
      'Órbita', 'Arsenal', 'Reactor', 'Velocidad', 'Omega'
    ];

    // Mouse wheel listener (scroll up/down)
    window.addEventListener('wheel', (e) => {
      if (window.__NEON_RUNNER__ && window.__NEON_RUNNER__.state === 'level_select') {
        e.preventDefault();
        // Shift target scroll offset
        this.targetScrollOffset += e.deltaY * 0.5;
        // Clamp scroll offset to keep levels within screen view
        this.targetScrollOffset = Math.max(0, Math.min(500, this.targetScrollOffset));
      }
    }, { passive: false });
  }

  update(dt, input, unlockedLevels, completedLevels) {
    this.time += dt;
    if (unlockedLevels) this.unlockedLevels = unlockedLevels;
    if (completedLevels) this.completedLevels = completedLevels;

    // Smooth scroll interpolation (speed factor 10)
    this.scrollOffset += (this.targetScrollOffset - this.scrollOffset) * Math.min(1, dt * 10);

    // Mouse input handling
    const mousePos = input.getMousePos();
    const isMouseDown = input.isMouseDown();
    let clickReleased = false;

    // Detect drag start
    if (isMouseDown && !this.wasMouseDown) {
      this.isDragging = true;
      this.hasDragged = false;
      this.dragStartX = mousePos.x;
      this.dragStartY = mousePos.y;
      this.dragStartScrollOffset = this.targetScrollOffset;
    }

    // Process dragging
    if (isMouseDown && this.isDragging) {
      const dx = mousePos.x - this.dragStartX;
      const dy = mousePos.y - this.dragStartY;
      // Mark as dragged if mouse has moved more than 6px
      if (Math.abs(dy) > 6 || Math.abs(dx) > 6) {
        this.hasDragged = true;
      }
      this.targetScrollOffset = this.dragStartScrollOffset - dy;
      this.targetScrollOffset = Math.max(0, Math.min(500, this.targetScrollOffset));
    }

    // Detect click release
    if (!isMouseDown && this.wasMouseDown) {
      this.isDragging = false;
      if (!this.hasDragged) {
        clickReleased = true;
      }
    }
    this.wasMouseDown = isMouseDown;

    if (clickReleased) {
      // Check click on Info Panel
      const panelW = 280;
      const panelH = 80;
      const panelX = (1280 - panelW) / 2;
      const panelY = 720 - 120;
      if (mousePos.x >= panelX && mousePos.x <= panelX + panelW &&
          mousePos.y >= panelY && mousePos.y <= panelY + panelH) {
        if (this.unlockedLevels.includes(this.selectedLevel)) {
          return { action: 'select', level: this.selectedLevel };
        }
      }

      // Check click on level nodes
      const zoneStartY = 90 - this.scrollOffset;
      const zoneHeight = 155;
      const nodeRadius = 28;
      const bossRadius = 34;
      const nodeSpacing = 180;
      const startX = (1280 - 4 * nodeSpacing) / 2 + nodeRadius;

      for (let z = 0; z < 4; z++) {
        const zy = zoneStartY + z * zoneHeight;
        for (let l = 0; l < 5; l++) {
          const levelNum = z * 5 + l + 1;
          const isBoss = l === 4;
          const r = isBoss ? bossRadius : nodeRadius;
          const nx = startX + l * nodeSpacing;
          const ny = zy + 70;

          // Check distance
          const distSq = (mousePos.x - nx) ** 2 + (mousePos.y - ny) ** 2;
          if (distSq <= r ** 2) {
            const isUnlocked = this.unlockedLevels.includes(levelNum);
            if (isUnlocked) {
              if (this.selectedLevel === levelNum) {
                return { action: 'select', level: levelNum };
              } else {
                this.selectedLevel = levelNum;
                this.updateScroll();
              }
            }
          }
        }
      }
    }

    // Navigate with A/D or arrows
    if (input.isPressed('a') || input.isPressed('arrowleft')) {
      if (this.selectedLevel > 1) {
        this.selectedLevel--;
        this.updateScroll();
        return { action: 'sfx', sfx: 'menu_move' };
      }
    }
    if (input.isPressed('d') || input.isPressed('arrowright')) {
      if (this.selectedLevel < 20) {
        this.selectedLevel++;
        this.updateScroll();
        return { action: 'sfx', sfx: 'menu_move' };
      }
    }
    // Zone jump with W/S or vertical arrows
    if (input.isPressed('w') || input.isPressed('arrowup')) {
      const zone = Math.ceil(this.selectedLevel / 5);
      if (zone > 1) {
        this.selectedLevel = (zone - 2) * 5 + 1;
        this.updateScroll();
        return { action: 'sfx', sfx: 'menu_move' };
      }
    }
    if (input.isPressed('s') || input.isPressed('arrowdown')) {
      const zone = Math.ceil(this.selectedLevel / 5);
      if (zone < 4) {
        this.selectedLevel = zone * 5 + 1;
        this.updateScroll();
        return { action: 'sfx', sfx: 'menu_move' };
      }
    }

    // Select with ENTER / SPACE
    if (input.isPressed(' ') || input.isPressed('enter')) {
      if (this.unlockedLevels.includes(this.selectedLevel)) {
        return { action: 'select', level: this.selectedLevel };
      }
      return { action: 'sfx', sfx: 'hit' };
    }

    // Back to main menu
    if (input.isPressed('escape')) {
      return { action: 'back' };
    }

    return null;
  }

  updateScroll() {
    const zone = Math.ceil(this.selectedLevel / 5) - 1;
    this.targetScrollOffset = zone * 160;
  }

  render(ctx, width, height) {
    // Background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.save();
    ctx.globalAlpha = 0.03;
    ctx.strokeStyle = '#00f0ff';
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();

    // Title
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px Orbitron, monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f0ff';
    ctx.fillText('LEVEL SELECT', width / 2, 55);
    ctx.restore();

    // Zones
    const zoneStartY = 90 - this.scrollOffset;
    const zoneHeight = 155;
    const nodeRadius = 28;
    const bossRadius = 34;
    const nodeSpacing = 180;
    const startX = (width - 4 * nodeSpacing) / 2 + nodeRadius;

    for (let z = 0; z < 4; z++) {
      const zy = zoneStartY + z * zoneHeight;
      if (zy < -zoneHeight || zy > height + 20) continue;

      // Zone header text
      ctx.save();
      ctx.font = '16px Rajdhani, sans-serif';
      ctx.fillStyle = this.zoneColors[z];
      ctx.globalAlpha = 0.7;
      ctx.shadowBlur = 8;
      ctx.shadowColor = this.zoneColors[z];
      ctx.fillText(`ZONE ${z + 1}: ${this.zoneNames[z]}`, startX - 20, zy + 10);
      ctx.restore();

      // Level nodes loop
      for (let l = 0; l < 5; l++) {
        const levelNum = z * 5 + l + 1;
        const isBoss = l === 4;
        const r = isBoss ? bossRadius : nodeRadius;
        const nx = startX + l * nodeSpacing;
        const ny = zy + 70;

        const isUnlocked = this.unlockedLevels.includes(levelNum);
        const isCompleted = this.completedLevels[levelNum];
        const isSelected = this.selectedLevel === levelNum;

        // Connection line to next node
        if (l < 4) {
          const nextUnlocked = this.unlockedLevels.includes(levelNum + 1);
          ctx.save();
          ctx.strokeStyle = nextUnlocked ? this.zoneColors[z] : '#1a1a2a';
          ctx.lineWidth = 2;
          ctx.globalAlpha = nextUnlocked ? 0.5 : 0.2;
          if (nextUnlocked) {
            ctx.shadowBlur = 6;
            ctx.shadowColor = this.zoneColors[z];
          }
          ctx.beginPath();
          ctx.moveTo(nx + r + 5, ny);
          ctx.lineTo(nx + nodeSpacing - (l === 3 ? bossRadius : nodeRadius) - 5, ny);
          ctx.stroke();
          ctx.restore();
        }

        // Node outline/background drawing
        ctx.save();
        ctx.beginPath();
        if (isBoss) {
          // Hexagonal boss node shape
          for (let p = 0; p < 6; p++) {
            const angle = (Math.PI / 3) * p - Math.PI / 6;
            const px = nx + Math.cos(angle) * r;
            const py = ny + Math.sin(angle) * r;
            p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else {
          ctx.arc(nx, ny, r, 0, Math.PI * 2);
        }

        if (!isUnlocked) {
          // Locked State
          ctx.fillStyle = '#0d0d15';
          ctx.fill();
          ctx.strokeStyle = '#1a1a2a';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Lock Icon
          ctx.fillStyle = '#333';
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🔒', nx, ny);
        } else if (isCompleted) {
          // Completed State
          ctx.fillStyle = this.zoneColors[z] + '33';
          ctx.fill();
          ctx.strokeStyle = this.zoneColors[z];
          ctx.shadowBlur = isSelected ? 20 : 8;
          ctx.shadowColor = this.zoneColors[z];
          ctx.lineWidth = isSelected ? 3 : 2;
          ctx.stroke();

          // Level Number text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${isBoss ? 18 : 16}px Orbitron, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(levelNum), nx, ny - 4);

          // Stars rating
          const stars = isCompleted.stars || 0;
          ctx.font = '10px sans-serif';
          ctx.fillStyle = '#ffe600';
          const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
          ctx.fillText(starStr, nx, ny + 14);
        } else {
          // Unlocked but incomplete
          ctx.fillStyle = '#0a0a15';
          ctx.fill();

          const glowPulse = isSelected ? 0.7 + Math.sin(this.time * 4) * 0.3 : 0.5;
          ctx.strokeStyle = this.zoneColors[z];
          ctx.shadowBlur = isSelected ? 25 : 10;
          ctx.shadowColor = this.zoneColors[z];
          ctx.lineWidth = isSelected ? 3 : 1.5;
          ctx.globalAlpha = glowPulse;
          ctx.stroke();
          ctx.globalAlpha = 1;

          // Level Number
          ctx.fillStyle = isSelected ? '#ffffff' : '#aaaacc';
          ctx.font = `bold ${isBoss ? 18 : 16}px Orbitron, monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(levelNum), nx, ny);
        }

        // Selection Highlight outer ring
        if (isSelected && isUnlocked) {
          ctx.beginPath();
          if (isBoss) {
            for (let p = 0; p < 6; p++) {
              const angle = (Math.PI / 3) * p - Math.PI / 6;
              const px = nx + Math.cos(angle) * (r + 6);
              const py = ny + Math.sin(angle) * (r + 6);
              p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
          } else {
            ctx.arc(nx, ny, r + 6, 0, Math.PI * 2);
          }
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.3 + Math.sin(this.time * 5) * 0.2;
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#ffffff';
          ctx.stroke();
        }

        ctx.restore();

        // Boss label tag
        if (isBoss) {
          ctx.save();
          ctx.font = '10px Rajdhani, sans-serif';
          ctx.fillStyle = '#ff0044';
          ctx.textAlign = 'center';
          ctx.globalAlpha = 0.7;
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#ff0044';
          ctx.fillText('BOSS', nx, ny + r + 16);
          ctx.restore();
        }
      }
    }

    // Render Bottom selected level Info Panel
    this.renderInfoPanel(ctx, width, height);

    // Controls hints text
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '13px Rajdhani, sans-serif';
    ctx.fillStyle = '#334455';
    ctx.globalAlpha = 0.6;
    ctx.fillText('[ Wheel / Drag ] Scroll View  [ A/D / W/S ] Select Level  [ ENTER ] Play  [ ESC ] Back', width / 2, height - 25);
    ctx.restore();
  }

  renderInfoPanel(ctx, width, height) {
    const panelW = 280;
    const panelH = 80;
    const panelX = (width - panelW) / 2;
    const panelY = height - 120;

    ctx.save();
    // Panel back plate
    ctx.fillStyle = 'rgba(10,10,20,0.85)';
    ctx.fillRect(panelX, panelY, panelW, panelH);
    ctx.strokeStyle = this.zoneColors[Math.ceil(this.selectedLevel / 5) - 1];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    ctx.strokeRect(panelX, panelY, panelW, panelH);
    ctx.globalAlpha = 1;

    // Details text
    const name = this.levelNames[this.selectedLevel - 1] || 'Unknown';
    const zone = Math.ceil(this.selectedLevel / 5);
    const isUnlocked = this.unlockedLevels.includes(this.selectedLevel);
    const completed = this.completedLevels[this.selectedLevel];

    ctx.textAlign = 'center';
    ctx.font = 'bold 18px Rajdhani, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Level ${this.selectedLevel}: ${name}`, panelX + panelW / 2, panelY + 24);

    ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillStyle = this.zoneColors[zone - 1];
    ctx.fillText(`Zone ${zone}: ${this.zoneNames[zone - 1]}`, panelX + panelW / 2, panelY + 44);

    if (!isUnlocked) {
      ctx.fillStyle = '#ff0044';
      ctx.fillText('🔒 LOCKED', panelX + panelW / 2, panelY + 66);
    } else if (completed) {
      ctx.fillStyle = '#ffe600';
      const stars = completed.stars || 0;
      ctx.fillText(`Best: ${completed.score || 0}  ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, panelX + panelW / 2, panelY + 66);
    } else {
      ctx.fillStyle = '#00ff88';
      ctx.fillText('▶ READY TO PLAY', panelX + panelW / 2, panelY + 66);
    }

    ctx.restore();
  }

  reset() {
    this.selectedLevel = 1;
    this.scrollOffset = 0;
    this.targetScrollOffset = 0;
    this.time = 0;
    this.isDragging = false;
  }
}

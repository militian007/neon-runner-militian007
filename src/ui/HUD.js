export default class HUD {
  constructor() {
    this.time = 0;
    this.score = 0;
    this.displayScore = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.notifications = [];
    this.levelNameTimer = 3;
    this.levelName = '';
    this.zoneName = '';
    this.showInteractPrompt = false;
    this.lowHealthPulse = 0;
  }

  setLevel(name, zone) {
    this.levelName = name;
    this.zoneName = zone;
    this.levelNameTimer = 3;
  }

  update(dt, player, powerManager) {
    this.time += dt;

    // Animate score counter
    if (this.displayScore < this.score) {
      this.displayScore += Math.ceil((this.score - this.displayScore) * 8 * dt);
      if (this.displayScore > this.score) this.displayScore = this.score;
    }

    // Update combo timer
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.comboCount = 0;
      }
    }

    // Update level name timer
    if (this.levelNameTimer > 0) {
      this.levelNameTimer -= dt;
    }

    // Update notifications
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const n = this.notifications[i];
      n.timer -= dt;
      n.y -= 40 * dt;
      n.alpha = Math.max(0, n.timer / 1.5);
      if (n.timer <= 0) {
        this.notifications.splice(i, 1);
      }
    }

    // Low health pulse
    if (player && player.health <= 30) {
      this.lowHealthPulse += dt * 6;
    }
  }

  addScore(points) {
    this.score += points;
    this.comboCount++;
    this.comboTimer = 3;
  }

  addNotification(text, x, y, color) {
    this.notifications.push({
      text,
      x, y,
      color: color || '#ffe600',
      alpha: 1,
      timer: 1.5,
      scale: 1.2
    });
  }

  render(ctx, player, powerManager, levelInfo) {
    if (!player) return;

    // ---- TOP LEFT: Health Bar ----
    this.renderHealthBar(ctx, player);

    // ---- TOP LEFT (below health): Energy Bar ----
    this.renderEnergyBar(ctx, player);

    // ---- TOP RIGHT: Score ----
    this.renderScore(ctx);

    // ---- TOP CENTER: Level Name (fades) ----
    this.renderLevelName(ctx);

    // ---- BOTTOM LEFT: Power Cooldowns ----
    this.renderCooldowns(ctx, powerManager);

    // ---- TOP LEFT (below energy): Lives ----
    this.renderLives(ctx, player, levelInfo);

    // ---- BOTTOM CENTER: Interact Prompt ----
    if (this.showInteractPrompt) {
      this.renderInteractPrompt(ctx);
    }

    // ---- Floating Notifications ----
    this.renderNotifications(ctx);

    // ---- Combo Display ----
    if (this.comboCount > 1 && this.comboTimer > 0) {
      this.renderCombo(ctx);
    }

    // ---- TOP LEFT (next to bars): Music Mute Button ----
    this.renderMuteButton(ctx);
  }

  renderMuteButton(ctx) {
    const x = 1225, y = 655, w = 40, h = 40;
    const isMuted = window.__NEON_RUNNER__ && window.__NEON_RUNNER__.audio ? window.__NEON_RUNNER__.audio.isMusicMuted() : false;
    
    ctx.save();
    
    const color = isMuted ? '#556677' : '#00f0ff';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = isMuted ? 0 : 8;
    
    // Draw speaker icon
    ctx.fillStyle = color;
    ctx.beginPath();
    // Speaker body
    ctx.moveTo(x + 10, y + 16);
    ctx.lineTo(x + 16, y + 16);
    ctx.lineTo(x + 22, y + 10);
    ctx.lineTo(x + 22, y + 30);
    ctx.lineTo(x + 16, y + 24);
    ctx.lineTo(x + 10, y + 24);
    ctx.closePath();
    ctx.fill();
    
    if (!isMuted) {
      // Sound waves
      ctx.beginPath();
      ctx.arc(x + 18, y + 20, 6, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(x + 18, y + 20, 10, -Math.PI / 3, Math.PI / 3);
      ctx.stroke();
    } else {
      // Red strike-through line
      ctx.strokeStyle = '#ff0044';
      ctx.shadowColor = '#ff0044';
      ctx.shadowBlur = 6;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 8);
      ctx.lineTo(x + 32, y + 32);
      ctx.stroke();
    }
    
    ctx.restore();
  }

  renderHealthBar(ctx, player) {
    const x = 20, y = 20, w = 200, h = 18, slant = 8;
    const hp = player.health || 0;
    const maxHp = player.maxHealth || 100;
    const ratio = Math.max(0, hp / maxHp);

    ctx.save();
    
    // Label HP
    ctx.font = 'bold 11px Orbitron, sans-serif';
    ctx.fillStyle = '#556677';
    ctx.fillText('SYSTEM // HP', x, y - 6);

    // Double neon border glow
    const hpColor = ratio > 0.5 ? '#00f0ff' : (ratio > 0.25 ? '#ffe600' : '#ff0044');
    ctx.shadowColor = hpColor;
    ctx.shadowBlur = ratio < 0.3 ? 14 + Math.sin(this.lowHealthPulse) * 7 : 8;

    // Outer slanted frame
    ctx.strokeStyle = hpColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + w - slant, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + slant, y + h);
    ctx.closePath();
    ctx.stroke();

    // Secondary inner border for tech detail
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x + 2, y + 2);
    ctx.lineTo(x + w - slant - 2, y + 2);
    ctx.lineTo(x + w - 2, y + h - 2);
    ctx.lineTo(x + slant + 2, y + h - 2);
    ctx.closePath();
    ctx.stroke();

    // Clip to draw slanted fill
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 1);
    ctx.lineTo(x + w - slant - 1, y + 1);
    ctx.lineTo(x + w - 1, y + h - 1);
    ctx.lineTo(x + slant + 1, y + h - 1);
    ctx.closePath();
    ctx.clip();

    // Glassmorphic background
    ctx.fillStyle = 'rgba(10, 12, 22, 0.75)';
    ctx.fillRect(x - 10, y - 5, w + 20, h + 10);

    // Health fill (slanted clipped rectangle)
    const fillW = w * ratio;
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, hpColor);
    grad.addColorStop(0.3, hpColor);
    grad.addColorStop(1, hpColor + '44');
    ctx.fillStyle = grad;
    // Draw fill bar (clipped to the slant path)
    ctx.fillRect(x - 10, y, fillW + 10, h);
    ctx.restore();

    // Numeric HP centered or aligned
    ctx.shadowBlur = 0;
    ctx.font = 'bold 11px Orbitron, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    // Draw a small drop shadow for text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText(`${Math.ceil(hp)}/${maxHp}`, x + w - slant - 5 + 1, y + 13 + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.ceil(hp)}/${maxHp}`, x + w - slant - 5, y + 13);
    ctx.textAlign = 'left';

    ctx.restore();
  }

  renderEnergyBar(ctx, player) {
    const x = 20, y = 48, w = 200, h = 14;
    const energy = player.energy || 0;
    const maxEnergy = player.maxEnergy || 100;
    const ratio = Math.max(0, energy / maxEnergy);

    ctx.save();
    
    // Label with percentage: ENERGY // 100%
    const percent = Math.round(ratio * 100);
    const isFull = ratio >= 1;
    const eColor = isFull ? '#a855f7' : '#00ffcc'; // neon purple/violet when ready, neon cyan-green when charging
    
    ctx.font = 'bold 10px Orbitron, sans-serif';
    ctx.fillStyle = '#556677';
    ctx.fillText('ENERGY //', x, y - 5);
    
    ctx.fillStyle = eColor;
    ctx.shadowColor = eColor;
    ctx.shadowBlur = isFull ? 8 : 0;
    ctx.fillText(`${percent}%`, x + 65, y - 5);
    
    if (isFull) {
      ctx.font = 'bold 9px Orbitron, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 6;
      ctx.fillText('[R] READY', x + 110, y - 5);
    }
    
    // Draw Battery Container
    // The battery main body will go from x to x + w - 8.
    // The battery cap/polo will go from x + w - 8 to x + w.
    const bodyW = w - 8;
    const capW = 5;
    const capH = h * 0.5;
    const capX = x + bodyW;
    const capY = y + (h - capH) / 2;

    // Draw glassmorphic battery background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
    ctx.fillRect(x, y, bodyW, h);
    ctx.fillRect(capX, capY, capW, capH);

    // Battery borders
    ctx.strokeStyle = isFull ? '#a855f7' : '#1a2535';
    ctx.lineWidth = 1.2;
    ctx.shadowColor = eColor;
    ctx.shadowBlur = isFull ? 10 + Math.sin(this.time * 6) * 4 : 4;
    
    // Draw body path with slightly rounded corners
    ctx.beginPath();
    ctx.roundRect(x, y, bodyW, h, 2);
    ctx.stroke();

    // Draw cap path
    ctx.beginPath();
    ctx.roundRect(capX, capY, capW, capH, { topLeft: 0, bottomLeft: 0, topRight: 1, bottomRight: 1 });
    ctx.stroke();

    // Render 10 segmented blocks inside
    const numSegments = 10;
    const gap = 2.5;
    const totalGaps = (numSegments - 1) * gap;
    const availableW = bodyW - 4 - totalGaps; // 2px padding on each end
    const segW = availableW / numSegments;

    // Pulse opacity for full battery
    const fullPulse = isFull ? 0.8 + Math.sin(this.time * 8) * 0.2 : 1.0;
    ctx.globalAlpha = fullPulse;

    for (let i = 0; i < numSegments; i++) {
      const segX = x + 2 + i * (segW + gap);
      const isCharged = ratio > i / numSegments;

      if (isCharged) {
        // Active cell block
        ctx.shadowBlur = isFull ? 12 : 5;
        ctx.shadowColor = eColor;
        
        // Horizontal color shift: left is greener, right is more purple/yellow
        const blockGrad = ctx.createLinearGradient(segX, y, segX + segW, y);
        blockGrad.addColorStop(0, eColor);
        blockGrad.addColorStop(1, isFull ? '#c084fc' : '#34d399');
        
        ctx.fillStyle = blockGrad;
        ctx.fillRect(segX, y + 2, segW, h - 4);
      } else {
        // Inactive/empty cell slot: faint glass block
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(segX, y + 2, segW, h - 4);
      }
    }

    ctx.restore();
  }

  renderScore(ctx) {
    ctx.save();
    ctx.textAlign = 'right';

    // Score label
    ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillStyle = '#556677';
    ctx.fillText('SCORE', 1260, 18);

    // Score value
    ctx.font = 'bold 28px Orbitron, monospace';
    ctx.fillStyle = '#ffe600';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffe600';
    const scoreStr = String(Math.floor(this.displayScore)).padStart(8, '0');
    ctx.fillText(scoreStr, 1260, 72);

    ctx.restore();
  }

  renderLevelName(ctx) {
    if (this.levelNameTimer <= 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    let alpha = 1;
    if (this.levelNameTimer < 1) alpha = this.levelNameTimer;
    if (this.levelNameTimer > 2.5) alpha = (3 - this.levelNameTimer) * 2;
    ctx.globalAlpha = alpha;

    // Level name
    ctx.font = 'bold 32px Orbitron, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f0ff';
    ctx.fillText(this.levelName, 640, 100);

    // Zone name
    ctx.font = '16px Rajdhani, sans-serif';
    ctx.fillStyle = '#00f0ff';
    ctx.fillText(this.zoneName, 640, 125);

    ctx.restore();
  }

  renderCooldowns(ctx, powerManager) {
    if (!powerManager) return;

    const keys = ['Q', 'E', 'R'];
    const colors = ['#00f0ff', '#ff00aa', '#ffe600']; // colors: Q (Cyan), E (Pink), R (Yellow)

    const startX = 30;
    const y = 675; // Move up slightly so it doesn't clip off the screen
    const r = 20;
    const spacing = 55;

    ctx.save();
    for (let i = 0; i < 3; i++) {
      const cx = startX + i * spacing;
      
      // Determine cooldown metrics based on actual PowerManager properties
      let cooldownTimer = 0;
      let maxCooldown = 1;
      let isActive = false;

      if (i === 0) {
        cooldownTimer = powerManager.empShieldCooldown;
        maxCooldown = powerManager.empShieldMaxCooldown;
        isActive = powerManager.empShieldActive;
      } else if (i === 1) {
        cooldownTimer = powerManager.phaseDashCooldown;
        maxCooldown = powerManager.phaseDashMaxCooldown;
        isActive = powerManager.phaseDashActive;
      } else if (i === 2) {
        // R is ready when energy is at least neonStormEnergyCost (80)
        const stormCost = powerManager.neonStormEnergyCost || 80;
        cooldownTimer = powerManager.player.energy < stormCost ? stormCost - powerManager.player.energy : 0;
        maxCooldown = stormCost;
        isActive = powerManager.neonStormActive;
      }

      const cooldownRatio = maxCooldown > 0 ? 1 - (cooldownTimer / maxCooldown) : 1;
      
      let hasEnergy = true;
      if (i === 0) hasEnergy = powerManager.player.energy >= (powerManager.empShieldEnergyCost || 40);
      if (i === 2) hasEnergy = powerManager.player.energy >= (powerManager.neonStormEnergyCost || 80);

      const isReady = cooldownRatio >= 1 && !isActive && hasEnergy;

      // Draw and clip background shape
      ctx.save();
      ctx.beginPath();
      if (i === 0) {
        this.drawShieldShape(ctx, cx, y, r);
      } else {
        ctx.arc(cx, y, r, 0, Math.PI * 2);
      }
      ctx.clip();

      // Background fill
      ctx.fillStyle = 'rgba(10, 10, 20, 0.85)';
      ctx.fill();

      // Vertical sliding cooldown fill
      if (cooldownRatio < 1) {
        const fillHeight = 2 * r * cooldownRatio;
        ctx.fillStyle = 'rgba(20, 20, 35, 0.9)'; // Dark overlay for remaining cooldown
        ctx.fillRect(cx - r, y - r, 2 * r, 2 * r - fillHeight);
      }
      ctx.restore();

      // Draw border
      ctx.save();
      ctx.beginPath();
      if (i === 0) {
        this.drawShieldShape(ctx, cx, y, r);
      } else {
        ctx.arc(cx, y, r, 0, Math.PI * 2);
      }
      ctx.strokeStyle = isReady ? colors[i] : (isActive ? '#ffffff' : '#1a2535');
      ctx.lineWidth = isReady || isActive ? 2 : 1;
      ctx.shadowBlur = isReady || isActive ? 10 + Math.sin(this.time * 4) * 5 : 0;
      ctx.shadowColor = colors[i];
      ctx.stroke();
      ctx.restore();

      // Draw vector graphic icons
      ctx.save();
      ctx.strokeStyle = isReady ? '#ffffff' : (isActive ? colors[i] : '#334455');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (i === 0) {
        // Q: Shield Icon
        ctx.beginPath();
        this.drawShieldShape(ctx, cx, y + 2, 8);
        ctx.stroke();
      } else if (i === 1) {
        // E: Running Person Icon
        ctx.beginPath();
        // Head
        ctx.arc(cx + 2, y - 8, 2, 0, Math.PI * 2);
        ctx.fillStyle = isReady ? '#ffffff' : (isActive ? colors[i] : '#334455');
        ctx.fill();
        
        ctx.beginPath();
        // Torso
        ctx.moveTo(cx + 1, y - 6);
        ctx.lineTo(cx - 2, y);
        
        // Leg 1 (Front running)
        ctx.moveTo(cx - 2, y);
        ctx.lineTo(cx + 3, y + 4);
        ctx.lineTo(cx + 1, y + 9);
        
        // Leg 2 (Back running)
        ctx.moveTo(cx - 2, y);
        ctx.lineTo(cx - 5, y + 3);
        ctx.lineTo(cx - 3, y + 7);
        
        // Arm 1 (Front arm)
        ctx.moveTo(cx, y - 4);
        ctx.lineTo(cx + 5, y - 1);
        ctx.lineTo(cx + 2, y + 2);
        
        // Arm 2 (Back arm)
        ctx.moveTo(cx, y - 4);
        ctx.lineTo(cx - 4, y - 3);
        ctx.lineTo(cx - 6, y + 1);
        ctx.stroke();
      } else if (i === 2) {
        // R: Lightning Bolt Icon
        ctx.fillStyle = isReady ? '#ffffff' : (isActive ? colors[i] : '#334455');
        ctx.strokeStyle = isReady ? '#ffffff' : (isActive ? colors[i] : '#334455');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + 3, y - 9);
        ctx.lineTo(cx - 4, y);
        ctx.lineTo(cx, y);
        ctx.lineTo(cx - 3, y + 9);
        ctx.lineTo(cx + 4, y);
        ctx.lineTo(cx + 1, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // Key letter in the top-left corner
      ctx.save();
      ctx.font = 'bold 8px Orbitron, monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = isReady ? '#ffffff' : (isActive ? '#ffffff' : '#334455');
      ctx.fillText(keys[i], cx - r + 5, y - r + 5);
      ctx.restore();
    }
    ctx.restore();
  }

  drawShieldShape(ctx, cx, cy, r) {
    const w = r;
    const h = r * 1.1;
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + w, cy - h * 0.7);
    ctx.quadraticCurveTo(cx + w * 1.1, cy, cx + w * 0.8, cy + h * 0.5);
    ctx.quadraticCurveTo(cx + w * 0.4, cy + h * 0.9, cx, cy + h);
    ctx.quadraticCurveTo(cx - w * 0.4, cy + h * 0.9, cx - w * 0.8, cy + h * 0.5);
    ctx.quadraticCurveTo(cx - w * 1.1, cy, cx - w, cy - h * 0.7);
    ctx.closePath();
  }

  renderLives(ctx, player, levelInfo) {
    const lives = (levelInfo && levelInfo.lives !== undefined) ? levelInfo.lives : (player.lives || 3);
    const maxLives = 3;
    const x = 20;
    const y = 78;

    ctx.save();
    
    // Label "LIVES"
    ctx.font = 'bold 10px Rajdhani, sans-serif';
    ctx.fillStyle = '#556677';
    ctx.fillText('LIVES', x, y);

    // Hearts offset
    const heartStartX = x + 40;
    const heartY = y + 1; // Align vertically with the text baseline
    ctx.font = '16px sans-serif';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff00aa';

    for (let i = 0; i < maxLives; i++) {
      if (i < lives) {
        // Active heart: bright pink neon
        ctx.fillStyle = '#ff00aa';
        ctx.fillText('♥', heartStartX + i * 22, heartY);
      } else {
        // Empty/lost heart: dark outline/translucent pink
        ctx.fillStyle = 'rgba(255, 0, 170, 0.15)';
        ctx.fillText('♥', heartStartX + i * 22, heartY);
      }
    }
    ctx.restore();
  }

  renderInteractPrompt(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 14px Rajdhani, sans-serif';
    const pulse = 0.6 + Math.sin(this.time * 4) * 0.3;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffe600';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffe600';
    ctx.fillText('[ F ] INTERACT', 640, 650);
    ctx.restore();
  }

  renderNotifications(ctx) {
    ctx.save();
    ctx.textAlign = 'center';

    for (const n of this.notifications) {
      ctx.globalAlpha = n.alpha;
      ctx.font = 'bold 18px Rajdhani, sans-serif';
      ctx.fillStyle = n.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = n.color;
      const s = 1 + (1 - n.alpha) * 0.3;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.scale(s, s);
      ctx.fillText(n.text, 0, 0);
      ctx.restore();
    }

    ctx.restore();
  }

  renderCombo(ctx) {
    ctx.save();
    ctx.textAlign = 'right';
    const pulse = 0.7 + Math.sin(this.time * 6) * 0.3;
    ctx.globalAlpha = pulse * Math.min(1, this.comboTimer);
    ctx.font = 'bold 22px Orbitron, monospace';
    ctx.fillStyle = '#ff00aa';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ff00aa';
    ctx.fillText(`COMBO x${this.comboCount}`, 1260, 105);
    ctx.restore();
  }

  reset() {
    this.score = 0;
    this.displayScore = 0;
    this.comboCount = 0;
    this.comboTimer = 0;
    this.notifications = [];
    this.levelNameTimer = 3;
    this.showInteractPrompt = false;
  }
}

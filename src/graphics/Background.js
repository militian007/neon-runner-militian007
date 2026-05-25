import cyberpunkBg from '../assets/cyberpunk_bg.jpg';

export default class Background {
  constructor() {
    this.currentZone = 1;
    
    // Load background image
    this.bgImage = new Image();
    this.bgImage.src = cyberpunkBg;
    this.bgImageLoaded = false;
    this.bgImage.onload = () => {
      this.bgImageLoaded = true;
    };

    this.raindrops = [];
    this.stars = [];
    this.buildings = [];
    this.dataStreams = [];
    this.flyingCars = [];
    this.time = 0;
    
    this.initBuildings();
    this.initRain();
    this.initStars();
    this.initDataStreams();
    this.initFlyingCars();
  }

  setZone(zone) {
    this.currentZone = zone;
  }

  initBuildings() {
    this.buildings = [];
    for (let i = 0; i < 35; i++) {
      const w = 40 + Math.random() * 70;
      const h = 80 + Math.random() * 350;
      const windows = [];
      const winCols = Math.floor(w / 14);
      const winRows = Math.floor(h / 18);
      for (let wr = 0; wr < winRows; wr++) {
        for (let wc = 0; wc < winCols; wc++) {
          windows.push({
            x: 5 + wc * 14,
            y: 10 + wr * 18,
            lit: Math.random() > 0.4,
            color: Math.random() > 0.7 ? '#ffe600' : (Math.random() > 0.5 ? '#00f0ff' : '#4488cc'),
            flicker: Math.random() > 0.85
          });
        }
      }
      this.buildings.push({
        x: i * 75 + Math.random() * 30 - 200,
        width: w,
        height: h,
        windows,
        antennaHeight: Math.random() > 0.5 ? 10 + Math.random() * 30 : 0,
        neonSign: Math.random() > 0.65,
        neonColor: ['#00f0ff', '#ff00aa', '#ffe600', '#8b5cf6'][Math.floor(Math.random() * 4)],
        layer: Math.random() > 0.5 ? 'far' : 'near'
      });
    }
  }

  initRain() {
    this.raindrops = [];
    for (let i = 0; i < 250; i++) {
      this.raindrops.push({
        x: Math.random() * 2500,
        y: Math.random() * 720,
        speed: 500 + Math.random() * 400,
        length: 10 + Math.random() * 25,
        alpha: 0.08 + Math.random() * 0.2,
        windX: -30 - Math.random() * 20
      });
    }
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * 2000,
        y: Math.random() * 350,
        size: 0.5 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 2
      });
    }
  }

  initDataStreams() {
    this.dataStreams = [];
    for (let i = 0; i < 30; i++) {
      const chars = [];
      const len = 5 + Math.floor(Math.random() * 20);
      for (let j = 0; j < len; j++) {
        chars.push(String.fromCharCode(48 + Math.floor(Math.random() * 74)));
      }
      this.dataStreams.push({
        x: Math.random() * 1500,
        y: -Math.random() * 720,
        speed: 50 + Math.random() * 150,
        chars,
        alpha: 0.1 + Math.random() * 0.3,
        color: Math.random() > 0.5 ? '#00ff88' : '#00f0ff'
      });
    }
  }

  update(dt) {
    this.time += dt;

    // Update rain
    for (const drop of this.raindrops) {
      drop.y += drop.speed * dt;
      drop.x += drop.windX * dt;
      if (drop.y > 740) {
        drop.y = -drop.length;
        drop.x = Math.random() * 2500;
      }
      if (drop.x < -50) drop.x = 2500;
    }

    // Update data streams
    for (const stream of this.dataStreams) {
      stream.y += stream.speed * dt;
      if (stream.y > 750) {
        stream.y = -stream.chars.length * 16;
        stream.x = Math.random() * 1500;
      }
    }

    // Update flying cars
    for (let i = 0; i < this.flyingCars.length; i++) {
      const car = this.flyingCars[i];
      car.x += car.vx * dt;
      if (car.direction > 0 && car.x > 1400) {
        this.flyingCars[i] = this.createFlyingCar(false);
      } else if (car.direction < 0 && car.x < -150) {
        this.flyingCars[i] = this.createFlyingCar(false);
      }
    }
  }

  render(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    switch (this.currentZone) {
      case 1: this.renderZone1(ctx, cameraX, cameraY, viewWidth, viewHeight); break;
      case 2: this.renderZone2(ctx, cameraX, cameraY, viewWidth, viewHeight); break;
      case 3: this.renderZone3(ctx, cameraX, cameraY, viewWidth, viewHeight); break;
      case 4: this.renderZone4(ctx, cameraX, cameraY, viewWidth, viewHeight); break;
      default: this.renderZone1(ctx, cameraX, cameraY, viewWidth, viewHeight); break;
    }
  }

  renderZone1(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    // Background image with parallax
    if (this.bgImageLoaded) {
      ctx.save();
      const bgWidth = 1440;
      const bgHeight = 720;
      const offset = (cameraX * 0.08) % bgWidth;
      
      // Draw first copy
      ctx.drawImage(this.bgImage, -offset, 0, bgWidth, bgHeight);
      
      // Draw second copy mirrored horizontally for a perfectly seamless wrap-around city skyline
      ctx.save();
      ctx.translate(bgWidth - offset + bgWidth / 2, bgHeight / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(this.bgImage, -bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);
      ctx.restore();

      // Atmospheric color-grading overlay to enhance legibility and pop neon platforms
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
      overlayGrad.addColorStop(0, 'rgba(5, 5, 15, 0.7)');       // Dark night sky blend
      overlayGrad.addColorStop(0.5, 'rgba(15, 10, 25, 0.45)');   // Dark purple haze
      overlayGrad.addColorStop(1, 'rgba(25, 5, 35, 0.6)');       // Bottom neon street glow
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      ctx.restore();
    } else {
      // Sky gradient fallback
      const skyGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
      skyGrad.addColorStop(0, '#050510');
      skyGrad.addColorStop(0.3, '#0a0a20');
      skyGrad.addColorStop(0.6, '#0d1b2a');
      skyGrad.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }

    // Stars
    this.renderStars(ctx, cameraX);

    // Flying cars
    this.renderFlyingCars(ctx, cameraX);

    // Far buildings (parallax 0.05) - disabled to clean up background clutter
    // this.renderBuildingLayer(ctx, cameraX, viewWidth, viewHeight, 'far', 0.05, 0.10);

    // Near buildings (parallax 0.15) - disabled to clean up background clutter
    // this.renderBuildingLayer(ctx, cameraX, viewWidth, viewHeight, 'near', 0.15, 0.15);

    // Fog at bottom
    const fogGrad = ctx.createLinearGradient(0, viewHeight - 120, 0, viewHeight);
    fogGrad.addColorStop(0, 'rgba(10,10,15,0)');
    fogGrad.addColorStop(1, 'rgba(10,20,40,0.5)');
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, viewHeight - 120, viewWidth, 120);

    // Rain
    this.renderRain(ctx, viewWidth, viewHeight);
  }

  renderZone2(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    // Background image with parallax
    if (this.bgImageLoaded) {
      ctx.save();
      const bgWidth = 1440;
      const bgHeight = 720;
      const offset = (cameraX * 0.08) % bgWidth;
      
      // Draw first copy
      ctx.drawImage(this.bgImage, -offset, 0, bgWidth, bgHeight);
      
      // Draw second copy mirrored horizontally for a perfectly seamless wrap-around city skyline
      ctx.save();
      ctx.translate(bgWidth - offset + bgWidth / 2, bgHeight / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(this.bgImage, -bgWidth / 2, -bgHeight / 2, bgWidth, bgHeight);
      ctx.restore();

      // Atmospheric color-grading overlay
      const overlayGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
      overlayGrad.addColorStop(0, 'rgba(5, 5, 15, 0.7)');
      overlayGrad.addColorStop(0.5, 'rgba(15, 10, 25, 0.45)');
      overlayGrad.addColorStop(1, 'rgba(25, 5, 35, 0.6)');
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, 0, viewWidth, viewHeight);

      ctx.restore();
    } else {
      // Cleaner sky with blue tint fallback
      const skyGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
      skyGrad.addColorStop(0, '#060818');
      skyGrad.addColorStop(0.4, '#0c1628');
      skyGrad.addColorStop(1, '#141824');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }

    // Stars + moon
    this.renderStars(ctx, cameraX);
    this.renderMoon(ctx);

    // Flying cars
    this.renderFlyingCars(ctx, cameraX);

    // Corporate towers - disabled to clean up background clutter
    // this.renderCorporateTowers(ctx, cameraX, viewWidth, viewHeight);

    // Holographic ads
    this.renderHoloAds(ctx, cameraX, viewWidth, viewHeight);

    // Light rain
    ctx.save();
    ctx.globalAlpha = 0.5;
    this.renderRain(ctx, viewWidth, viewHeight);
    ctx.restore();
  }

  renderZone3(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    // Deep digital void
    ctx.fillStyle = '#020408';
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Grid floor perspective
    this.renderGrid(ctx, cameraX, viewWidth, viewHeight);

    // Data streams
    this.renderDataStreams(ctx, viewWidth, viewHeight);

    // Floating data particles
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#00ff88';
    for (let i = 0; i < 40; i++) {
      const px = (Math.sin(this.time * 0.3 + i * 1.7) * 0.5 + 0.5) * viewWidth;
      const py = (Math.cos(this.time * 0.2 + i * 2.3) * 0.5 + 0.5) * viewHeight;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderZone4(ctx, cameraX, cameraY, viewWidth, viewHeight) {
    // Space background
    const spaceGrad = ctx.createLinearGradient(0, 0, 0, viewHeight);
    spaceGrad.addColorStop(0, '#020108');
    spaceGrad.addColorStop(0.5, '#0a0510');
    spaceGrad.addColorStop(1, '#100818');
    ctx.fillStyle = spaceGrad;
    ctx.fillRect(0, 0, viewWidth, viewHeight);

    // Stars
    this.renderStars(ctx, cameraX);

    // Nebula glow
    this.renderNebula(ctx, viewWidth, viewHeight);

    // Distant fortress structures
    this.renderFortressBackground(ctx, cameraX, viewWidth, viewHeight);

    // Energy particles
    ctx.save();
    for (let i = 0; i < 25; i++) {
      const px = (Math.sin(this.time * 0.5 + i * 2.1) * 0.5 + 0.5) * viewWidth;
      const py = (Math.cos(this.time * 0.4 + i * 1.8) * 0.5 + 0.5) * viewHeight;
      const a = 0.3 + Math.sin(this.time * 2 + i) * 0.2;
      ctx.globalAlpha = a;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff8800';
      ctx.fillStyle = '#ffaa00';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderStars(ctx, cameraX) {
    ctx.save();
    for (const star of this.stars) {
      const sx = (star.x - cameraX * 0.02) % 2000;
      const twinkle = 0.4 + Math.sin(this.time * star.speed + star.twinkle) * 0.4;
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = star.size * 3;
      ctx.shadowColor = '#ffffff';
      ctx.beginPath();
      ctx.arc(sx < 0 ? sx + 2000 : sx, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  renderBuildingLayer(ctx, cameraX, viewWidth, viewHeight, layer, parallax, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    const offset = cameraX * parallax;

    for (const bld of this.buildings) {
      if (bld.layer !== layer) continue;
      const bx = ((bld.x - offset) % 2400) - 200;
      if (bx + bld.width < -50 || bx > viewWidth + 50) continue;

      const by = viewHeight - bld.height;

      // Building silhouette
      ctx.fillStyle = layer === 'far' ? '#0a0e18' : '#0f1520';
      ctx.fillRect(bx, by, bld.width, bld.height);

      // Top edge
      ctx.fillStyle = '#1a2030';
      ctx.fillRect(bx - 2, by, bld.width + 4, 3);

      // Windows
      for (const win of bld.windows) {
        if (!win.lit) continue;
        let winAlpha = 0.6;
        if (win.flicker) {
          winAlpha = Math.sin(this.time * 8 + bx) > 0 ? 0.7 : 0.1;
        }
        ctx.globalAlpha = opacity * winAlpha;
        ctx.fillStyle = win.color;
        ctx.shadowBlur = 4;
        ctx.shadowColor = win.color;
        ctx.fillRect(bx + win.x, by + win.y, 8, 10);
      }
      ctx.globalAlpha = opacity;

      // Antenna
      if (bld.antennaHeight > 0) {
        ctx.strokeStyle = '#1a2535';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bx + bld.width / 2, by);
        ctx.lineTo(bx + bld.width / 2, by - bld.antennaHeight);
        ctx.stroke();
        // Blinking light
        const blinkAlpha = Math.sin(this.time * 3 + bx) > 0.5 ? 0.9 : 0.2;
        ctx.globalAlpha = blinkAlpha;
        ctx.fillStyle = '#ff0044';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ff0044';
        ctx.beginPath();
        ctx.arc(bx + bld.width / 2, by - bld.antennaHeight, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = opacity;
      }

      // Neon sign
      if (bld.neonSign) {
        ctx.save();
        ctx.globalAlpha = 0.3 + Math.sin(this.time * 2 + bx * 0.1) * 0.2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = bld.neonColor;
        ctx.fillStyle = bld.neonColor;
        ctx.fillRect(bx + 5, by + 30, bld.width - 10, 6);
        ctx.restore();
      }
    }
    ctx.restore();
  }

  renderRain(ctx, viewWidth, viewHeight) {
    ctx.save();
    ctx.strokeStyle = '#4488cc';
    ctx.lineWidth = 1;

    for (const drop of this.raindrops) {
      if (drop.x < 0 || drop.x > viewWidth || drop.y < -50 || drop.y > viewHeight + 50) continue;
      ctx.globalAlpha = drop.alpha;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x + drop.windX * 0.02, drop.y + drop.length);
      ctx.stroke();
    }
    ctx.restore();
  }

  renderMoon(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.shadowBlur = 40;
    ctx.shadowColor = '#aabbff';
    ctx.fillStyle = '#ddeeff';
    ctx.beginPath();
    ctx.arc(1050, 80, 35, 0, Math.PI * 2);
    ctx.fill();
    // Inner shadow for crescent
    ctx.fillStyle = '#060818';
    ctx.beginPath();
    ctx.arc(1060, 75, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  renderCorporateTowers(ctx, cameraX, viewWidth, viewHeight) {
    ctx.save();
    const offset = cameraX * 0.08;
    const towerCount = 12;

    for (let i = 0; i < towerCount; i++) {
      const tx = ((i * 130 + 50 - offset) % 1600) - 100;
      if (tx < -120 || tx > viewWidth + 120) continue;

      const tw = 50 + Math.sin(i * 3.7) * 20;
      const th = 200 + Math.sin(i * 2.3) * 150;
      const ty = viewHeight - th;

      // Tower body
      const tGrad = ctx.createLinearGradient(tx, ty, tx + tw, ty);
      tGrad.addColorStop(0, '#0c1830');
      tGrad.addColorStop(0.5, '#142040');
      tGrad.addColorStop(1, '#0c1830');
      ctx.fillStyle = tGrad;
      ctx.fillRect(tx, ty, tw, th);

      // Blue edge lighting
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#4488ff';
      ctx.strokeStyle = 'rgba(68,136,255,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(tx, ty, tw, th);

      // Horizontal window stripes
      for (let wy = ty + 15; wy < viewHeight - 10; wy += 20) {
        ctx.globalAlpha = 0.15 + Math.sin(this.time + wy * 0.1) * 0.05;
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(tx + 5, wy, tw - 10, 3);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  renderHoloAds(ctx, cameraX, viewWidth, viewHeight) {
    ctx.save();
    const ads = [
      { x: 200, y: 200, text: 'NEXUS', color: '#00f0ff' },
      { x: 600, y: 150, text: 'CORP', color: '#ff00aa' },
      { x: 1000, y: 250, text: 'GRID', color: '#ffe600' }
    ];
    ctx.font = '20px Orbitron, monospace';
    const offset = cameraX * 0.06;
    for (const ad of ads) {
      const ax = ((ad.x - offset) % 1400);
      if (ax < -100 || ax > viewWidth + 100) continue;
      const flicker = 0.15 + Math.sin(this.time * 4 + ax) * 0.1;
      ctx.globalAlpha = flicker;
      ctx.shadowBlur = 20;
      ctx.shadowColor = ad.color;
      ctx.fillStyle = ad.color;
      ctx.fillText(ad.text, ax, ad.y);
    }
    ctx.restore();
  }

  renderGrid(ctx, cameraX, viewWidth, viewHeight) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#00ff88';

    // Vertical lines with perspective
    const vanishY = viewHeight * 0.35;
    const gridSpacing = 60;
    const offset = (cameraX * 0.1) % gridSpacing;

    for (let x = -gridSpacing; x < viewWidth + gridSpacing; x += gridSpacing) {
      const gx = x - offset;
      ctx.beginPath();
      ctx.moveTo(gx, vanishY);
      const spread = (gx - viewWidth / 2) * 2;
      ctx.lineTo(viewWidth / 2 + spread, viewHeight);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = vanishY; y < viewHeight; y += 30) {
      const progress = (y - vanishY) / (viewHeight - vanishY);
      ctx.globalAlpha = 0.05 + progress * 0.15;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(viewWidth, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  renderDataStreams(ctx, viewWidth, viewHeight) {
    ctx.save();
    ctx.font = '12px monospace';

    for (const stream of this.dataStreams) {
      if (stream.x > viewWidth) continue;
      ctx.globalAlpha = stream.alpha;
      ctx.shadowBlur = 4;
      ctx.shadowColor = stream.color;

      for (let i = 0; i < stream.chars.length; i++) {
        const cy = stream.y + i * 16;
        if (cy < -20 || cy > viewHeight + 20) continue;
        const charAlpha = i === 0 ? 1 : Math.max(0.2, 1 - i / stream.chars.length);
        ctx.globalAlpha = stream.alpha * charAlpha;
        ctx.fillStyle = stream.color;
        ctx.fillText(stream.chars[i], stream.x, cy);
      }
    }
    ctx.restore();
  }

  renderNebula(ctx, viewWidth, viewHeight) {
    ctx.save();
    const nebulaColors = [
      { x: 300, y: 150, r: 200, color: 'rgba(139,92,246,0.04)' },
      { x: 900, y: 200, r: 250, color: 'rgba(255,136,0,0.03)' },
      { x: 600, y: 100, r: 180, color: 'rgba(255,0,170,0.025)' }
    ];

    for (const neb of nebulaColors) {
      const nx = neb.x + Math.sin(this.time * 0.1) * 30;
      const ny = neb.y + Math.cos(this.time * 0.08) * 20;
      const grad = ctx.createRadialGradient(nx, ny, 0, nx, ny, neb.r);
      grad.addColorStop(0, neb.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, viewWidth, viewHeight);
    }
    ctx.restore();
  }

  renderFortressBackground(ctx, cameraX, viewWidth, viewHeight) {
    ctx.save();
    const offset = cameraX * 0.05;
    ctx.globalAlpha = 0.3;

    // Distant fortress structures
    for (let i = 0; i < 6; i++) {
      const fx = ((i * 250 + 100 - offset) % 1600) - 100;
      if (fx < -150 || fx > viewWidth + 150) continue;

      const fw = 80 + Math.sin(i * 4.1) * 30;
      const fh = 150 + Math.sin(i * 3.2) * 80;
      const fy = viewHeight - fh - 50;

      ctx.fillStyle = '#1a1208';
      ctx.fillRect(fx, fy, fw, fh);

      // Gold energy seams
      ctx.strokeStyle = '#ff8800';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff8800';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2 + Math.sin(this.time * 1.5 + i) * 0.1;
      ctx.beginPath();
      ctx.moveTo(fx, fy + fh * 0.3);
      ctx.lineTo(fx + fw, fy + fh * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx, fy + fh * 0.6);
      ctx.lineTo(fx + fw, fy + fh * 0.6);
      ctx.stroke();
    }
    ctx.restore();
  }

  initFlyingCars() {
    this.flyingCars = [];
    for (let i = 0; i < 15; i++) {
      this.flyingCars.push(this.createFlyingCar(true));
    }
  }

  createFlyingCar(randomX = false) {
    const direction = Math.random() > 0.5 ? 1 : -1;
    const speed = 70 + Math.random() * 110;
    const x = randomX ? Math.random() * 1400 - 100 : (direction > 0 ? -120 : 1350);
    const y = 30 + Math.random() * 240; // Upper sky fly zone
    const color = ['#00f0ff', '#ff00aa', '#ffe600', '#8b5cf6'][Math.floor(Math.random() * 4)];
    const scale = 0.5 + Math.random() * 0.8;
    return {
      x,
      y,
      vx: speed * direction,
      width: (16 + Math.random() * 8) * scale,
      height: (4 + Math.random() * 2) * scale,
      color,
      direction,
      scale
    };
  }

  renderFlyingCars(ctx, cameraX) {
    ctx.save();
    for (const car of this.flyingCars) {
      // 0.07 Parallax relative to camera
      const cx = ((car.x - cameraX * 0.07) % 1500);
      const actualX = cx < -150 ? cx + 1500 : cx;
      if (actualX > 1350) continue;

      ctx.save();
      ctx.translate(actualX, car.y);
      
      // Draw glowing car body (trapezoid/wedge shape)
      ctx.fillStyle = car.color;
      ctx.shadowColor = car.color;
      ctx.shadowBlur = 10 * car.scale;
      ctx.beginPath();
      if (car.direction > 0) {
        ctx.moveTo(0, car.height * 0.3);
        ctx.lineTo(car.width * 0.7, 0);
        ctx.lineTo(car.width, car.height * 0.5);
        ctx.lineTo(car.width, car.height);
        ctx.lineTo(0, car.height);
      } else {
        ctx.moveTo(car.width, car.height * 0.3);
        ctx.lineTo(car.width * 0.3, 0);
        ctx.lineTo(0, car.height * 0.5);
        ctx.lineTo(0, car.height);
        ctx.lineTo(car.width, car.height);
      }
      ctx.closePath();
      ctx.fill();

      // Headlight (Cyan/White)
      ctx.shadowBlur = 12 * car.scale;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#00f0ff';
      ctx.beginPath();
      if (car.direction > 0) {
        ctx.arc(car.width, car.height * 0.6, car.height * 0.25, 0, Math.PI * 2);
      } else {
        ctx.arc(0, car.height * 0.6, car.height * 0.25, 0, Math.PI * 2);
      }
      ctx.fill();

      // Light beam flare from headlights
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (car.direction > 0) {
        ctx.moveTo(car.width, car.height * 0.6);
        ctx.lineTo(car.width + 15 * car.scale, car.height * 0.6 - 5 * car.scale);
        ctx.lineTo(car.width + 15 * car.scale, car.height * 0.6 + 5 * car.scale);
      } else {
        ctx.moveTo(0, car.height * 0.6);
        ctx.lineTo(-15 * car.scale, car.height * 0.6 - 5 * car.scale);
        ctx.lineTo(-15 * car.scale, car.height * 0.6 + 5 * car.scale);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
      ctx.fill();

      // Taillight (Red/Pink)
      ctx.fillStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 8 * car.scale;
      ctx.beginPath();
      if (car.direction > 0) {
        ctx.arc(0, car.height * 0.6, car.height * 0.2, 0, Math.PI * 2);
      } else {
        ctx.arc(car.width, car.height * 0.6, car.height * 0.2, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();
  }
}

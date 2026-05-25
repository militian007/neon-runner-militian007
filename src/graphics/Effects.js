export default class Effects {
  constructor() {
    this.screenShake = { intensity: 0, duration: 0, timer: 0 };
    this.flash = { alpha: 0, color: '#ffffff', duration: 0, timer: 0 };
    this.slowMo = { active: false, factor: 1, duration: 0, timer: 0 };
    this.scanlines = true;
    this.vignette = true;
    this.time = 0;
    this.glitch = { active: false, intensity: 0, timer: 0, duration: 0 };
  }

  shake(intensity, duration) {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
    this.screenShake.timer = duration;
  }

  flashScreen(color, duration) {
    this.flash.color = color || '#ffffff';
    this.flash.alpha = 1;
    this.flash.duration = duration || 0.2;
    this.flash.timer = this.flash.duration;
  }

  startSlowMo(factor, duration) {
    this.slowMo.active = true;
    this.slowMo.factor = factor || 0.3;
    this.slowMo.duration = duration || 1;
    this.slowMo.timer = this.slowMo.duration;
  }

  startGlitch(intensity, duration) {
    this.glitch.active = true;
    this.glitch.intensity = intensity || 0.5;
    this.glitch.duration = duration || 0.5;
    this.glitch.timer = this.glitch.duration;
  }

  update(dt) {
    this.time += dt;

    // Update screen shake
    if (this.screenShake.timer > 0) {
      this.screenShake.timer -= dt;
      if (this.screenShake.timer <= 0) {
        this.screenShake.intensity = 0;
        this.screenShake.timer = 0;
      }
    }

    // Update flash
    if (this.flash.timer > 0) {
      this.flash.timer -= dt;
      this.flash.alpha = Math.max(0, this.flash.timer / this.flash.duration);
      if (this.flash.timer <= 0) {
        this.flash.alpha = 0;
      }
    }

    // Update slow-mo
    if (this.slowMo.active) {
      this.slowMo.timer -= dt;
      if (this.slowMo.timer <= 0) {
        this.slowMo.active = false;
        this.slowMo.factor = 1;
      }
    }

    // Update glitch
    if (this.glitch.active) {
      this.glitch.timer -= dt;
      if (this.glitch.timer <= 0) {
        this.glitch.active = false;
        this.glitch.intensity = 0;
      }
    }
  }

  getShakeOffset() {
    if (this.screenShake.timer <= 0) return { x: 0, y: 0 };
    const decay = this.screenShake.timer / this.screenShake.duration;
    const intensity = this.screenShake.intensity * decay;
    return {
      x: (Math.random() - 0.5) * intensity * 2,
      y: (Math.random() - 0.5) * intensity * 2
    };
  }

  getTimeScale() {
    return this.slowMo.active ? this.slowMo.factor : 1;
  }

  renderOverlays(ctx, width, height) {
    // Screen flash
    if (this.flash.alpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flash.alpha * 0.6;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // Vignette
    if (this.vignette) {
      this.renderVignette(ctx, width, height);
    }

    // Scanlines
    if (this.scanlines) {
      this.renderScanlines(ctx, width, height);
    }

    // Glitch effect
    if (this.glitch.active) {
      this.renderGlitch(ctx, width, height);
    }
  }

  renderVignette(ctx, width, height) {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, height * 0.3,
      width / 2, height / 2, height * 0.9
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.7, 'rgba(0,0,0,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  renderScanlines(ctx, width, height) {
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < height; y += 3) {
      ctx.fillRect(0, y, width, 1);
    }

    // Moving scanline bar
    const barY = ((this.time * 50) % (height + 100)) - 50;
    ctx.globalAlpha = 0.03;
    const barGrad = ctx.createLinearGradient(0, barY, 0, barY + 80);
    barGrad.addColorStop(0, 'rgba(255,255,255,0)');
    barGrad.addColorStop(0.5, 'rgba(255,255,255,1)');
    barGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, barY, width, 80);

    ctx.restore();
  }

  renderGlitch(ctx, width, height) {
    ctx.save();
    const intensity = this.glitch.intensity * (this.glitch.timer / this.glitch.duration);
    const sliceCount = Math.floor(3 + intensity * 8);

    for (let i = 0; i < sliceCount; i++) {
      const y = Math.random() * height;
      const h = 2 + Math.random() * 20 * intensity;
      const offset = (Math.random() - 0.5) * 30 * intensity;

      // Shift a horizontal slice
      try {
        const imageData = ctx.getImageData(0, Math.floor(y), width, Math.floor(h));
        ctx.putImageData(imageData, offset, Math.floor(y));
      } catch (e) { /* ignore cross-origin */ }
    }

    // Color aberration bars
    ctx.globalAlpha = 0.1 * intensity;
    ctx.fillStyle = '#ff0044';
    ctx.fillRect(0, Math.random() * height, width, 2 + Math.random() * 4);
    ctx.fillStyle = '#00f0ff';
    ctx.fillRect(0, Math.random() * height, width, 2 + Math.random() * 4);

    ctx.restore();
  }
}

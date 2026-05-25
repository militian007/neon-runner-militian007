export default class ParticleSystem {
  constructor() {
    this.particles = [];
    this.maxParticles = 500;
  }

  emit(x, y, type, count, config) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.particles.push(this.createParticle(x, y, type, config));
    }
  }

  createParticle(x, y, type, config) {
    const p = {
      x, y,
      vx: 0, vy: 0,
      size: 3,
      color: '#00f0ff',
      alpha: 1,
      life: 1,
      maxLife: 1,
      type,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 4
    };

    switch (type) {
      case 'dust':
        p.vx = (Math.random() - 0.5) * 60;
        p.vy = -Math.random() * 60;
        p.size = 2 + Math.random() * 3;
        p.color = config?.color || '#888888';
        p.life = 0.3 + Math.random() * 0.3;
        break;

      case 'spark':
        p.vx = (Math.random() - 0.5) * 250;
        p.vy = (Math.random() - 0.5) * 250;
        p.size = 1 + Math.random() * 2;
        p.color = config?.color || '#ffe600';
        p.life = 0.2 + Math.random() * 0.3;
        break;

      case 'explosion': {
        const angle = Math.random() * Math.PI * 2;
        const speed = 80 + Math.random() * 180;
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
        p.size = 3 + Math.random() * 5;
        p.color = config?.color || '#ff00aa';
        p.life = 0.4 + Math.random() * 0.5;
        break;
      }

      case 'trail':
        p.vx = (Math.random() - 0.5) * 20;
        p.vy = (Math.random() - 0.5) * 20;
        p.size = 2 + Math.random() * 2;
        p.color = config?.color || '#00f0ff';
        p.life = 0.15 + Math.random() * 0.2;
        break;

      case 'rain':
        p.x = x + Math.random() * (config?.width || 1280);
        p.y = y + Math.random() * (config?.height || 720);
        p.vx = -15;
        p.vy = 400 + Math.random() * 300;
        p.size = 1;
        p.color = '#4488cc';
        p.life = 1.5 + Math.random();
        p.length = 10 + Math.random() * 20;
        break;

      case 'data': {
        const a2 = Math.random() * Math.PI * 2;
        const sp2 = 30 + Math.random() * 50;
        p.vx = Math.cos(a2) * sp2;
        p.vy = Math.sin(a2) * sp2;
        p.size = 2 + Math.random() * 3;
        p.color = config?.color || '#00ff88';
        p.life = 0.5 + Math.random() * 0.5;
        p.char = String.fromCharCode(48 + Math.floor(Math.random() * 10)); // 0-9
        break;
      }

      case 'electric': {
        const a3 = Math.random() * Math.PI * 2;
        const sp3 = 100 + Math.random() * 150;
        p.vx = Math.cos(a3) * sp3;
        p.vy = Math.sin(a3) * sp3;
        p.size = 1.5 + Math.random() * 1.5;
        p.color = config?.color || '#8b5cf6';
        p.life = 0.1 + Math.random() * 0.15;
        break;
      }

      case 'heal': {
        p.vx = (Math.random() - 0.5) * 30;
        p.vy = -40 - Math.random() * 60;
        p.size = 3 + Math.random() * 3;
        p.color = '#00ff88';
        p.life = 0.6 + Math.random() * 0.4;
        break;
      }

      case 'death': {
        const a4 = Math.random() * Math.PI * 2;
        const sp4 = 50 + Math.random() * 120;
        p.vx = Math.cos(a4) * sp4;
        p.vy = Math.sin(a4) * sp4;
        p.size = 2 + Math.random() * 4;
        p.color = '#ff0044';
        p.life = 0.5 + Math.random() * 0.8;
        break;
      }
    }

    p.maxLife = p.life;
    return p;
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      p.rotation += p.rotSpeed * dt;

      // Apply gravity to relevant types
      if (p.type === 'dust' || p.type === 'spark' || p.type === 'explosion' || p.type === 'death') {
        p.vy += 200 * dt;
      }
      // Friction for explosions
      if (p.type === 'explosion') {
        p.vx *= (1 - 2 * dt);
        p.vy *= (1 - 2 * dt);
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  render(ctx, cameraX, cameraY) {
    const cx = cameraX || 0;
    const cy = cameraY || 0;

    for (const p of this.particles) {
      const px = p.x - cx;
      const py = p.y - cy;

      // Cull off-screen particles
      if (px < -50 || px > 1330 || py < -50 || py > 770) continue;

      ctx.save();
      ctx.globalAlpha = p.alpha;

      if (p.type === 'spark' || p.type === 'electric') {
        // Draw as small line in direction of velocity
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - p.vx * 0.02, py - p.vy * 0.02);
        ctx.stroke();
      } else if (p.type === 'rain') {
        ctx.strokeStyle = p.color;
        ctx.globalAlpha = p.alpha * 0.3;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + p.vx * 0.02, py + p.vy * 0.02);
        ctx.stroke();
      } else if (p.type === 'data') {
        ctx.shadowBlur = 6;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.font = `${Math.floor(p.size * 3)}px monospace`;
        ctx.fillText(p.char || '1', px, py);
      } else {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
  }

  getCount() {
    return this.particles.length;
  }
}

export class SFXGenerator {
  constructor(audioCtx) {
    this.ctx = audioCtx;
  }

  play(name, volume) {
    const vol = volume || 0.6;
    switch (name) {
      case 'jump': this.playJump(vol); break;
      case 'double_jump': this.playDoubleJump(vol); break;
      case 'land': this.playLand(vol); break;
      case 'attack': this.playAttack(vol); break;
      case 'hit': this.playHit(vol); break;
      case 'enemy_hit': this.playEnemyHit(vol); break;
      case 'enemy_die': this.playEnemyDie(vol); break;
      case 'coin': this.playCoin(vol); break;
      case 'powerup': this.playPowerup(vol); break;
      case 'emp': this.playEMP(vol); break;
      case 'dash': this.playDash(vol); break;
      case 'storm': this.playStorm(vol); break;
      case 'interact': this.playInteract(vol); break;
      case 'death': this.playDeath(vol); break;
      case 'checkpoint': this.playCheckpoint(vol); break;
      case 'menu_select': this.playMenuSelect(vol); break;
      case 'menu_move': this.playMenuMove(vol); break;
      case 'deny': this.playDeny(vol); break;
    }
  }

  playDeny(vol) {
    this.quickTone(140, 'sawtooth', 0.15, vol * 0.4, 90);
  }

  playJump(vol) {
    this.quickTone(200, 'sine', 0.12, vol * 0.5, 600);
  }

  playDoubleJump(vol) {
    const t = this.ctx.currentTime;
    this.quickToneAt(300, 'sine', 0.08, vol * 0.4, 700, t);
    this.quickToneAt(500, 'sine', 0.08, vol * 0.4, 900, t + 0.06);
    // Sparkle
    this.quickToneAt(1200, 'sine', 0.1, vol * 0.15, 2000, t + 0.05);
  }

  playLand(vol) {
    this.quickTone(80, 'sine', 0.08, vol * 0.4, 40);
    this.noiseBurst(0.06, vol * 0.2, 300);
  }

  playAttack(vol) {
    this.noiseBurst(0.1, vol * 0.4, 2000);
    this.quickTone(400, 'sawtooth', 0.08, vol * 0.15, 200);
  }

  playHit(vol) {
    this.quickTone(100, 'sine', 0.1, vol * 0.5, 50);
    this.noiseBurst(0.08, vol * 0.35, 800);
  }

  playEnemyHit(vol) {
    const t = this.ctx.currentTime;
    this.quickToneAt(800, 'square', 0.06, vol * 0.25, 400, t);
    this.quickToneAt(1200, 'sine', 0.04, vol * 0.2, 600, t);
  }

  playEnemyDie(vol) {
    const t = this.ctx.currentTime;
    this.quickToneAt(600, 'sawtooth', 0.15, vol * 0.3, 80, t);
    this.quickToneAt(400, 'square', 0.2, vol * 0.15, 50, t + 0.05);
    this.noiseBurst(0.15, vol * 0.2, 500);
  }

  playCoin(vol) {
    const t = this.ctx.currentTime;
    this.quickToneAt(1319, 'sine', 0.08, vol * 0.35, 1319, t); // E6
    this.quickToneAt(1760, 'sine', 0.12, vol * 0.35, 1760, t + 0.07); // A6
  }

  playPowerup(vol) {
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      this.quickToneAt(freq, 'sine', 0.1, vol * 0.3, freq, t + i * 0.07);
    });
  }

  playEMP(vol) {
    const t = this.ctx.currentTime;
    // Electric buzz
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(60, t + 0.3);

    lfo.type = 'sine';
    lfo.frequency.value = 30;
    lfoGain.gain.value = 50;

    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    gain.gain.setValueAtTime(vol * 0.4, t);
    gain.gain.linearRampToValueAtTime(0, t + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
    lfo.start(t);
    lfo.stop(t + 0.35);

    this.noiseBurst(0.15, vol * 0.3, 3000);
  }

  playDash(vol) {
    this.noiseBurst(0.12, vol * 0.3, 4000);
    this.quickTone(300, 'sine', 0.1, vol * 0.2, 800);
  }

  playStorm(vol) {
    const t = this.ctx.currentTime;
    this.noiseBurst(0.4, vol * 0.5, 600);
    this.quickToneAt(100, 'sine', 0.3, vol * 0.4, 40, t);
    this.quickToneAt(2000, 'sine', 0.15, vol * 0.2, 100, t + 0.1);
  }

  playInteract(vol) {
    const t = this.ctx.currentTime;
    this.quickToneAt(800, 'square', 0.06, vol * 0.25, 800, t);
    this.quickToneAt(1000, 'square', 0.06, vol * 0.25, 1000, t + 0.08);
  }

  playDeath(vol) {
    const t = this.ctx.currentTime;
    this.quickToneAt(400, 'sawtooth', 0.3, vol * 0.35, 80, t);
    this.quickToneAt(300, 'square', 0.4, vol * 0.2, 40, t + 0.1);
    this.quickToneAt(200, 'sine', 0.5, vol * 0.15, 30, t + 0.2);
    this.noiseBurst(0.3, vol * 0.15, 400);
  }

  playCheckpoint(vol) {
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047, 1319]; // C5 E5 G5 C6 E6
    notes.forEach((freq, i) => {
      this.quickToneAt(freq, 'sine', 0.15, vol * 0.25, freq, t + i * 0.08);
    });
  }

  playMenuSelect(vol) {
    const t = this.ctx.currentTime;
    this.quickToneAt(600, 'sine', 0.05, vol * 0.3, 800, t);
    this.quickToneAt(900, 'sine', 0.08, vol * 0.3, 900, t + 0.04);
  }

  playMenuMove(vol) {
    this.quickTone(500, 'sine', 0.04, vol * 0.2, 550);
  }

  // Helper: create a quick oscillator sound at currentTime
  quickTone(freq, type, duration, vol, pitchEnd) {
    this.quickToneAt(freq, type, duration, vol, pitchEnd, this.ctx.currentTime);
  }

  // Helper: create a quick oscillator sound at a specific time
  quickToneAt(freq, type, duration, vol, pitchEnd, startTime) {
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      if (pitchEnd && pitchEnd !== freq) {
        osc.frequency.linearRampToValueAtTime(pitchEnd, startTime + duration);
      }
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.linearRampToValueAtTime(0, startTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.01);
    } catch (e) { /* ignore */ }
  }

  // Helper: noise burst
  noiseBurst(duration, vol, filterFreq) {
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * duration);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = filterFreq || 1000;
      filter.Q.value = 1;
      const t = this.ctx.currentTime;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.linearRampToValueAtTime(0, t + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      source.start(t);
    } catch (e) { /* ignore */ }
  }
}

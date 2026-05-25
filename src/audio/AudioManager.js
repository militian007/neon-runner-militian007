import { SynthwaveGenerator } from './SynthwaveGenerator.js';
import { SFXGenerator } from './SFXGenerator.js';

export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicGen = null;
    this.sfxGen = null;
    this.musicVolume = 0.4;
    this.sfxVolume = 0.6;
    this.currentTrack = null;
    this.initialized = false;
    this.muted = false;
    this.musicMuted = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.musicGen = new SynthwaveGenerator(this.ctx);
      this.sfxGen = new SFXGenerator(this.ctx);
      this.initialized = true;
    } catch (e) {
      console.warn('AudioManager: Web Audio API not available', e);
    }
  }

  ensureInit() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMusic(track) {
    if (this.muted || this.musicMuted) return;
    this.ensureInit();
    if (!this.initialized) return;
    if (this.currentTrack === track) return;
    this.stopMusic();
    this.currentTrack = track;
    this.musicGen.play(track, this.musicVolume);
  }

  stopMusic() {
    if (this.musicGen) this.musicGen.stop();
    this.currentTrack = null;
  }

  playSFX(name) {
    if (this.muted) return;
    this.ensureInit();
    if (!this.initialized) return;
    this.sfxGen.play(name, this.sfxVolume);
  }

  setMusicVolume(v) {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGen) this.musicGen.setVolume(this.musicVolume);
  }

  setSFXVolume(v) {
    this.sfxVolume = Math.max(0, Math.min(1, v));
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusic();
    }
    return this.muted;
  }

  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    if (this.musicMuted) {
      this.stopMusic();
    } else if (this.currentTrack) {
      const track = this.currentTrack;
      this.currentTrack = null; // force restart
      this.playMusic(track);
    }
    return this.musicMuted;
  }

  getMusicVolume() { return this.musicVolume; }
  getSFXVolume() { return this.sfxVolume; }
  isMuted() { return this.muted; }
  isMusicMuted() { return this.musicMuted; }
}

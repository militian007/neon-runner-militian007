// ============================================
// NEON RUNNER — SynthwaveGenerator.js
// Procedural Synthwave Music Generator using Web Audio API
// Generates multiple retro cyberpunk tracks in real-time
// ============================================

export class SynthwaveGenerator {
  constructor(audioCtx) {
    this.ctx = audioCtx;
    this.masterGain = null;
    this.isPlaying = false;
    
    // Sequencer state
    this.bpm = 110;
    this.currentBeat = 0;
    this.nextNoteTime = 0;
    this.timerId = null;
    this.currentTrack = null;
    
    // Notes schedule window
    this.scheduleAheadTime = 0.15; // How far ahead to schedule audio (seconds)
    this.lookahead = 25.0; // How frequently to call scheduler (ms)
    
    // Music definitions
    this.tracks = {
      menu: {
        bpm: 105,
        scale: ['A2', 'C3', 'D3', 'E3', 'G3', 'A3', 'C4', 'E4'],
        chords: [
          ['Am', ['A2', 'C3', 'E3']],
          ['F',  ['F2', 'A2', 'C3']],
          ['C',  ['C2', 'E2', 'G2']],
          ['G',  ['G2', 'B2', 'D3']]
        ],
        bassline: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3], // Chords index per measure
        drums: { kick: [1,0,0,0, 1,0,0,0], snare: [0,0,1,0, 0,0,1,0], hat: [0,1,0,1, 0,1,0,1] }
      },
      zone1: {
        bpm: 115,
        scale: ['D2', 'F2', 'G2', 'A2', 'C3', 'D3', 'F3', 'A3'],
        chords: [
          ['Dm', ['D2', 'F2', 'A2']],
          ['Bb', ['Bb1', 'D2', 'F2']],
          ['C',  ['C2', 'E2', 'G2']],
          ['Am', ['A1', 'C2', 'E2']]
        ],
        bassline: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
        drums: { kick: [1,0,0,1, 1,0,0,0], snare: [0,0,1,0, 0,0,1,0], hat: [1,1,1,1, 1,1,1,1] }
      },
      zone2: {
        bpm: 120,
        scale: ['E2', 'G2', 'A2', 'B2', 'D3', 'E3', 'G3', 'B3'],
        chords: [
          ['Em', ['E2', 'G2', 'B2']],
          ['C',  ['C2', 'E2', 'G2']],
          ['D',  ['D2', 'F#2', 'A2']],
          ['Bm', ['B1', 'D2', 'F#2']]
        ],
        bassline: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
        drums: { kick: [1,0,0,0, 1,0,0,1], snare: [0,0,1,0, 0,0,1,0], hat: [0,1,0,1, 0,1,0,1] }
      },
      zone3: {
        bpm: 122,
        scale: ['F#2', 'A2', 'B2', 'C#3', 'E3', 'F#3', 'A3', 'C#4'],
        chords: [
          ['F#m', ['F#2', 'A2', 'C#3']],
          ['D',   ['D2', 'F#2', 'A2']],
          ['E',   ['E2', 'G#2', 'B2']],
          ['C#m', ['C#2', 'E2', 'G#2']]
        ],
        bassline: [0, 0, 1, 1, 2, 2, 3, 3],
        drums: { kick: [1,0,1,0, 1,0,1,0], snare: [0,0,1,0, 0,0,1,0], hat: [1,1,1,1, 1,1,1,1] }
      },
      zone4: {
        bpm: 125,
        scale: ['G2', 'Bb2', 'C3', 'D3', 'F3', 'G3', 'Bb3', 'D4'],
        chords: [
          ['Gm', ['G2', 'Bb2', 'D3']],
          ['Eb', ['Eb2', 'G2', 'Bb2']],
          ['F',  ['F2', 'A2', 'C3']],
          ['Dm', ['D2', 'F2', 'A3']]
        ],
        bassline: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
        drums: { kick: [1,0,0,0, 1,0,0,0], snare: [0,0,1,0, 0,0,1,0], hat: [1,1,1,1, 1,1,1,1] }
      },
      boss: {
        bpm: 132,
        scale: ['A2', 'A#2', 'C#3', 'D3', 'E3', 'F3', 'G#3', 'A3'],
        chords: [
          ['Am_phryg', ['A2', 'A#2', 'E3']],
          ['F_maj',    ['F2', 'A2', 'C3']],
          ['D_dim',    ['D2', 'F2', 'G#2']],
          ['E_dom',    ['E2', 'G#2', 'D3']]
        ],
        bassline: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
        drums: { kick: [1,0,1,0, 1,0,1,0], snare: [0,0,1,0, 0,1,1,0], hat: [1,1,1,1, 1,1,1,1] }
      },
      gameover: {
        bpm: 85,
        scale: ['A2', 'C3', 'D3', 'E3', 'G3', 'A3'],
        chords: [
          ['Am', ['A2', 'C3', 'E3']],
          ['Dm', ['D2', 'F2', 'A2']],
          ['F',  ['F2', 'A2', 'C3']],
          ['E7', ['E2', 'G#2', 'D3']]
        ],
        bassline: [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3],
        drums: { kick: [1,0,0,0, 0,0,0,0], snare: [0,0,0,0, 0,0,0,0], hat: [0,0,0,0, 0,0,0,0] }
      }
    };

    this.noteFrequencies = {
      'C2': 65.41, 'C#2': 69.30, 'D2': 73.42, 'D#2': 77.78, 'E2': 82.41, 'F2': 87.31, 'F#2': 92.50, 'G2': 98.00, 'G#2': 103.83, 'A2': 110.00, 'A#2': 116.54, 'B2': 123.47,
      'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56, 'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00, 'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
      'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13, 'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00, 'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
      'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
      'Bb1': 58.27, 'Eb2': 77.78, 'Bb2': 116.54, 'Bb3': 233.08
    };
  }

  play(trackName, volume) {
    if (this.isPlaying) this.stop();
    
    this.currentTrack = this.tracks[trackName] ? trackName : 'menu';
    const track = this.tracks[this.currentTrack];
    this.bpm = track.bpm;
    this.currentBeat = 0;
    this.isPlaying = true;

    // Create master gain node
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(volume || 0.4, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.nextNoteTime = this.ctx.currentTime;
    this.scheduler();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.masterGain) {
      try {
        this.masterGain.disconnect();
      } catch (e) {}
      this.masterGain = null;
    }
  }

  setVolume(volume) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  scheduler() {
    if (!this.isPlaying) return;
    
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentBeat, this.nextNoteTime);
      this.advanceNote();
    }
    
    this.timerId = setTimeout(() => this.scheduler(), this.lookahead);
  }

  advanceNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    const noteLength = 0.25 * secondsPerBeat; // 16th notes
    this.nextNoteTime += noteLength;
    
    this.currentBeat = (this.currentBeat + 1) % 64; // Loop every 4 measures (16 beats = 64 sixteenth notes)
  }

  scheduleNote(beat, time) {
    const track = this.tracks[this.currentTrack];
    
    // Determinate which measure we are on (0-3)
    const stepInMeasure = beat % 16;
    const measure = Math.floor(beat / 16);
    
    // Find current chord index
    const chordIdx = track.bassline[measure % track.bassline.length];
    const currentChord = track.chords[chordIdx];
    const chordNotes = currentChord[1];
    
    // Drums (only if not gameover, or muted drums)
    const drumStep = beat % 8;
    
    // 1. Kick Drum (Synthesized pitch envelope + filter click)
    if (track.drums.kick[drumStep]) {
      this.playSynthKick(time);
    }

    // 2. Snare Drum (Noise bandpass burst)
    if (track.drums.snare[drumStep]) {
      this.playSynthSnare(time);
    }

    // 3. Hi-Hat (Noise highpass burst)
    if (track.drums.hat[drumStep] && (beat % 2 === 1)) {
      this.playSynthHat(time);
    }

    // 4. Bassline (16th note arpeggiator or syncopated pumping)
    // Classic driving cyberpunk bass: 16th notes on the root note of chord
    if (beat % 2 === 0 || this.currentTrack === 'boss') {
      // Alternate root and octave
      const rootNote = chordNotes[0];
      const frequency = this.noteFrequencies[rootNote] || 55;
      const finalFreq = (beat % 4 === 2) ? frequency * 2.0 : frequency;
      
      this.playBassTone(finalFreq, time, 0.1);
    }

    // 5. Synth Chords/Pad (Stately pads on beat 0 of each measure)
    if (stepInMeasure === 0) {
      chordNotes.forEach(noteName => {
        const freq = this.noteFrequencies[noteName] || 220;
        this.playPadTone(freq * 2.0, time, 60.0 / this.bpm * 4.0 * 0.95);
      });
    }

    // 6. Arpeggio / Lead Melody (Different for each zone to give identity)
    this.scheduleLeadMelody(beat, time, chordNotes, track.scale);
  }

  scheduleLeadMelody(beat, time, chordNotes, scale) {
    const stepInMeasure = beat % 16;
    
    // We play arpeggios or lead lines based on the track
    if (this.currentTrack === 'menu') {
      // Relaxed, dreamy 8th note arpeggios
      if (beat % 2 === 0) {
        const noteIdx = (beat / 2) % chordNotes.length;
        const note = chordNotes[noteIdx];
        const freq = (this.noteFrequencies[note] || 220) * 4.0; // Shift up two octaves
        this.playLeadTone(freq, time, 0.15, 'sine', 0.08);
      }
    } else if (this.currentTrack === 'zone1') {
      // Driving 16th note cyberpunk arpeggio
      const notes = [0, 1, 2, 1, 2, 3, 2, 1];
      const idx = beat % notes.length;
      const scaleNote = scale[notes[idx] % scale.length];
      const freq = (this.noteFrequencies[scaleNote] || 110) * 4.0;
      this.playLeadTone(freq, time, 0.08, 'sawtooth', 0.05, 1200);
    } else if (this.currentTrack === 'zone2') {
      // Tech-y glitchy arpeggios
      if (beat % 4 !== 3) {
        const notes = [0, 2, 4, 3, 5, 4, 6, 5];
        const idx = (beat + Math.floor(beat/8)) % notes.length;
        const scaleNote = scale[notes[idx] % scale.length];
        const freq = (this.noteFrequencies[scaleNote] || 110) * 4.0;
        this.playLeadTone(freq, time, 0.06, 'triangle', 0.08, 1500);
      }
    } else if (this.currentTrack === 'zone3') {
      // Glitchy syncopation and sweeps
      if (beat % 3 === 0) {
        const scaleNote = scale[Math.floor(beat/3) % scale.length];
        const freq = (this.noteFrequencies[scaleNote] || 110) * 4.0;
        this.playLeadTone(freq, time, 0.1, 'square', 0.04, 800);
      }
    } else if (this.currentTrack === 'zone4') {
      // Epic sweeping melody
      const melody = [
        0, -1, 2, -1, 3, -1, 4, -1,
        5, -1, 4, -1, 3, -1, 2, -1
      ];
      const noteOffset = melody[stepInMeasure];
      if (noteOffset !== -1) {
        const chordNotesExtended = [...chordNotes, ...scale.slice(0, 4)];
        const note = chordNotesExtended[noteOffset % chordNotesExtended.length];
        const freq = (this.noteFrequencies[note] || 220) * 4.0;
        this.playLeadTone(freq, time, 0.25, 'sawtooth', 0.07, 2000);
      }
    } else if (this.currentTrack === 'boss') {
      // Fast, aggressive, tense metal-synth lead
      if (beat % 2 === 0) {
        const bossMelody = [0, 1, 2, 1, 3, 2, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5];
        const noteName = scale[bossMelody[beat % bossMelody.length] % scale.length];
        const freq = (this.noteFrequencies[noteName] || 110) * 4.0;
        this.playLeadTone(freq, time, 0.1, 'sawtooth', 0.1, 3000, true);
      }
    } else if (this.currentTrack === 'gameover') {
      // Sad slow ambient notes
      if (beat % 8 === 0) {
        const note = chordNotes[1];
        const freq = (this.noteFrequencies[note] || 220) * 3.0;
        this.playLeadTone(freq, time, 0.8, 'sine', 0.08);
      }
    }
  }

  // --- SYNTH GENERATORS ---

  playSynthKick(time) {
    if (!this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.frequency.setValueAtTime(120, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.12);
      
      gain.gain.setValueAtTime(0.4, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);
      
      osc.start(time);
      osc.stop(time + 0.13);
    } catch(e) {}
  }

  playSynthSnare(time) {
    if (!this.masterGain) return;
    try {
      // Noise buffer
      const bufferSize = this.ctx.sampleRate * 0.15;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, time);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.14);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      noise.start(time);
      noise.stop(time + 0.15);
      
      // Tone part of snare
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, time);
      osc.frequency.linearRampToValueAtTime(100, time + 0.08);
      
      oscGain.gain.setValueAtTime(0.12, time);
      oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);
      
      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      
      osc.start(time);
      osc.stop(time + 0.09);
    } catch(e) {}
  }

  playSynthHat(time) {
    if (!this.masterGain) return;
    try {
      const bufferSize = this.ctx.sampleRate * 0.04;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(8000, time);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.04, time);
      gain.gain.exponentialRampToValueAtTime(0.005, time + 0.035);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      noise.start(time);
      noise.stop(time + 0.04);
    } catch(e) {}
  }

  playBassTone(freq, time, duration) {
    if (!this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const lowpass = this.ctx.createBiquadFilter();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      
      lowpass.type = 'lowpass';
      lowpass.frequency.setValueAtTime(180, time);
      lowpass.frequency.exponentialRampToValueAtTime(450, time + 0.03);
      lowpass.frequency.exponentialRampToValueAtTime(150, time + duration);
      
      gain.gain.setValueAtTime(0.18, time);
      gain.gain.linearRampToValueAtTime(0.12, time + 0.02);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      
      osc.connect(lowpass);
      lowpass.connect(gain);
      gain.connect(this.masterGain);
      
      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch(e) {}
  }

  playPadTone(freq, time, duration) {
    if (!this.masterGain) return;
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();
      
      // Detuned dual saws for premium thickness
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(freq - 1.5, time);
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq + 1.5, time);
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, time);
      filter.frequency.linearRampToValueAtTime(1200, time + duration * 0.3);
      filter.frequency.exponentialRampToValueAtTime(500, time + duration);
      
      // Soft attack & release
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.06, time + 0.4);
      gain.gain.setValueAtTime(0.06, time + duration - 0.5);
      gain.gain.linearRampToValueAtTime(0, time + duration);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      
      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration + 0.02);
      osc2.stop(time + duration + 0.02);
    } catch(e) {}
  }

  playLeadTone(freq, time, duration, type, volume, filterCutoff, bypassFilter) {
    if (!this.masterGain) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type || 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(volume || 0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      if (bypassFilter) {
        osc.connect(gain);
      } else {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterCutoff || 1500, time);
        filter.frequency.exponentialRampToValueAtTime(300, time + duration);
        osc.connect(filter);
        filter.connect(gain);
      }
      
      gain.connect(this.masterGain);
      
      osc.start(time);
      osc.stop(time + duration + 0.02);
    } catch(e) {}
  }
}

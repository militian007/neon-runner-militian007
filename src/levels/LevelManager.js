// ============================================
// NEON RUNNER — LevelManager.js
// Handles level loading, zone calculations, and progression tracking
// Saves progress persistently via localStorage
// ============================================

import { levels } from './LevelData.js';

export default class LevelManager {
  constructor() {
    this.levels = levels;
    this.unlockedLevels = Array.from({ length: 20 }, (_, i) => i + 1); // Unlock all 20 levels in dev
    this.completedLevels = {}; // e.g. { 1: { score: 1200, stars: 3 } }
    
    this.loadProgress();
    this.unlockedLevels = Array.from({ length: 20 }, (_, i) => i + 1); // Force unlock all levels
  }

  loadLevel(levelNum) {
    if (levelNum < 1 || levelNum > 20) {
      console.error(`LevelManager: level index ${levelNum} out of bounds.`);
      return null;
    }
    
    // LevelData is 0-indexed, but game logic is 1-indexed
    const level = this.levels[levelNum - 1];
    if (!level) return null;
    
    // Return a deep copy so playing the level doesn't mutate the templates
    return JSON.parse(JSON.stringify(level));
  }

  getZone(levelNum) {
    // 20 levels split across 4 zones (5 levels per zone)
    // Zone 1: levels 1-5 (Neon Streets)
    // Zone 2: levels 6-10 (Cyber Grid)
    // Zone 3: levels 11-15 (Glitch Sector)
    // Zone 4: levels 16-20 (Singularity Core)
    return Math.min(4, Math.floor((levelNum - 1) / 5) + 1);
  }

  getZoneName(zoneNum) {
    const names = {
      1: 'Neon Streets',
      2: 'Cyber Grid',
      3: 'Glitch Sector',
      4: 'Singularity Core'
    };
    return names[zoneNum] || 'Unknown Sector';
  }

  completeLevel(levelNum, score, stars) {
    // Record score and stars
    const prevRecord = this.completedLevels[levelNum];
    const prevStars = prevRecord ? prevRecord.stars : 0;
    const prevScore = prevRecord ? prevRecord.score : 0;

    this.completedLevels[levelNum] = {
      score: Math.max(prevScore, score),
      stars: Math.max(prevStars, stars)
    };

    // Unlock next level
    const nextLevel = levelNum + 1;
    if (nextLevel <= 20 && !this.unlockedLevels.includes(nextLevel)) {
      this.unlockedLevels.push(nextLevel);
    }

    this.saveProgress();
  }

  saveProgress() {
    try {
      const data = {
        unlocked: this.unlockedLevels,
        completed: this.completedLevels
      };
      localStorage.setItem('neon_runner_progress', JSON.stringify(data));
    } catch (e) {
      console.warn('LevelManager: Failed to save progress to localStorage', e);
    }
  }

  loadProgress() {
    try {
      const dataStr = localStorage.getItem('neon_runner_progress');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        if (data.unlocked) this.unlockedLevels = Array.from({ length: 20 }, (_, i) => i + 1); // Keep all levels unlocked in dev
        if (data.completed) this.completedLevels = data.completed;
        
        // Ensure level 1 is always unlocked
        if (!this.unlockedLevels.includes(1)) {
          this.unlockedLevels.push(1);
        }
        // Sort for safety
        this.unlockedLevels.sort((a, b) => a - b);
      }
    } catch (e) {
      console.warn('LevelManager: Failed to load progress from localStorage', e);
    }
  }

  resetProgress() {
    this.unlockedLevels = Array.from({ length: 20 }, (_, i) => i + 1); // Keep all levels unlocked in dev
    this.completedLevels = {};
    this.saveProgress();
  }
}

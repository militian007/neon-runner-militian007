// ============================================
// NEON RUNNER — Game.js
// Central game orchestrator
// Manages game states, game loop, and coordinates all systems
// ============================================

import { Input, Camera, NeonRenderer, checkAABB, resolveVerticalTileCollisions, resolveHorizontalTileCollisions, applyGravity, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from '../engine.js';
import Player from '../entities/Player.js';
import PowerManager from '../powers/PowerManager.js';
import LevelManager from '../levels/LevelManager.js';
import TileRenderer from '../levels/TileRenderer.js';
import Background from '../graphics/Background.js';
import ParticleSystem from '../graphics/ParticleSystem.js';
import Effects from '../graphics/Effects.js';
import AudioManager from '../audio/AudioManager.js';
import HUD from '../ui/HUD.js';
import MenuScreen from '../ui/MenuScreen.js';
import LevelSelect from '../ui/LevelSelect.js';
import PauseMenu from '../ui/PauseMenu.js';
import GameOverScreen from '../ui/GameOverScreen.js';
import VictoryScreen from '../ui/VictoryScreen.js';
import Collectible from '../entities/Collectible.js';
import Projectile from '../entities/Projectile.js';
import Platform from '../entities/Platform.js';
import Hazard from '../entities/Hazard.js';
import Interactive from '../entities/Interactive.js';
import StoryScreen from '../ui/StoryScreen.js';

// Enemy imports
import DronePatrol from '../entities/enemies/DronePatrol.js';
import SecurityBot from '../entities/enemies/SecurityBot.js';
import Turret from '../entities/enemies/Turret.js';
import HackerDrone from '../entities/enemies/HackerDrone.js';
import GlitchEntity from '../entities/enemies/GlitchEntity.js';
import MechSoldier from '../entities/enemies/MechSoldier.js';
import HealthBox from '../entities/enemies/HealthBox.js';
import WardenX1 from '../entities/enemies/bosses/WardenX1.js';
import NexusCore from '../entities/enemies/bosses/NexusCore.js';
import MalwareZero from '../entities/enemies/bosses/MalwareZero.js';
import Omega from '../entities/enemies/bosses/Omega.js';

// Game states
const STATE = {
  LOADING: 'loading',
  MENU: 'menu',
  LEVEL_SELECT: 'level_select',
  STORY: 'story',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  TRANSITION: 'transition'
};

// Enemy type constructor map
const ENEMY_CONSTRUCTORS = {
  'drone': DronePatrol,
  'security': SecurityBot,
  'turret': Turret,
  'hacker': HackerDrone,
  'glitch': GlitchEntity,
  'mech': MechSoldier,
  'health_box': HealthBox,
  'boss_warden': WardenX1,
  'boss_nexus': NexusCore,
  'boss_malware': MalwareZero,
  'boss_omega': Omega
};

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    // Core systems
    this.input = new Input(canvas);
    this.camera = new Camera(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.effects = new Effects();
    this.levelManager = new LevelManager();
    this.tileRenderer = new TileRenderer();
    this.background = new Background();
    this.hud = new HUD();

    // UI Screens
    this.menuScreen = new MenuScreen();
    this.levelSelect = new LevelSelect();
    this.pauseMenu = new PauseMenu();
    this.gameOverScreen = new GameOverScreen();
    this.victoryScreen = new VictoryScreen();
    this.storyScreen = new StoryScreen();

    // Game entities (set when level loads)
    this.player = null;
    this.powerManager = null;
    this.enemies = [];
    this.projectiles = [];
    this.collectibles = [];
    this.platforms = [];
    this.hazards = [];
    this.interactives = [];

    // Level data
    this.currentLevel = null;
    this.tiles = [];
    this.levelWidth = 0;
    this.levelHeight = 0;

    // Game state
    this.state = STATE.MENU;
    this.score = 0;
    this.lives = 3;
    this.time = 0;
    this.currentLevelNum = 1;

    // Transition
    this.transitionAlpha = 0;
    this.transitionTarget = null;
    this.transitionCallback = null;

    // Timing
    this.lastTime = 0;
    this.accumulator = 0;
    this.fixedDt = 1 / 60; // 60 FPS logic
    this.running = false;
    this.wasMouseDownMute = false;

    // Bind the game loop
    this._gameLoop = this._gameLoop.bind(this);
  }

  // ---- LIFECYCLE ----

  start() {
    this.running = true;
    this.audio.init();
    this.audio.playMusic('menu');
    this.lastTime = performance.now();
    requestAnimationFrame(this._gameLoop);
  }

  _gameLoop(timestamp) {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1); // Cap delta
    this.lastTime = timestamp;

    // Apply time scale from effects (slow-mo)
    const timeScale = this.effects.getTimeScale();
    const scaledDt = dt * timeScale;

    // Fixed timestep for physics
    this.accumulator += scaledDt;
    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }

    this.render();
    this.input.update(); // Reset pressed states after frame

    requestAnimationFrame(this._gameLoop);
  }

  // ---- STATE MANAGEMENT ----

  setState(newState) {
    const oldState = this.state;
    this.state = newState;

    // State entry actions
    switch (newState) {
      case STATE.MENU:
        this.audio.playMusic('menu');
        break;
      case STATE.PLAYING:
        if (oldState === STATE.PAUSED) break; // Resume, don't restart music
        break;
      case STATE.PAUSED:
        break;
      case STATE.GAME_OVER:
        this.audio.playMusic('gameover');
        this.audio.playSFX('death');
        break;
      case STATE.VICTORY:
        this.audio.playSFX('checkpoint');
        break;
    }
  }

  startTransition(callback) {
    this.state = STATE.TRANSITION;
    this.transitionAlpha = 0;
    this.transitionCallback = callback;
    this.transitionTarget = 1; // Fade to black
  }

  // ---- UPDATE ----

  update(dt) {
    switch (this.state) {
      case STATE.MENU:
        this.updateMenu(dt);
        break;
      case STATE.LEVEL_SELECT:
        this.updateLevelSelect(dt);
        break;
      case STATE.STORY:
        this.updateStory(dt);
        break;
      case STATE.PLAYING:
        this.updatePlaying(dt);
        break;
      case STATE.PAUSED:
        this.updatePaused(dt);
        break;
      case STATE.GAME_OVER:
        this.updateGameOver(dt);
        break;
      case STATE.VICTORY:
        this.updateVictory(dt);
        break;
      case STATE.TRANSITION:
        this.updateTransition(dt);
        break;
    }

    // Always update effects and background
    this.effects.update(dt);
    this.background.update(dt);

    // Fade back in if we switched state mid-transition
    if (this.state !== STATE.TRANSITION && this.transitionAlpha > 0) {
      this.transitionAlpha -= dt * 3;
      if (this.transitionAlpha < 0) this.transitionAlpha = 0;
    }
  }

  updateMenu(dt) {
    const result = this.menuScreen.update(dt, this.input);
    if (result === 'play') {
      this.startTransition(() => {
        this.score = 0;
        this.loadLevel(1);
        this.storyScreen.setup(this.currentLevelNum);
        this.setState(STATE.STORY);
      });
    } else if (result === 'levels') {
      this.setState(STATE.LEVEL_SELECT);
    }
  }

  updateLevelSelect(dt) {
    const result = this.levelSelect.update(
      dt, this.input,
      this.levelManager.unlockedLevels,
      this.levelManager.completedLevels || {}
    );
    if (result) {
      if (result.action === 'select') {
        this.startTransition(() => {
          this.score = 0;
          this.loadLevel(result.level);
          this.storyScreen.setup(this.currentLevelNum);
          this.setState(STATE.STORY);
        });
      } else if (result.action === 'back') {
        this.setState(STATE.MENU);
      }
    }
  }

  checkMuteButtonClick() {
    if (this.input.isMouseDown() && !this.wasMouseDownMute) {
      this.wasMouseDownMute = true;
      const mousePos = this.input.getMousePos();
      // Mute button in bottom-right corner: X [1225, 1265], Y [655, 695]
      if (mousePos.x >= 1225 && mousePos.x <= 1265 &&
          mousePos.y >= 655 && mousePos.y <= 695) {
        return true;
      }
    }
    if (!this.input.isMouseDown()) {
      this.wasMouseDownMute = false;
    }
    return false;
  }

  updatePlaying(dt) {
    // Pause check
    if (this.input.isPressed('escape')) {
      this.setState(STATE.PAUSED);
      return;
    }

    // Toggle music mute with M key or click
    if (this.input.isPressed('m') || this.checkMuteButtonClick()) {
      this.audio.toggleMusicMute();
    }

    this.time += dt;

    // 1. Update moving platforms first
    for (const plat of this.platforms) {
      plat.update(dt);
    }

    // 2. Carry player if standing on a moving platform (before player physics/tile collision)
    if (this.player && this.player.alive && this.player.standingOnPlatform) {
      const plat = this.player.standingOnPlatform;
      if (this.platforms.includes(plat) && !plat.broken && plat.visible) {
        this.player.x += plat.platformVX;
        this.player.y += plat.platformVY;
      } else {
        this.player.standingOnPlatform = null;
      }
    }

    // Take screenshot with P key
    if (this.input.isPressed('p')) {
      this.takeScreenshot();
    }

    // 3. Update player
    if (this.player && this.player.alive) {
      // Skill activation warnings
      if (this.input.isPressed('q') && !this.powerManager.canUseEMP()) {
        this.audio.playSFX('deny');
        if (this.player.energy < this.powerManager.empShieldEnergyCost) {
          this.hud.addNotification('SHIELD: NEED 40% ENERGY', this.player.getCenterX(), this.player.y - 20, '#00f0ff');
        } else {
          this.hud.addNotification('SHIELD ON COOLDOWN', this.player.getCenterX(), this.player.y - 20, '#00f0ff');
        }
      }
      if (this.input.isPressed('e') && !this.powerManager.canUsePhase()) {
        this.audio.playSFX('deny');
        this.hud.addNotification('DASH ON COOLDOWN', this.player.getCenterX(), this.player.y - 20, '#ff00aa');
      }
      if (this.input.isPressed('r') && !this.powerManager.canUseNeonStorm()) {
        this.audio.playSFX('deny');
        if (this.powerManager.neonStormActive) {
          this.hud.addNotification('NEON STORM ACTIVE', this.player.getCenterX(), this.player.y - 20, '#ffe600');
        } else {
          this.hud.addNotification('NEON STORM: NEED 80% ENERGY', this.player.getCenterX(), this.player.y - 20, '#ffe600');
        }
      }

      this.player.update(dt, this.input, this.tiles);

      // Update powers
      this.powerManager.update(dt, this.input);

      // Camera follows player
      this.camera.follow(
        this.player,
        this.levelWidth * TILE_SIZE,
        this.levelHeight * TILE_SIZE,
        dt
      );
    }

    this.camera.update(dt);

    // 4. Player vs Special Platforms (detect landing and snap Y)
    let foundPlatform = null;
    if (this.player && this.player.alive && this.player.vy >= 0 && !this.player.dropThrough) {
      for (const plat of this.platforms) {
        if (plat.isStandingOn(this.player.x, this.player.y, this.player.width, this.player.height, this.player.vy)) {
          // Snap player to top of platform
          this.player.y = plat.y - this.player.height;
          this.player.vy = 0;
          this.player.grounded = true;
          this.player.canDoubleJump = true;

          // If platform is breakable, trigger it
          if (plat.type === 'breakable') {
            plat.triggerBreak();
          }

          if (plat.type === 'moving') {
            foundPlatform = plat;
          }
          break; // Stand on one platform at a time
        }
      }
    }
    this.player.standingOnPlatform = foundPlatform;

    // Update hazards
    for (const hazard of this.hazards) {
      hazard.update(dt);
    }

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive) {
        // Enemy death effects
        this.particles.emit(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          'explosion', 15, { color: '#ff00aa' }
        );
        this.score += enemy.scoreValue;
        this.hud.addScore(enemy.scoreValue);
        this.hud.addNotification(
          `+${enemy.scoreValue}`,
          enemy.x + enemy.width / 2,
          enemy.y,
          '#ffe600'
        );
        this.audio.playSFX('enemy_die');

        // Spawn a health item if a health box is destroyed
        if (enemy.type === 'health_box') {
          this.collectibles.push(new Collectible(
            enemy.x + enemy.width / 2 - 12,
            enemy.y + enemy.height / 2 - 12,
            'health'
          ));
        }

        this.enemies.splice(i, 1);
        continue;
      }

      const proj = enemy.update(
        dt, this.tiles,
        this.player ? this.player.getCenterX() : 0,
        this.player ? this.player.getCenterY() : 0
      );

      // Enemy spawned projectile
      if (proj) {
        if (Array.isArray(proj)) {
          proj.forEach(p => {
            this.projectiles.push(new Projectile(
              p.x, p.y, p.vx, p.vy, 'enemy', p.damage || 10, p.color || '#ff00aa'
            ));
          });
        } else {
          this.projectiles.push(new Projectile(
            proj.x, proj.y, proj.vx, proj.vy, 'enemy', proj.damage || 10, proj.color || '#ff00aa'
          ));
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.update(dt);

      if (!proj.alive) {
        this.projectiles.splice(i, 1);
        continue;
      }

      // Check projectile-tile collision
      const col = Math.floor(proj.x / TILE_SIZE);
      const row = Math.floor(proj.y / TILE_SIZE);
      if (row >= 0 && row < this.levelHeight && col >= 0 && col < this.levelWidth) {
        if (this.tiles[row] && this.tiles[row][col] === 1) {
          this.particles.emit(proj.x, proj.y, 'spark', 5, { color: proj.color });
          proj.destroy();
          this.projectiles.splice(i, 1);
          continue;
        }
      }

      // Projectile vs Player
      if (proj.owner === 'enemy' && this.player && this.player.alive) {
        if (!this.powerManager.isPlayerIntangible()) {
          if (checkAABB(proj, this.player)) {
            if (this.powerManager.isShieldActive()) {
              // Reflect projectile
              proj.vx *= -1;
              proj.vy *= -0.5;
              proj.owner = 'player';
              proj.color = '#00f0ff';
              this.audio.playSFX('emp');
            } else {
              this.player.takeDamage(proj.damage);
              this.audio.playSFX('hit');
              this.effects.shake(5, 0.2);
              this.particles.emit(
                proj.x, proj.y, 'spark', 8, { color: '#ff4444' }
              );
              proj.destroy();
              this.projectiles.splice(i, 1);
            }
          }
        }
      }

      // Projectile vs Enemies (player projectiles or reflected)
      if (proj.owner === 'player') {
        for (const enemy of this.enemies) {
          if (enemy.alive && checkAABB(proj, enemy)) {
            enemy.takeDamage(proj.damage);
            this.audio.playSFX('enemy_hit');
            this.particles.emit(proj.x, proj.y, 'spark', 5, { color: '#00f0ff' });
            proj.destroy();
            break;
          }
        }
      }
    }

    // Update collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const col = this.collectibles[i];
      col.update(dt);

      if (!col.collected && this.player && checkAABB(col, this.player)) {
        col.collect();
        this.audio.playSFX('coin');
        this.particles.emit(
          col.x + col.width / 2,
          col.y + col.height / 2,
          'spark', 10, { color: '#ffe600' }
        );

        switch (col.type) {
          case 'chip':
            this.player.addEnergy(15);
            this.score += 50;
            this.hud.addScore(50);
            this.hud.addNotification('+15 Energy', col.x, col.y, '#ffe600');
            break;
          case 'health':
            this.player.heal(25);
            this.hud.addNotification('+25 HP', col.x, col.y, '#00ff88');
            break;
          case 'life':
            this.lives++;
            this.hud.addNotification('+1 LIFE', col.x, col.y, '#00f0ff');
            break;
        }

        this.collectibles.splice(i, 1);
      }
    }

    // Player vs Enemy collision (contact damage)
    if (this.player && this.player.alive && !this.powerManager.isPlayerIntangible()) {
      for (const enemy of this.enemies) {
        if (!enemy.alive || enemy.dying) continue;
        if (checkAABB(this.player, enemy)) {
          // Check if player is above enemy (stomp)
          const playerBottom = this.player.y + this.player.height;
          const enemyTop = enemy.y;
          const playerCenterX = this.player.getCenterX();
          const enemyLeft = enemy.x;
          const enemyRight = enemy.x + enemy.width;

          if (this.player.vy > 0 && playerBottom - enemyTop < 15 &&
              playerCenterX > enemyLeft && playerCenterX < enemyRight) {
            // Stomp enemy
            enemy.takeDamage(30);
            this.player.vy = -10; // Bounce up
            this.audio.playSFX('enemy_hit');
            this.effects.shake(3, 0.15);
            this.score += 50;
            this.hud.addScore(50);
          } else if (!this.player.invincible && enemy.type !== 'health_box') {
            // Player takes contact damage
            if (this.powerManager.isShieldActive()) {
              // Shield blocks contact damage
              this.audio.playSFX('emp');
            } else {
              this.player.takeDamage(enemy.damage);
              this.audio.playSFX('hit');
              this.effects.shake(6, 0.3);
              // Knockback
              this.player.vx = this.player.getCenterX() < enemy.x + enemy.width / 2 ? -6 : 6;
              this.player.vy = -5;
            }
          }
        }
      }
    }

    // Player attack vs enemies
    if (this.player && this.player.attacking) {
      const attackBox = this.player.getAttackHitbox();
      if (attackBox) {
        for (const enemy of this.enemies) {
          if (enemy.alive && !enemy.dying && checkAABB(attackBox, enemy)) {
            enemy.takeDamage(25);
            this.audio.playSFX('enemy_hit');
            this.particles.emit(
              enemy.x + enemy.width / 2,
              enemy.y + enemy.height / 2,
              'spark', 8, { color: '#00f0ff' }
            );
            this.effects.shake(4, 0.15);
          }
        }
      }
    }

    // Neon Storm damage (R power)
    if (this.powerManager.neonStormActive && this.powerManager.neonStormTimer > this.powerManager.neonStormDuration - 0.1) {
      // Apply damage once at start of storm only to enemies within 6 tiles (240px)
      const playerCX = this.player.getCenterX();
      const playerCY = this.player.getCenterY();
      const range = 6 * 40; // 6 tiles * 40 pixels/tile = 240 pixels

      for (const enemy of this.enemies) {
        if (enemy.alive) {
          const enemyCX = enemy.x + enemy.width / 2;
          const enemyCY = enemy.y + enemy.height / 2;
          const dx = enemyCX - playerCX;
          const dy = enemyCY - playerCY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= range) {
            enemy.takeDamage(50);
            this.particles.emit(
              enemyCX,
              enemyCY,
              'electric', 15, { color: '#8b5cf6' }
            );
          }
        }
      }
      this.effects.flashScreen('#8b5cf6', 0.3);
      this.effects.shake(10, 0.5);
      this.audio.playSFX('storm');
    }

    // Player vs Hazards
    if (this.player && this.player.alive && !this.player.invincible) {
      for (const hazard of this.hazards) {
        if (hazard.active && checkAABB(this.player, hazard)) {
          if (!this.powerManager.isPlayerIntangible()) {
            this.player.takeDamage(hazard.damage);
            this.audio.playSFX('hit');
            this.effects.shake(4, 0.2);
          }
        }
      }

      // Also check spike tiles (type 3)
      const pcx = Math.floor(this.player.getCenterX() / TILE_SIZE);
      const pby = Math.floor((this.player.y + this.player.height) / TILE_SIZE);
      if (pby >= 0 && pby < this.levelHeight && pcx >= 0 && pcx < this.levelWidth) {
        if (this.tiles[pby] && this.tiles[pby][pcx] === 3) {
          this.player.takeDamage(20);
          this.effects.shake(4, 0.2);
        }
      }
    }

    // Player vs Interactives (F key)
    if (this.player) {
      for (const inter of this.interactives) {
        const dist = Math.abs(this.player.getCenterX() - (inter.x + inter.width / 2)) +
                     Math.abs(this.player.getCenterY() - (inter.y + inter.height / 2));
        inter.update(dt, dist);

        if (inter.showPrompt && this.input.isPressed('f')) {
          const result = inter.interact();
          this.audio.playSFX('interact');
          this.particles.emit(
            inter.x + inter.width / 2,
            inter.y + inter.height / 2,
            'data', 10, { color: '#00ff88' }
          );

          if (inter.type === 'checkpoint') {
            this.checkpoint = { x: inter.x, y: inter.y };
            this.hud.addNotification('SAVE COMPLETED', inter.x, inter.y - 20, '#00f0ff');
          }

          // Handle interaction results
          if (result && result.action === 'open_door') {
            // Find and remove door tiles or toggle hazards
            this.handleDoorOpen(result.target);
          }
        }
      }
    }

    // Check exit
    if (this.player && this.player.alive && this.currentLevel) {
      let exitX = this.currentLevel.exit.x * TILE_SIZE;
      let exitY = this.currentLevel.exit.y * TILE_SIZE;

      const isBossLevel = !!this.currentLevel.boss;
      const bossAlive = isBossLevel && this.enemies.some(e => e.type.startsWith('boss') && e.alive);

      if (isBossLevel) {
        // Boss level: portal appears in the middle (x = 22, y = 10) once the boss is dead
        exitX = (Math.floor(this.levelWidth / 2) - 1) * TILE_SIZE;
        exitY = 10 * TILE_SIZE;
      }

      const exitBox = { x: exitX, y: exitY, width: TILE_SIZE, height: TILE_SIZE * 2 };

      if (checkAABB(this.player, exitBox)) {
        if (!isBossLevel || !bossAlive) {
          this.completeLevel();
        }
      }
    }

    // Check player death
    if (this.player && !this.player.alive) {
      this.lives--;
      if (this.lives <= 0) {
        this.setState(STATE.GAME_OVER);
      } else {
        // Respawn
        this.respawnPlayer();
      }
    }

    // Check if player fell off the map
    if (this.player && this.player.y > this.levelHeight * TILE_SIZE + 100) {
      this.player.die();
    }

    // Update particles
    this.particles.update(dt);

    // Update HUD
    this.hud.update(dt, this.player, this.powerManager);
  }

  takeScreenshot() {
    try {
      const dataURL = this.canvas.toDataURL('image/png');
      const link = document.createElement('a');
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const sec = String(now.getSeconds()).padStart(2, '0');
      link.download = `neon-runner-capture-${year}${month}${day}-${hour}${min}${sec}.png`;
      link.href = dataURL;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Add a notification on the HUD
      if (this.hud && this.player) {
        this.hud.addNotification('CAPTURA GUARDADA', this.player.getCenterX(), this.player.y - 20, '#00ff88');
      }
    } catch (e) {
      console.error('Failed to capture screenshot:', e);
    }
  }

  updatePaused(dt) {
    const result = this.pauseMenu.update(dt, this.input);
    if (result === 'resume' || this.input.isPressed('escape')) {
      this.setState(STATE.PLAYING);
    } else if (result === 'restart') {
      this.startTransition(() => {
        this.loadLevel(this.currentLevelNum);
        this.setState(STATE.PLAYING);
      });
    } else if (result === 'quit to menu') {
      this.startTransition(() => {
        this.setState(STATE.MENU);
      });
    }
  }

  updateGameOver(dt) {
    const result = this.gameOverScreen.update(dt, this.input);
    if (result === 'retry') {
      this.lives = 3;
      this.score = 0;
      this.startTransition(() => {
        this.loadLevel(this.currentLevelNum);
        this.setState(STATE.PLAYING);
      });
    } else if (result === 'menu') {
      this.lives = 3;
      this.startTransition(() => {
        this.setState(STATE.MENU);
      });
    }
  }

  updateVictory(dt) {
    const result = this.victoryScreen.update(dt, this.input);
    if (result === 'next level') {
      this.startTransition(() => {
        this.loadLevel(this.currentLevelNum + 1);
        this.storyScreen.setup(this.currentLevelNum);
        this.setState(STATE.STORY);
      });
    } else if (result === 'level select') {
      this.startTransition(() => {
        this.setState(STATE.LEVEL_SELECT);
      });
    } else if (result === 'menu' || result === 'play again') {
      this.startTransition(() => {
        this.setState(STATE.MENU);
      });
    }
  }
  updateStory(dt) {
    const result = this.storyScreen.update(dt, this.input);
    if (result === 'play') {
      this.setState(STATE.PLAYING);
    }
  }
  updateTransition(dt) {
    if (this.transitionTarget === 1) {
      this.transitionAlpha += dt * 3; // Fade speed
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        if (this.transitionCallback) {
          this.transitionCallback();
          this.transitionCallback = null;
        }
        this.transitionTarget = 0; // Now fade back in
      }
    } else {
      this.transitionAlpha -= dt * 3;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        // Transition complete, state already set by callback
      }
    }
  }

  // ---- LEVEL MANAGEMENT ----

  loadLevel(levelNum) {
    this.currentLevelNum = levelNum;
    const levelData = this.levelManager.loadLevel(levelNum);
    this.checkpoint = null; // Reset checkpoint on loading new level

    if (!levelData) {
      console.error(`Failed to load level ${levelNum}`);
      this.setState(STATE.MENU);
      return;
    }

    this.currentLevel = levelData;
    this.tiles = levelData.tiles;
    this.levelWidth = levelData.width;
    this.levelHeight = levelData.height;

    // Create player
    const px = levelData.playerStart.x * TILE_SIZE;
    const py = levelData.playerStart.y * TILE_SIZE;
    this.player = new Player(px, py);
    this.powerManager = new PowerManager(this.player);

    // Create enemies
    this.enemies = [];
    if (levelData.enemies) {
      for (const e of levelData.enemies) {
        const EnemyClass = ENEMY_CONSTRUCTORS[e.type];
        if (EnemyClass) {
          const ex = e.x * TILE_SIZE;
          const ey = e.y * TILE_SIZE;
          if (e.type === 'turret') {
            this.enemies.push(new EnemyClass(ex, ey, e.direction || 'down'));
          } else if (e.type === 'drone' || e.type === 'hacker') {
            this.enemies.push(new EnemyClass(ex, ey, e.variant !== undefined ? e.variant : null));
          } else {
            this.enemies.push(new EnemyClass(ex, ey));
          }
        }
      }
    }

    // Handle boss
    if (levelData.boss) {
      const BossClass = ENEMY_CONSTRUCTORS[levelData.boss];
      if (BossClass) {
        // Boss spawns at center-right of arena
        const bx = (levelData.width - 10) * TILE_SIZE;
        const by = (levelData.height - 6) * TILE_SIZE;
        this.enemies.push(new BossClass(bx, by));
      }
    }

    // Create collectibles
    this.collectibles = [];
    if (levelData.collectibles) {
      for (const c of levelData.collectibles) {
        this.collectibles.push(new Collectible(
          c.x * TILE_SIZE + TILE_SIZE / 2 - 12,
          c.y * TILE_SIZE + TILE_SIZE / 2 - 12,
          c.type
        ));
      }
    }

    // Create moving platforms
    this.platforms = [];
    if (levelData.platforms) {
      for (const p of levelData.platforms) {
        this.platforms.push(new Platform(
          p.x * TILE_SIZE, p.y * TILE_SIZE,
          (p.width || 3) * TILE_SIZE, TILE_SIZE / 2,
          p.type, p.config || {}
        ));
      }
    }

    // Create hazards
    this.hazards = [];
    if (levelData.hazards) {
      for (const h of levelData.hazards) {
        this.hazards.push(new Hazard(
          h.x * TILE_SIZE, h.y * TILE_SIZE,
          h.type, h.config || {}
        ));
      }
    }

    // Create interactives
    this.interactives = [];
    if (levelData.interactives) {
      for (const inter of levelData.interactives) {
        let adjustedY = inter.y * TILE_SIZE;
        if (inter.type === 'checkpoint') {
          // Scan downwards to find the first solid tile
          const col = inter.x;
          let row = inter.y;
          while (row < levelData.tiles.length && levelData.tiles[row][col] === 0) {
            row++;
          }
          if (row < levelData.tiles.length) {
            adjustedY = (row - 1) * TILE_SIZE;
          }
        }
        this.interactives.push(new Interactive(
          inter.x * TILE_SIZE, adjustedY,
          inter.type, inter.config || {}
        ));
      }
    }

    // Reset projectiles and particles
    this.projectiles = [];
    this.particles.clear();

    // Set background zone
    const zone = this.levelManager.getZone(levelNum);
    const zoneName = this.levelManager.getZoneName(zone);
    this.background.setZone(zone);

    // Play zone music
    const musicTrack = levelData.boss ? 'boss' : `zone${zone}`;
    this.audio.playMusic(musicTrack);

    // Reset camera to player position
    this.camera.x = px - CANVAS_WIDTH / 2;
    this.camera.y = py - CANVAS_HEIGHT / 2;

    // Reset timer
    this.time = 0;

    this.hud.reset();
    this.hud.score = this.score;
    this.hud.displayScore = this.score;
    this.hud.setLevel(levelData.name, `ZONE ${zone}: ${zoneName}`);

    console.log(`Loaded level ${levelNum}: "${levelData.name}" (Zone ${zone})`);
  }

  completeLevel() {
    const stars = this.calculateStars();
    this.levelManager.completeLevel(this.currentLevelNum, this.score, stars);
    this.victoryScreen.setup(this.score, stars, this.currentLevelNum >= 20);
    this.setState(STATE.VICTORY);
  }

  calculateStars() {
    // 1 star: completed
    // 2 stars: completed + score threshold
    // 3 stars: completed + high score + no deaths
    let stars = 1;
    if (this.score > 500) stars = 2;
    if (this.score > 1000 && this.lives === 3) stars = 3;
    return stars;
  }

  respawnPlayer() {
    if (this.currentLevel) {
      const px = this.checkpoint ? this.checkpoint.x : this.currentLevel.playerStart.x * TILE_SIZE;
      const py = this.checkpoint ? this.checkpoint.y : this.currentLevel.playerStart.y * TILE_SIZE;
      this.player.reset(px, py);
      this.effects.flashScreen('#ff4444', 0.3);
    }
  }

  handleDoorOpen(target) {
    // Toggle specific tiles or hazards based on target ID
    // For now, remove hazards with matching IDs
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      if (this.hazards[i].config && this.hazards[i].config.id === target) {
        this.hazards.splice(i, 1);
      }
    }
  }

  // ---- RENDER ----

  render() {
    const ctx = this.ctx;

    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    switch (this.state) {
      case STATE.MENU:
        this.background.render(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.menuScreen.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
        break;

      case STATE.LEVEL_SELECT:
        this.background.render(ctx, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        this.levelSelect.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
        break;

      case STATE.STORY:
        this.storyScreen.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
        break;

      case STATE.PLAYING:
      case STATE.PAUSED:
        this.renderGameplay(ctx);
        if (this.state === STATE.PAUSED) {
          this.pauseMenu.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
        }
        break;

      case STATE.GAME_OVER:
        this.renderGameplay(ctx);
        this.gameOverScreen.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
        break;

      case STATE.VICTORY:
        this.renderGameplay(ctx);
        this.victoryScreen.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
        break;
    }

    // Transition overlay
    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(10, 10, 15, ${this.transitionAlpha})`;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Post-processing effects
    this.effects.renderOverlays(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  renderGameplay(ctx) {
    // Apply camera shake
    const shakeOffset = this.effects.getShakeOffset();

    // Background (before camera transform)
    this.background.render(ctx, this.camera.x, this.camera.y, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Apply camera transform
    ctx.save();
    ctx.translate(-this.camera.x + shakeOffset.x, -this.camera.y + shakeOffset.y);

    // Render tiles
    this.tileRenderer.render(
      ctx, this.tiles, this.camera.x, this.camera.y,
      CANVAS_WIDTH, CANVAS_HEIGHT,
      this.levelManager.getZone(this.currentLevelNum)
    );

    // Render moving platforms
    for (const plat of this.platforms) {
      plat.render(ctx);
    }

    // Render hazards
    for (const hazard of this.hazards) {
      hazard.render(ctx, this.tiles);
    }

    // Render interactives
    for (const inter of this.interactives) {
      inter.render(ctx);
    }

    // Render collectibles
    for (const col of this.collectibles) {
      if (!col.collected) col.render(ctx);
    }

    // Render exit portal
    if (this.currentLevel) {
      this.renderExit(ctx);
    }

    // Render enemies
    for (const enemy of this.enemies) {
      if (enemy.alive) enemy.render(ctx);
    }

    // Render projectiles
    for (const proj of this.projectiles) {
      if (proj.alive) proj.render(ctx);
    }

    // Render player
    if (this.player && this.player.alive) {
      this.player.render(ctx);
      this.powerManager.render(ctx);
    }

    // Render particles (world space)
    this.particles.render(ctx);

    ctx.restore();

    // HUD (screen space, not affected by camera)
    if (this.player) {
      this.hud.render(ctx, this.player, this.powerManager, {
        level: this.currentLevelNum,
        name: this.currentLevel ? this.currentLevel.name : '',
        zone: this.levelManager.getZone(this.currentLevelNum),
        time: this.time,
        score: this.score,
        lives: this.lives
      });
    }
  }

  renderExit(ctx) {
    if (!this.currentLevel || !this.currentLevel.exit) return;

    const isBossLevel = !!this.currentLevel.boss;
    const bossAlive = isBossLevel && this.enemies.some(e => e.type.startsWith('boss') && e.alive);

    // If it's a boss level and the boss is still alive, do not render the portal
    if (isBossLevel && bossAlive) return;

    let exitTileX = this.currentLevel.exit.x;
    let exitTileY = this.currentLevel.exit.y;

    if (isBossLevel) {
      exitTileX = Math.floor(this.levelWidth / 2) - 1;
      exitTileY = 10;
    }

    const ex = exitTileX * TILE_SIZE;
    const ey = exitTileY * TILE_SIZE;
    const time = performance.now() / 1000;

    const cx = ex + TILE_SIZE / 2;
    const cy = ey + TILE_SIZE; // Centered vertically in the 2-tile high space
    const rx = 24; // Horizontal radius of the portal oval
    const ry = 42; // Vertical radius of the portal oval

    ctx.save();

    // 1. Swirling/pulsing inner vortex
    const pulse = Math.sin(time * 4) * 0.05 + 0.95;
    const vortexGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ry * pulse);
    vortexGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
    vortexGrad.addColorStop(0.5, 'rgba(0, 50, 40, 0.8)');
    vortexGrad.addColorStop(0.8, 'rgba(0, 240, 255, 0.4)');
    vortexGrad.addColorStop(1, 'rgba(0, 255, 136, 0.15)');

    ctx.fillStyle = vortexGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * pulse, ry * pulse, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Concentric spinning digital rings inside the portal
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff88';
    
    for (let i = 0; i < 3; i++) {
      const ringScale = 0.35 + i * 0.25;
      const ringPulse = Math.sin(time * 5 + i * 1.5) * 0.05 + 1;
      const angle = time * (1.5 - i * 0.5) * (i % 2 === 0 ? 1 : -1);
      
      ctx.strokeStyle = i === 1 ? 'rgba(0, 240, 255, 0.7)' : 'rgba(0, 255, 136, 0.5)';
      ctx.beginPath();
      ctx.setLineDash([8, 12]);
      ctx.ellipse(cx, cy, rx * ringScale * ringPulse, ry * ringScale * ringPulse, angle, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset dash

    // 3. Glowing neon outer border
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ff88';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // White core line for extreme brightness
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 1, ry - 1, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Portal particles sucking into the center
    ctx.shadowBlur = 0;
    const particleCount = 8;
    for (let i = 0; i < particleCount; i++) {
      const seed = time + i * (Math.PI * 2 / particleCount);
      const speed = 0.4;
      const progress = (seed * speed) % 1;
      const angle = (i * (360 / particleCount) * Math.PI) / 180 + time * 0.5;
      
      const px = cx + Math.cos(angle) * rx * (1 - progress);
      const py = cy + Math.sin(angle) * ry * (1 - progress);
      const size = (1 - progress) * 3;
      
      ctx.fillStyle = i % 2 === 0 ? '#00f0ff' : '#00ff88';
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Arrow indicator bobbing above the portal
    const arrowY = cy - ry - 15 + Math.sin(time * 5) * 4;
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(cx, arrowY);
    ctx.lineTo(cx - 6, arrowY - 10);
    ctx.lineTo(cx + 6, arrowY - 10);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

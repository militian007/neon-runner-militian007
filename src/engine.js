/**
 * ============================================================================
 *  NEON RUNNER — Core Engine Module
 * ============================================================================
 *  A cyberpunk 2D platformer engine providing:
 *    - Input handling (keyboard + mouse)
 *    - Camera system with smooth follow and screen shake
 *    - Tile-based physics with AABB collision resolution
 *    - Neon-styled rendering utilities
 *
 *  All classes and functions are exported as named ES module exports.
 * ============================================================================
 */

// ---------------------------------------------------------------------------
//  Global Constants
// ---------------------------------------------------------------------------

/** Width/height of a single tile in pixels. */
const TILE_SIZE = 40;

/** Logical canvas width. */
const CANVAS_WIDTH = 1280;

/** Logical canvas height. */
const CANVAS_HEIGHT = 720;

/** Gravity acceleration applied per physics step (pixels/frame²). */
const GRAVITY = 0.7;

/** Terminal velocity — maximum downward speed (pixels/frame). */
const MAX_FALL_SPEED = 15;

// ---------------------------------------------------------------------------
//  Input
// ---------------------------------------------------------------------------

/**
 * Captures keyboard and mouse input each frame.
 *
 * Usage:
 *   const input = new Input(canvas);
 *   // in game loop …
 *   if (input.isPressed('space')) player.jump();
 *   if (input.isDown('a'))        player.moveLeft();
 *   // at end of frame
 *   input.update();
 */
class Input {
  /**
   * @param {HTMLCanvasElement} canvas — used for mouse coordinate conversion.
   */
  constructor(canvas) {
    this.canvas = canvas;

    // --- internal state ---------------------------------------------------
    /** Set of keys currently held down. */
    this._held = new Set();

    /** Set of keys pressed THIS frame (cleared every frame by update()). */
    this._justPressed = new Set();

    /** Set of keys that were already processed as "just pressed". */
    this._previouslyHeld = new Set();

    /** Whether the left mouse button is currently down. */
    this._mouseDown = false;

    /** Latest mouse position relative to the canvas. */
    this._mousePos = { x: 0, y: 0 };

    // --- key map ----------------------------------------------------------
    // Maps KeyboardEvent.code / key values to our canonical names.
    this._keyMap = {
      KeyW: 'w', KeyA: 'a', KeyS: 's', KeyD: 'd',
      KeyQ: 'q', KeyE: 'e', KeyR: 'r', KeyF: 'f',
      KeyJ: 'j', KeyM: 'm',
      Space: 'space', Escape: 'escape', Enter: 'enter',
      ArrowUp: 'w', ArrowLeft: 'a', ArrowDown: 's', ArrowRight: 'd',
    };

    // --- bind handlers (so we can remove them later) ----------------------
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  // --- public API ---------------------------------------------------------

  /**
   * Returns `true` while the key is held down.
   * @param {string} key — canonical name ('w','a','space','escape', etc.)
   */
  isDown(key) {
    return this._held.has(key);
  }

  /**
   * Returns `true` only on the FIRST frame the key is pressed.
   * Automatically reset by `update()` at the end of each frame.
   * @param {string} key
   */
  isPressed(key) {
    return this._justPressed.has(key);
  }

  /** Returns `true` while the left mouse button is held. */
  isMouseDown() {
    return this._mouseDown;
  }

  /**
   * Mouse position relative to the canvas element.
   * @returns {{x: number, y: number}}
   */
  getMousePos() {
    return { x: this._mousePos.x, y: this._mousePos.y };
  }

  /**
   * Call at the END of every game-loop frame to reset single-frame flags.
   */
  update() {
    this._justPressed.clear();
    // Snapshot the currently held keys so we can detect fresh presses
    this._previouslyHeld = new Set(this._held);
  }

  /** Remove all event listeners — call when the game is torn down. */
  destroy() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
  }

  // --- internal handlers --------------------------------------------------

  /** @private */
  _handleKeyDown(e) {
    const key = this._keyMap[e.code];
    if (key === undefined) return;

    // Prevent browser defaults for game keys (scrolling with Space / arrows)
    e.preventDefault();

    if (!this._previouslyHeld.has(key) && !this._held.has(key)) {
      this._justPressed.add(key);
    }
    this._held.add(key);
  }

  /** @private */
  _handleKeyUp(e) {
    const key = this._keyMap[e.code];
    if (key === undefined) return;
    this._held.delete(key);
    this._previouslyHeld.delete(key);
  }

  /** @private */
  _handleMouseDown(e) {
    if (e.button === 0) this._mouseDown = true;
  }

  /** @private */
  _handleMouseUp(e) {
    if (e.button === 0) this._mouseDown = false;
  }

  /** @private */
  _handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    // Scale to logical canvas size in case the element is CSS-scaled
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    this._mousePos.x = (e.clientX - rect.left) * scaleX;
    this._mousePos.y = (e.clientY - rect.top) * scaleY;
  }
}

// ---------------------------------------------------------------------------
//  Camera
// ---------------------------------------------------------------------------

/**
 * 2D camera that smoothly follows a target and supports screen shake.
 *
 * Usage:
 *   const cam = new Camera(1280, 720);
 *   // each frame …
 *   cam.follow(player, levelPixelW, levelPixelH, dt);
 *   cam.update(dt);
 *   cam.apply(ctx);
 *   // … draw world …
 *   cam.restore(ctx);
 */
class Camera {
  /**
   * @param {number} viewWidth  — viewport width  (default 1280)
   * @param {number} viewHeight — viewport height (default 720)
   */
  constructor(viewWidth = CANVAS_WIDTH, viewHeight = CANVAS_HEIGHT) {
    /** Viewport dimensions. */
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;

    /** Top-left corner of the camera in world space. */
    this.x = 0;
    this.y = 0;

    /** Current shake offset (applied during `apply`). */
    this.shakeX = 0;
    this.shakeY = 0;

    // --- shake internals --------------------------------------------------
    this._shakeIntensity = 0;
    this._shakeDuration = 0;
    this._shakeTimer = 0;

    // --- lerp factor ------------------------------------------------------
    /** How quickly the camera catches up (0 = frozen, 1 = instant). */
    this.lerpFactor = 0.08;
  }

  // --- public API ---------------------------------------------------------

  /**
   * Smoothly move the camera so that `target` is centred on screen,
   * clamped to the level boundaries.
   *
   * @param {{x:number, y:number, width:number, height:number}} target
   * @param {number} levelWidth  — full level width in pixels
   * @param {number} levelHeight — full level height in pixels
   * @param {number} dt — delta-time multiplier (1 at 60 fps)
   */
  follow(target, levelWidth, levelHeight, dt = 1) {
    // Desired camera position: target center minus half-viewport.
    const targetCenterX = target.x + target.width * 0.5;
    const targetCenterY = target.y + target.height * 0.5;

    let desiredX = targetCenterX - this.viewWidth * 0.5;
    let desiredY = targetCenterY - this.viewHeight * 0.5;

    // Smooth interpolation (frame-rate-independent lerp).
    // We scale the factor by dt so 60-fps and 120-fps feel identical.
    const t = 1 - Math.pow(1 - this.lerpFactor, dt);
    this.x += (desiredX - this.x) * t;
    this.y += (desiredY - this.y) * t;

    // Clamp to level bounds so we never show out-of-bounds areas.
    const maxX = Math.max(0, levelWidth - this.viewWidth);
    const maxY = Math.max(0, levelHeight - this.viewHeight);
    this.x = Math.max(0, Math.min(this.x, maxX));
    this.y = Math.max(0, Math.min(this.y, maxY));
  }

  /**
   * Push the canvas context so all subsequent draws are in world space.
   * @param {CanvasRenderingContext2D} ctx
   */
  apply(ctx) {
    ctx.save();
    ctx.translate(
      Math.round(-this.x + this.shakeX),
      Math.round(-this.y + this.shakeY),
    );
  }

  /**
   * Pop the canvas context back to screen space.
   * @param {CanvasRenderingContext2D} ctx
   */
  restore(ctx) {
    ctx.restore();
  }

  /**
   * Trigger a screen-shake effect.
   * @param {number} intensity — maximum pixel offset
   * @param {number} duration  — length in frames (e.g. 15 ≈ 0.25 s)
   */
  shake(intensity = 6, duration = 15) {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeTimer = duration;
  }

  /**
   * Advance shake state. Call once per frame.
   * @param {number} dt — delta-time multiplier
   */
  update(dt = 1) {
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      // Intensity decays linearly over the duration.
      const progress = Math.max(0, this._shakeTimer / this._shakeDuration);
      const mag = this._shakeIntensity * progress;
      this.shakeX = (Math.random() * 2 - 1) * mag;
      this.shakeY = (Math.random() * 2 - 1) * mag;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  /**
   * Convert a position on screen (e.g. mouse) to world coordinates.
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{x: number, y: number}}
   */
  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x - this.shakeX,
      y: screenY + this.y - this.shakeY,
    };
  }

  /**
   * Convert a world position to screen coordinates.
   * @param {number} worldX
   * @param {number} worldY
   * @returns {{x: number, y: number}}
   */
  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x + this.shakeX,
      y: worldY - this.y + this.shakeY,
    };
  }
}

// ---------------------------------------------------------------------------
//  Physics — standalone utility functions
// ---------------------------------------------------------------------------

/**
 * Axis-Aligned Bounding Box overlap test.
 *
 * @param {{x:number,y:number,width:number,height:number}} a
 * @param {{x:number,y:number,width:number,height:number}} b
 * @returns {boolean} `true` if the two rectangles overlap (exclusive edges).
 */
function checkAABB(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Resolve vertical (Y-axis) collisions between an entity and the tile map.
 *
 * Tile types:
 *   0 — empty / air
 *   1 — solid block
 *   2 — one-way platform (only blocks from above while falling)
 *   3 — hazard (treated as solid for collision; game logic handles damage)
 *
 * The function mutates `entity.y`, `entity.vy`, and `entity.grounded`.
 *
 * @param {{x:number,y:number,width:number,height:number,vy:number,grounded?:boolean}} entity
 * @param {number[][]} tiles — 2-D grid [row][col]
 * @param {number} tileSize
 */
function resolveVerticalTileCollisions(entity, tiles, tileSize = TILE_SIZE) {
  // Reset grounded; it will be set to true if we land on something.
  entity.grounded = false;

  if (!tiles || tiles.length === 0) return;

  const rows = tiles.length;
  const cols = tiles[0].length;

  // Compute the range of tile columns the entity spans.
  // We add a tiny epsilon inward so standing flush at a column boundary
  // doesn't pull in an extra column.
  const epsilon = 0.001;
  const colStart = Math.max(0, Math.floor((entity.x + epsilon) / tileSize));
  const colEnd = Math.min(cols - 1, Math.floor((entity.x + entity.width - epsilon) / tileSize));

  if (entity.vy >= 0) {
    // --- Falling / standing: check tiles BELOW ---------------------------
    const bottomRow = Math.floor((entity.y + entity.height) / tileSize);
    if (bottomRow < 0 || bottomRow >= rows) return;

    for (let col = colStart; col <= colEnd; col++) {
      const tile = tiles[bottomRow][col];
      if (tile === 0) continue; // air

      const tileTop = bottomRow * tileSize;

      if (tile === 2) {
        // One-way platform: only collide when the entity's previous bottom
        // was at or above the platform top (i.e. we are landing on it, not
        // jumping through from below).
        if (entity.dropThrough) continue;
        const prevBottom = entity.y + entity.height - entity.vy;
        if (prevBottom > tileTop + epsilon) continue; // was already below → ignore
      }

      // Solid (1), hazard (3), or valid one-way (2) — snap to top.
      if (entity.y + entity.height > tileTop) {
        entity.y = tileTop - entity.height;
        entity.vy = 0;
        entity.grounded = true;
        return; // resolved
      }
    }
  } else {
    // --- Rising: check tiles ABOVE ---------------------------------------
    const topRow = Math.floor(entity.y / tileSize);
    if (topRow < 0 || topRow >= rows) return;

    for (let col = colStart; col <= colEnd; col++) {
      const tile = tiles[topRow][col];
      // One-way platforms (2) never block upward movement.
      if (tile !== 1 && tile !== 3) continue;

      const tileBottom = (topRow + 1) * tileSize;

      if (entity.y < tileBottom) {
        entity.y = tileBottom;
        entity.vy = 0;
        return; // resolved
      }
    }
  }
}

/**
 * Resolve horizontal (X-axis) collisions between an entity and the tile map.
 *
 * Only solid (1) and hazard (3) tiles block horizontal movement.
 * One-way platforms (2) do NOT block horizontally.
 *
 * The function mutates `entity.x` and `entity.vx`.
 *
 * @param {{x:number,y:number,width:number,height:number,vx:number}} entity
 * @param {number[][]} tiles — 2-D grid [row][col]
 * @param {number} tileSize
 */
function resolveHorizontalTileCollisions(entity, tiles, tileSize = TILE_SIZE) {
  if (!tiles || tiles.length === 0) return;

  const rows = tiles.length;
  const cols = tiles[0].length;

  // Compute the range of tile rows the entity spans.
  const epsilon = 0.001;
  const rowStart = Math.max(0, Math.floor((entity.y + epsilon) / tileSize));
  const rowEnd = Math.min(rows - 1, Math.floor((entity.y + entity.height - epsilon) / tileSize));

  if (entity.vx > 0) {
    // --- Moving right: check tiles to the RIGHT --------------------------
    const rightCol = Math.floor((entity.x + entity.width) / tileSize);
    if (rightCol < 0 || rightCol >= cols) return;

    for (let row = rowStart; row <= rowEnd; row++) {
      const tile = tiles[row][rightCol];
      if (tile !== 1 && tile !== 3) continue;

      const tileLeft = rightCol * tileSize;
      if (entity.x + entity.width > tileLeft) {
        entity.x = tileLeft - entity.width;
        entity.vx = 0;
        return;
      }
    }
  } else if (entity.vx < 0) {
    // --- Moving left: check tiles to the LEFT ----------------------------
    const leftCol = Math.floor(entity.x / tileSize);
    if (leftCol < 0 || leftCol >= cols) return;

    for (let row = rowStart; row <= rowEnd; row++) {
      const tile = tiles[row][leftCol];
      if (tile !== 1 && tile !== 3) continue;

      const tileRight = (leftCol + 1) * tileSize;
      if (entity.x < tileRight) {
        entity.x = tileRight;
        entity.vx = 0;
        return;
      }
    }
  }
}

/**
 * Apply gravity to an entity's vertical velocity, clamped to terminal speed.
 *
 * @param {{vy:number}} entity
 * @param {number} dt — delta-time multiplier (1 at 60 fps)
 */
function applyGravity(entity, dt = 1) {
  entity.vy += GRAVITY * dt;
  if (entity.vy > MAX_FALL_SPEED) {
    entity.vy = MAX_FALL_SPEED;
  }
}

// ---------------------------------------------------------------------------
//  NeonRenderer — static drawing helpers
// ---------------------------------------------------------------------------

/**
 * Utility class with static methods for drawing neon-styled shapes.
 * Every method sets up its own shadow/glow state and restores context
 * afterward, so callers don't need to worry about state leaking.
 */
class NeonRenderer {
  /**
   * Draw a filled rectangle with a neon glow halo.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {string} color    — CSS colour string
   * @param {number} glowSize — shadow-blur radius
   */
  static drawGlowRect(ctx, x, y, w, h, color, glowSize = 10) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    // Double-draw for brighter core
    ctx.shadowBlur = glowSize * 0.5;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  /**
   * Draw a filled circle with a neon glow halo.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x — centre X
   * @param {number} y — centre Y
   * @param {number} radius
   * @param {string} color
   * @param {number} glowSize
   */
  static drawGlowCircle(ctx, x, y, radius, color, glowSize = 15) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    // Brighter inner core
    ctx.shadowBlur = glowSize * 0.4;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * Draw a line segment with a neon glow.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x1
   * @param {number} y1
   * @param {number} x2
   * @param {number} y2
   * @param {string} color
   * @param {number} lineWidth
   * @param {number} glowSize
   */
  static drawGlowLine(ctx, x1, y1, x2, y2, color, lineWidth = 2, glowSize = 10) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    // Bright core pass
    ctx.shadowBlur = glowSize * 0.4;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = lineWidth * 0.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  /**
   * Draw text with a neon glow halo.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {string} font   — CSS font string, e.g. '24px monospace'
   * @param {string} color
   * @param {number} glowSize
   * @param {string} align  — 'left' | 'center' | 'right'
   */
  static drawGlowText(ctx, text, x, y, font, color, glowSize = 10, align = 'center') {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    // Outer glow
    ctx.shadowColor = color;
    ctx.shadowBlur = glowSize;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    // Inner bright core
    ctx.shadowBlur = glowSize * 0.3;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  /**
   * Draw a rectangle filled with a linear gradient.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {string} color1     — gradient start colour
   * @param {string} color2     — gradient end colour
   * @param {'vertical'|'horizontal'|'diagonal'} direction
   */
  static drawGradientRect(ctx, x, y, w, h, color1, color2, direction = 'vertical') {
    ctx.save();
    let gx0 = x, gy0 = y, gx1 = x, gy1 = y;
    switch (direction) {
      case 'horizontal':
        gx1 = x + w;
        break;
      case 'diagonal':
        gx1 = x + w;
        gy1 = y + h;
        break;
      case 'vertical':
      default:
        gy1 = y + h;
        break;
    }
    const grad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
    grad.addColorStop(0, color1);
    grad.addColorStop(1, color2);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  /**
   * Draw a health / energy bar with neon glow and a translucent background.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x
   * @param {number} y
   * @param {number} w      — total bar width
   * @param {number} h      — bar height
   * @param {number} current — current value
   * @param {number} max     — maximum value
   * @param {string} color   — fill colour
   * @param {string} bgColor — background colour
   */
  static drawHealthBar(ctx, x, y, w, h, current, max, color, bgColor = 'rgba(255,255,255,0.1)') {
    const pct = Math.max(0, Math.min(1, current / max));

    ctx.save();

    // Background track
    ctx.fillStyle = bgColor;
    ctx.fillRect(x, y, w, h);

    // Filled portion with glow
    if (pct > 0) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w * pct, h);
      // Brighter core stripe along the top half
      ctx.shadowBlur = 4;
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x, y, w * pct, h * 0.4);
    }

    // Thin border
    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
//  Exports
// ---------------------------------------------------------------------------

export {
  // Constants
  TILE_SIZE,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRAVITY,
  MAX_FALL_SPEED,
  // Classes
  Input,
  Camera,
  NeonRenderer,
  // Physics functions
  checkAABB,
  resolveVerticalTileCollisions,
  resolveHorizontalTileCollisions,
  applyGravity,
};

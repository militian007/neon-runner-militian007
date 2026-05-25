// ============================================
// NEON RUNNER — Main Entry Point
// Bootstraps the game and manages canvas scaling
// ============================================

import Game from './engine/Game.js';

const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

// Wait for DOM
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const loadingScreen = document.getElementById('loading-screen');
  const loaderFill = document.getElementById('loader-fill');
  const loaderText = document.getElementById('loader-text');

  if (!canvas) {
    console.error('Canvas element not found!');
    return;
  }

  // Set canvas size
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvas.tabIndex = 1; // Make focusable

  // Loading simulation
  let loadProgress = 0;
  const loadingSteps = [
    'Initializing engine...',
    'Loading level data...',
    'Generating audio systems...',
    'Compiling shaders...',
    'Connecting to Neo-City network...',
    'Calibrating neon systems...',
    'System ready.'
  ];

  function updateLoading() {
    loadProgress += 2 + Math.random() * 5;
    if (loadProgress > 100) loadProgress = 100;

    const stepIndex = Math.min(
      Math.floor((loadProgress / 100) * loadingSteps.length),
      loadingSteps.length - 1
    );

    loaderFill.style.width = `${loadProgress}%`;
    loaderText.textContent = loadingSteps[stepIndex];

    if (loadProgress < 100) {
      setTimeout(updateLoading, 100 + Math.random() * 200);
    } else {
      // Loading complete — start the game
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        initGame();
      }, 500);
    }
  }

  function initGame() {
    // Focus canvas for keyboard input
    canvas.focus();

    // Handle canvas scaling to fit window while maintaining aspect ratio
    function resizeCanvas() {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const scaleX = windowWidth / CANVAS_WIDTH;
      const scaleY = windowHeight / CANVAS_HEIGHT;
      const scale = Math.min(scaleX, scaleY);

      canvas.style.width = `${CANVAS_WIDTH * scale}px`;
      canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Prevent default for game keys
    window.addEventListener('keydown', (e) => {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });

    // Create and start game
    try {
      const game = new Game(canvas);

      // Start game on first user interaction (required for audio)
      let started = false;
      const startGame = () => {
        if (started) return;
        started = true;
        game.start();
        console.log('%c🎮 NEON RUNNER — System Online', 'color: #00f0ff; font-size: 16px; font-weight: bold;');
      };

      // Auto-start (audio may not work until user interaction)
      startGame();

      // Also ensure audio context resumes on click
      canvas.addEventListener('click', () => {
        if (!started) startGame();
      });

      // Expose game instance for debugging
      window.__NEON_RUNNER__ = game;

    } catch (error) {
      console.error('Failed to initialize game:', error);
      // Show error on canvas
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0a0a0f';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ff00aa';
      ctx.font = '24px Orbitron, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('SYSTEM ERROR', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Rajdhani, sans-serif';
      ctx.fillText(error.message, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
  }

  // Start loading
  updateLoading();
});

// ============================================
// NEON RUNNER — LevelData.js
// Level layouts, enemy placements, collectibles, hazards, and interactives for all 20 levels
// Uses a robust seed-based procedural builder to generate unique, fully playable zones
// with custom hand-crafted boss arenas.
// ============================================

// Level list templates
const levelNames = [
  // Zone 1: Neon Streets (Levels 1-5)
  "Lower Slums Entrance",
  "Neon Alleyways",
  "Rainy Rooftops",
  "Power Grid Sector",
  "Sector 1 Core: Warden X-1",
  
  // Zone 2: Cyber Grid (Levels 6-10)
  "Datastream Ingress",
  "System Buffer",
  "Corporate High-Rise",
  "Optical Comm Hub",
  "Sector 2 Core: Nexus Mainframe",
  
  // Zone 3: Glitch Sector (Levels 11-15)
  "Glitch Valley",
  "Virus Quarantine",
  "Infected Pipelines",
  "Matrix Overflow",
  "Sector 3 Core: Malware Zero",
  
  // Zone 4: Singularity Core (Levels 16-20)
  "Ascension Lift",
  "Sky Gateways",
  "Atmosphere Condenser",
  "Quantum Singularity Node",
  "Sector 4 Core: Omega Core"
];

// Helper to generate a deterministic pseudo-random number based on a seed
function createRandom(seed) {
  let value = seed;
  return function() {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
}

// Scans columns near startX to find a column with a solid floor and empty space above
function findSafeGroundX(tiles, startX, width, height) {
  // Escaneamos hacia afuera desde startX por todo el ancho del nivel para encontrar la posición segura más cercana
  const maxSearchRange = Math.max(startX, width - startX);
  
  // Fase 1: Buscar una posición ideal (suelo sólido, y un área de 3 columnas de ancho libre de obstáculos en la zona de cuerpo del enemigo)
  for (let offset = 0; offset < maxSearchRange; offset++) {
    const colsToCheck = [];
    const checkRight = Math.round(startX + offset);
    const checkLeft = Math.round(startX - offset);
    
    if (checkRight < width - 10 && checkRight > 10) colsToCheck.push(checkRight);
    if (checkLeft < width - 10 && checkLeft > 10 && checkLeft !== checkRight) colsToCheck.push(checkLeft);
    
    for (const c of colsToCheck) {
      // El suelo de la columna debe ser un bloque sólido normal (1), no pinchos (3) ni vacío (0)
      if (tiles[height - 2][c] === 1) {
        // Para evitar que el enemigo se encaje contra paredes o nazca en huecos de 1 celda de ancho,
        // validamos que en la columna central y en las adyacentes (c-1 y c+1) el aire esté libre (0)
        let isSafe = true;
        for (let col = c - 1; col <= c + 1; col++) {
          if (tiles[height - 3][col] !== 0 || tiles[height - 4][col] !== 0 || tiles[height - 5][col] !== 0) {
            isSafe = false;
            break;
          }
        }
        if (isSafe) {
          return c;
        }
      }
    }
  }

  // Fase 2: Relajar la validación de las columnas laterales (solo requerir espacio libre en la columna de spawn del enemigo)
  for (let offset = 0; offset < maxSearchRange; offset++) {
    const colsToCheck = [];
    const checkRight = Math.round(startX + offset);
    const checkLeft = Math.round(startX - offset);
    
    if (checkRight < width - 10 && checkRight > 10) colsToCheck.push(checkRight);
    if (checkLeft < width - 10 && checkLeft > 10 && checkLeft !== checkRight) colsToCheck.push(checkLeft);
    
    for (const c of colsToCheck) {
      if (tiles[height - 2][c] === 1 && 
          tiles[height - 3][c] === 0 && 
          tiles[height - 4][c] === 0 && 
          tiles[height - 5][c] === 0) {
        return c;
      }
    }
  }

  // Fase 3: Caer en cualquier columna con suelo sólido y al menos dos celdas libres sobre él
  for (let offset = 0; offset < maxSearchRange; offset++) {
    const colsToCheck = [];
    const checkRight = Math.round(startX + offset);
    const checkLeft = Math.round(startX - offset);
    
    if (checkRight < width - 10 && checkRight > 10) colsToCheck.push(checkRight);
    if (checkLeft < width - 10 && checkLeft > 10 && checkLeft !== checkRight) colsToCheck.push(checkLeft);
    
    for (const c of colsToCheck) {
      if (tiles[height - 2][c] === 1 && tiles[height - 3][c] === 0) {
        return c;
      }
    }
  }

  // Fallback absoluto y seguro
  return 12;
}

// Scans columns near startX to find a column with clear air space
function findSafeAirX(tiles, startX, width, height) {
  const maxSearchRange = Math.max(startX, width - startX);

  // Fase 1: Buscar posición de vuelo ideal (c-1, c, c+1 libres en las alturas correspondientes)
  for (let offset = 0; offset < maxSearchRange; offset++) {
    const colsToCheck = [];
    const checkRight = Math.round(startX + offset);
    const checkLeft = Math.round(startX - offset);

    if (checkRight < width - 10 && checkRight > 10) colsToCheck.push(checkRight);
    if (checkLeft < width - 10 && checkLeft > 10 && checkLeft !== checkRight) colsToCheck.push(checkLeft);

    for (const c of colsToCheck) {
      let isSafe = true;
      for (let col = c - 1; col <= c + 1; col++) {
        if (tiles[height - 7][col] !== 0 || tiles[height - 6][col] !== 0 || tiles[height - 5][col] !== 0) {
          isSafe = false;
          break;
        }
      }
      if (isSafe) {
        return c;
      }
    }
  }

  // Fase 2: Relajar a espacio libre solo en la columna central
  for (let offset = 0; offset < maxSearchRange; offset++) {
    const colsToCheck = [];
    const checkRight = Math.round(startX + offset);
    const checkLeft = Math.round(startX - offset);

    if (checkRight < width - 10 && checkRight > 10) colsToCheck.push(checkRight);
    if (checkLeft < width - 10 && checkLeft > 10 && checkLeft !== checkRight) colsToCheck.push(checkLeft);

    for (const c of colsToCheck) {
      if (tiles[height - 7][c] === 0 && tiles[height - 6][c] === 0) {
        return c;
      }
    }
  }

  // Fallback absoluto
  return 12;
}

// Generate level maps
function generateLevels() {
  const generated = [];

  for (let l = 1; l <= 20; l++) {
    const isBossLevel = l % 5 === 0;
    const zoneNum = Math.min(4, Math.floor((l - 1) / 5) + 1);
    const name = levelNames[l - 1];
    
    if (isBossLevel) {
      generated.push(buildBossLevel(l, name, zoneNum));
    } else {
      generated.push(buildStandardLevel(l, name, zoneNum));
    }
  }

  return generated;
}

// Builds a wide boss combat arena
function buildBossLevel(levelNum, name, zone) {
  const width = 45;
  const height = 15;
  
  // Build blank grid
  const tiles = [];
  for (let r = 0; r < height; r++) {
    const row = new Array(width).fill(0);
    tiles.push(row);
  }

  // Create solid floor (bottom 3 rows) and solid ceiling/walls
  for (let c = 0; c < width; c++) {
    tiles[height - 1][c] = 1;
    tiles[height - 2][c] = 1;
    tiles[height - 3][c] = 1; // Floor height is y=12
    tiles[0][c] = 1;          // Ceiling
  }
  for (let r = 0; r < height; r++) {
    tiles[r][0] = 1;          // Left wall
    tiles[r][width - 1] = 1;  // Right wall
  }

  // Add some floating step platforms in the arena
  tiles[9][10] = 2;
  tiles[9][11] = 2;
  tiles[9][12] = 2;

  tiles[7][18] = 2;
  tiles[7][19] = 2;
  tiles[7][20] = 2;

  tiles[9][26] = 2;
  tiles[9][27] = 2;
  tiles[9][28] = 2;

  // Add hazards or blocks based on zone
  if (zone === 2) {
    // Add central safety block
    tiles[11][20] = 1;
    tiles[11][21] = 1;
    tiles[10][20] = 1;
    tiles[10][21] = 1;
  } else if (zone === 3) {
    // Spike columns
    tiles[11][7] = 3;
    tiles[11][31] = 3;
  }

  // Boss name mapping
  const bossNames = {
    5: 'boss_warden',
    10: 'boss_nexus',
    15: 'boss_malware',
    20: 'boss_omega'
  };

  const level = {
    name: name,
    width: width,
    height: height,
    playerStart: { x: 4, y: 10 },
    exit: { x: width - 3, y: 10 },
    tiles: tiles,
    enemies: [
      { type: 'health_box', x: 8, y: height - 4 },
      { type: 'health_box', x: 20, y: height - 4 },
      { type: 'health_box', x: 32, y: height - 4 }
    ],
    boss: bossNames[levelNum],
    collectibles: [
      { type: 'chip', x: 19, y: 5 }
    ],
    platforms: [],
    hazards: [],
    interactives: []
  };

  // Add special platforms
  if (zone >= 2) {
    // Add moving platforms to make boss battle dynamic
    level.platforms.push({
      type: 'moving',
      x: 14, y: 8,
      width: 3,
      config: { dx: 1, dy: 0, range: 4, speed: 1.5 }
    });
  }

  return level;
}

// Builds progressive standard level maps
function buildStandardLevel(levelNum, name, zone) {
  const width = 100 + levelNum * 12; // Length grows per level
  const height = 16;
  const rand = createRandom(1337 + levelNum * 42); // Deterministic seed per level
  
  const tiles = [];
  for (let r = 0; r < height; r++) {
    tiles.push(new Array(width).fill(0));
  }

  // Initialize bounds
  for (let c = 0; c < width; c++) {
    tiles[height - 1][c] = 1; // Solid floor layer
    tiles[height - 2][c] = 1; 
    tiles[0][c] = 1;          // Ceiling
  }
  for (let r = 0; r < height; r++) {
    tiles[r][0] = 1;          // Start boundary
    tiles[r][width - 1] = 1;  // End boundary
  }

  const level = {
    name: name,
    width: width,
    height: height,
    playerStart: { x: 3, y: 11 },
    exit: { x: width - 4, y: 12 },
    tiles: tiles,
    enemies: [],
    collectibles: [],
    platforms: [],
    hazards: [],
    interactives: []
  };

  // Generate level features along the X axis
  let x = 6;
  let checkpointCount = 0;

  while (x < width - 10) {
    const r = rand();
    
    if (r < 0.2) {
      // 1. Create a jumping Pit (Gap in the floor)
      const gapWidth = Math.floor(rand() * 3) + 2; // 2 to 4 tiles
      for (let pit = x; pit < x + gapWidth; pit++) {
        if (pit < width - 10) {
          tiles[height - 1][pit] = 0;
          tiles[height - 2][pit] = 0;
        }
      }
      
      // Place a floating or moving platform over the pit
      if (rand() > 0.5) {
        tiles[height - 5][x + Math.floor(gapWidth / 2)] = 2; // static step
      } else {
        level.platforms.push({
          type: 'moving',
          x: x, y: height - 5,
          width: 2,
          config: { dx: 1, dy: 0, range: 2, speed: 1.2 }
        });
      }
      
      // Spikes at the bottom of pit
      for (let pit = x; pit < x + gapWidth; pit++) {
        if (pit < width - 10) {
          tiles[height - 1][pit] = 3; // instant damage spikes
        }
      }
      x += gapWidth + 2;
      
    } else if (r < 0.45) {
      // 2. High walls with floating platforms (Verticality)
      const wallHeight = Math.floor(rand() * 4) + 3; // 3 to 6 high
      for (let h = height - 2; h > height - 2 - wallHeight; h--) {
        tiles[h][x] = 1;
      }
      
      // Add steps to climb it
      tiles[height - 4][x - 2] = 2;
      tiles[height - 6][x - 1] = 2;
      tiles[height - 5][x + 1] = 2;
      tiles[height - 3][x + 2] = 2;

      // Spawn drone patrol on top
      level.enemies.push({
        type: 'drone',
        x: x + 1,
        y: height - wallHeight - 3
      });

      // Collectible chip at high point
      level.collectibles.push({
        type: 'chip',
        x: x,
        y: height - 2 - wallHeight
      });

      x += 6;
      
    } else if (r < 0.65) {
      // 3. Hazard hallway (Lasers or electric beams)
      const roomLength = 8;
      
      // Roof blocks to force sliding or careful running
      for (let rx = x; rx < x + roomLength; rx++) {
        if (rx < width - 10) {
          tiles[height - 6][rx] = 1;
        }
      }

      // Add a laser hazard (vertical laser sweeping down)
      level.hazards.push({
        type: 'laser_vertical',
        x: x + 3, y: height - 5,
        config: { width: 40, height: 120, interval: 2.5, activeDuration: 1.2, id: `laser_${x}` }
      });

      // Turret on ceiling if Zone 2+
      if (zone >= 2) {
        level.enemies.push({
          type: 'turret',
          x: x + 5,
          y: height - 5,
          direction: 'down'
        });
      }

      x += roomLength + 3;
      
    } else if (r < 0.8) {
      // 4. Hackable Security Terminal and Gate
      const gateX = x + 6;
      
      // Interactive Hack terminal
      level.interactives.push({
        type: 'terminal',
        x: x, y: height - 4,
        config: { targetDoorId: `gate_${gateX}` }
      });

      // Spawn Laser gate (horizontal hazards acting as doors)
      level.hazards.push({
        type: 'laser_vertical',
        x: gateX, y: height - 6,
        config: { width: 40, height: 120, interval: 0, activeDuration: 1.0, id: `gate_${gateX}`, activeColor: '#ff0055' }
      });

      // Safe landing platform
      tiles[height - 3][x] = 1;
      tiles[height - 3][gateX] = 1;

      // Floating jump platform to double-jump over the laser gate
      tiles[height - 4][x + 3] = 2;
      tiles[height - 4][x + 4] = 2;

      // Enemy guarding keypad
      level.enemies.push({
        type: zone >= 3 ? 'glitch' : 'security',
        x: x - 2,
        y: height - 4
      });

      x += 10;
      
    } else {
      // 5. Basic flat stretch with standard enemies & collectibles
      const stretch = 8;
      
      // Standard enemies depending on zone
      if (zone === 1) {
        level.enemies.push({ type: 'security', x: x + 2, y: height - 4 });
      } else if (zone === 2) {
        level.enemies.push({ type: 'security', x: x + 2, y: height - 4 });
        level.enemies.push({ type: 'drone', x: x + 5, y: height - 6 });
      } else if (zone === 3) {
        level.enemies.push({ type: 'hacker', x: x + 2, y: height - 7 });
        level.enemies.push({ type: 'glitch', x: x + 5, y: height - 4 });
      } else {
        level.enemies.push({ type: 'mech', x: x + 2, y: height - 5 });
      }

      // Collectibles
      level.collectibles.push({ type: 'chip', x: x + 3, y: height - 5 });
      if (rand() > 0.6) {
        level.collectibles.push({ type: 'health', x: x + 4, y: height - 5 });
      }
      
      x += stretch;
    }

    // Add occasional checkpoints
    if (x % 35 < 10 && checkpointCount < 2) {
      level.interactives.push({
        type: 'checkpoint',
        x: x, y: height - 4
      });
      checkpointCount++;
      x += 2;
    }
  }

  // Ensure solid exit landing space
  for (let ex = width - 8; ex < width - 1; ex++) {
    tiles[height - 1][ex] = 1;
    tiles[height - 2][ex] = 1;
    tiles[height - 3][ex] = 1; // Floor level is 12 for final run
  }


  // Override standard level enemies with requested counts (8, 10, 12, 14)
  // We keep the procedurally generated ceiling turrets (hallways) and replace other enemies
  level.enemies = level.enemies.filter(e => e.type === 'turret');

  const levelMod = levelNum % 5;
  let targetCount = 8;
  if (levelMod === 2) targetCount = 10;
  else if (levelMod === 3) targetCount = 12;
  else if (levelMod === 4) targetCount = 14;

  const startX = 12;
  const endX = width - 12;
  const segmentLength = (endX - startX) / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const segCenter = startX + i * segmentLength + segmentLength / 2;
    const isFlying = (i % 2 === 1); // Alternate ground/flying

    if (isFlying) {
      const sx = findSafeAirX(tiles, segCenter, width, height);
      let enemyType = 'drone';
      if (zone === 3) {
        enemyType = 'hacker';
      } else if (zone === 4) {
        enemyType = (i % 4 === 1) ? 'drone' : 'hacker';
      }

      level.enemies.push({
        type: enemyType,
        x: sx,
        y: height - 7,
        variant: i % 3
      });
    } else {
      const sx = findSafeGroundX(tiles, segCenter, width, height);
      let enemyType = 'security';
      let ey = height - 4;

      if (zone === 3) {
        enemyType = 'glitch';
      } else if (zone === 4) {
        enemyType = 'mech';
        ey = height - 5;
      }

      level.enemies.push({
        type: enemyType,
        x: sx,
        y: ey
      });
    }
  }

  // Clear any procedurally generated loose health items
  level.collectibles = level.collectibles.filter(c => c.type !== 'health');

  // Spawn exactly 3 health boxes distributed across the level (at 25%, 50%, and 75% of the level length)
  const boxRatios = [0.25, 0.5, 0.75];
  boxRatios.forEach(ratio => {
    const targetX = startX + ratio * (endX - startX);
    const sx = findSafeGroundX(tiles, targetX, width, height);
    level.enemies.push({
      type: 'health_box',
      x: sx,
      y: height - 4
    });
  });

  return level;
}

export const levels = generateLevels();

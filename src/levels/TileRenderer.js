const TILE_SIZE = 40;

export default class TileRenderer {
  constructor() {
    this.tileCache = new Map();
    this.cacheCanvas = null;
    this.cacheCtx = null;
    this.time = 0;
  }

  render(ctx, tiles, cameraX, cameraY, viewWidth, viewHeight, zone) {
    this.time += 0.016;

    if (!tiles || tiles.length === 0) return;

    this.cameraY = cameraY;
    this.viewHeight = viewHeight;

    const startCol = Math.max(0, Math.floor(cameraX / TILE_SIZE) - 1);
    const endCol = Math.min(tiles[0].length - 1, Math.ceil((cameraX + viewWidth) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(cameraY / TILE_SIZE) - 1);
    const endRow = Math.min(tiles.length - 1, Math.ceil((cameraY + viewHeight) / TILE_SIZE) + 1);

    const colors = this.getTileColor(zone);

    for (let row = startRow; row <= endRow; row++) {
      for (let col = startCol; col <= endCol; col++) {
        const tile = tiles[row][col];
        if (tile === 0) continue;

        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        switch (tile) {
          case 1:
            this.renderSolidTile(ctx, tiles, row, col, x, y, colors);
            break;
          case 2:
            this.renderOneWayPlatform(ctx, x, y, colors);
            break;
          case 3:
            this.renderHazard(ctx, x, y, colors, zone, tiles, row, col);
            break;
          case 4:
            this.renderDecoration(ctx, x, y, colors, zone);
            break;
        }
      }
    }
  }

  isBottomMost(tiles, row, col) {
    for (let r = row + 1; r < tiles.length; r++) {
      const t = tiles[r][col];
      if (t === 1 || t === 3) {
        return false;
      }
    }
    return true;
  }

  renderSolidTile(ctx, tiles, row, col, x, y, colors) {
    // Dark fill with subtle gradient
    const grad = ctx.createLinearGradient(x, y, x, y + TILE_SIZE);
    grad.addColorStop(0, colors.fillLight);
    grad.addColorStop(1, colors.fill);
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Inner shadow for depth
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.fillStyle = colors.fillInner;
    ctx.fillRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);

    // Subtle grid texture
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(x + 4, y + 4, TILE_SIZE - 8, TILE_SIZE - 8);

    const isTopExposed = this.isExposed(tiles, row, col, 'top');

    // Draw glowing top neon cap on exposed floor tiles
    if (isTopExposed) {
      ctx.save();
      ctx.fillStyle = colors.edge;
      ctx.shadowBlur = 8;
      ctx.shadowColor = colors.glow;
      ctx.globalAlpha = 0.35 + Math.sin(this.time * 2.5 + col * 0.4) * 0.15;
      ctx.fillRect(x, y, TILE_SIZE, 4); // Glowing top strip
      
      // Accent micro-node center notches
      if (col % 2 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.fillRect(x + TILE_SIZE / 2 - 2, y, 4, 3);
      }
      ctx.restore();
    }

    // High-tech cyber markings inside the tile
    ctx.save();
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.07 + Math.sin(this.time * 1.2 + col) * 0.03;
    ctx.beginPath();
    if ((row + col) % 2 === 0) {
      ctx.moveTo(x + 6, y + 6);
      ctx.lineTo(x + TILE_SIZE - 6, y + 6);
      ctx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE - 6);
    } else {
      ctx.moveTo(x + 6, y + TILE_SIZE - 6);
      ctx.lineTo(x + 6, y + 6);
      ctx.lineTo(x + TILE_SIZE - 6, y + TILE_SIZE - 6);
    }
    ctx.stroke();

    // Subtle diagonal caution stripes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 4, y + TILE_SIZE - 4);
    ctx.lineTo(x + TILE_SIZE - 4, y + 4);
    ctx.stroke();
    ctx.restore();

    // Glowing neon edges on exposed sides
    const glowIntensity = 0.7 + Math.sin(this.time * 1.5) * 0.15;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = colors.glow;
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 2;
    ctx.globalAlpha = glowIntensity;

    // Top edge
    if (isTopExposed) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + TILE_SIZE, y);
      ctx.stroke();
    }
    // Bottom edge
    // Bottom edge (only if not bottom-most extended)
    const isBottomMostTile = this.isBottomMost(tiles, row, col);
    if (this.isExposed(tiles, row, col, 'bottom') && !isBottomMostTile) {
      ctx.beginPath();
      ctx.moveTo(x, y + TILE_SIZE);
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
      ctx.stroke();
    }
    // Left edge
    if (this.isExposed(tiles, row, col, 'left')) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + TILE_SIZE);
      ctx.stroke();
    }
    // Right edge
    if (this.isExposed(tiles, row, col, 'right')) {
      ctx.beginPath();
      ctx.moveTo(x + TILE_SIZE, y);
      ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE);
      ctx.stroke();
    }

    ctx.restore();

    // Vertical extension below bottom-most tiles to screen bottom
    if (isBottomMostTile) {
      const extendY = y + TILE_SIZE;
      const bottomLimit = Math.max(tiles.length * TILE_SIZE, this.cameraY + this.viewHeight);
      const extendH = bottomLimit - extendY;
      
      if (extendH > 0) {
        ctx.save();
        
        // Draw repeating tiles vertically
        for (let ey = extendY; ey < bottomLimit; ey += TILE_SIZE) {
          // Calculate depth darkening (deeper is darker)
          const depthRatio = Math.min(1, (ey - y) / 320); // darken fully by 8 tiles deep (320px)
          const shadowOpacity = 0.35 + depthRatio * 0.45; // goes from 0.35 to 0.8 opacity
          
          // 1. Base gradient fill
          const tileGrad = ctx.createLinearGradient(x, ey, x, ey + TILE_SIZE);
          tileGrad.addColorStop(0, colors.fillLight);
          tileGrad.addColorStop(1, colors.fill);
          ctx.fillStyle = tileGrad;
          ctx.fillRect(x, ey, TILE_SIZE, TILE_SIZE);
          
          // 2. Relief inner fill
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + 1, ey + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = colors.fillInner;
          ctx.fillRect(x + 2, ey + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          
          // 3. Grid border lines
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 4, ey + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          
          // 4. Cyber decoration details inside tile
          ctx.save();
          ctx.strokeStyle = colors.edge;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = 0.05 * (1 - depthRatio * 0.8); // fade details out deeper
          ctx.beginPath();
          const rowOffset = Math.floor(ey / TILE_SIZE);
          if ((rowOffset + col) % 2 === 0) {
            ctx.moveTo(x + 6, ey + 6);
            ctx.lineTo(x + TILE_SIZE - 6, ey + 6);
            ctx.lineTo(x + TILE_SIZE - 6, ey + TILE_SIZE - 6);
          } else {
            ctx.moveTo(x + 6, ey + TILE_SIZE - 6);
            ctx.lineTo(x + 6, ey + 6);
            ctx.lineTo(x + TILE_SIZE - 6, ey + TILE_SIZE - 6);
          }
          ctx.stroke();
          ctx.restore();
          
          // 5. Apply the depth shadow mask on top of this block
          ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
          ctx.fillRect(x, ey, TILE_SIZE, TILE_SIZE);
        }
        
        // Side borders if exposed
        const isLeftExposed = this.isExposed(tiles, row, col, 'left');
        const isRightExposed = this.isExposed(tiles, row, col, 'right');
        
        if (isLeftExposed || isRightExposed) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = colors.glow;
          ctx.strokeStyle = colors.edge;
          ctx.lineWidth = 2;
          ctx.globalAlpha = glowIntensity;
          
          if (isLeftExposed) {
            ctx.beginPath();
            ctx.moveTo(x, extendY);
            ctx.lineTo(x, bottomLimit);
            ctx.stroke();
          }
          if (isRightExposed) {
            ctx.beginPath();
            ctx.moveTo(x + TILE_SIZE, extendY);
            ctx.lineTo(x + TILE_SIZE, bottomLimit);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }

  renderOneWayPlatform(ctx, x, y, colors) {
    const bobOffset = Math.sin(this.time * 2 + x * 0.1) * 1.5;
    const py = y + bobOffset;
    const pHeight = 10;

    ctx.save();
    
    // 1. Draw solid inner core for physical presence
    ctx.fillStyle = colors.fillInner;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(x, py + 2, TILE_SIZE, pHeight - 4);

    // 2. Neon top surface line
    ctx.strokeStyle = colors.edge;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 12;
    ctx.shadowColor = colors.glow;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(x, py + 1);
    ctx.lineTo(x + TILE_SIZE, py + 1);
    ctx.stroke();

    // 3. Neon bottom surface line (fainter edge)
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(x, py + pHeight - 1);
    ctx.lineTo(x + TILE_SIZE, py + pHeight - 1);
    ctx.stroke();

    // 4. Structural bracket details at left/right edges
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(x, py + 1);
    ctx.lineTo(x + 4, py + pHeight - 1);
    ctx.moveTo(x + TILE_SIZE, py + 1);
    ctx.lineTo(x + TILE_SIZE - 4, py + pHeight - 1);
    ctx.stroke();

    // 5. Vertical cybernetic hashing texture in the middle
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let sx = 8; sx < TILE_SIZE; sx += 8) {
      ctx.moveTo(x + sx, py + 3);
      ctx.lineTo(x + sx, py + pHeight - 3);
    }
    ctx.stroke();

    // 6. Faint under-glow projection
    ctx.fillStyle = colors.glow;
    ctx.globalAlpha = 0.25;
    ctx.shadowBlur = 18;
    ctx.fillRect(x + 2, py + pHeight, TILE_SIZE - 4, 3);

    ctx.restore();
  }

  renderHazard(ctx, x, y, colors, zone, tiles, row, col) {
    ctx.save();
    const pulse = 0.7 + Math.sin(this.time * 6) * 0.3;
    
    // Mega shadow glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ff0033';
    ctx.globalAlpha = pulse;

    // Draw solid hazardous base under spikes
    ctx.fillStyle = '#1e0008';
    ctx.fillRect(x, y + TILE_SIZE - 8, TILE_SIZE, 8);

    // Draw red/yellow caution stripes on the base
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y + TILE_SIZE - 8, TILE_SIZE, 8);
    ctx.clip();
    
    ctx.strokeStyle = '#ffe600'; // Yellow stripes
    ctx.lineWidth = 2;
    for (let sx = -8; sx < TILE_SIZE; sx += 8) {
      ctx.beginPath();
      ctx.moveTo(x + sx, y + TILE_SIZE);
      ctx.lineTo(x + sx + 6, y + TILE_SIZE - 8);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = '#ff0033';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y + TILE_SIZE - 8, TILE_SIZE, 8);

    // Spikes - draw 3 triangles with bright fills
    const spikeCount = 3;
    const spikeW = TILE_SIZE / spikeCount;
    
    for (let i = 0; i < spikeCount; i++) {
      const sx = x + i * spikeW;
      
      // Outer spike shape
      ctx.fillStyle = '#ff0033';
      ctx.beginPath();
      ctx.moveTo(sx, y + TILE_SIZE);
      ctx.lineTo(sx + spikeW / 2, y + 4);
      ctx.lineTo(sx + spikeW, y + TILE_SIZE);
      ctx.closePath();
      ctx.fill();

      // Inner white glowing core for extreme visibility
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(sx + 3, y + TILE_SIZE);
      ctx.lineTo(sx + spikeW / 2, y + 10);
      ctx.lineTo(sx + spikeW - 3, y + TILE_SIZE);
      ctx.closePath();
      ctx.fill();
    }

    // Glowing outline over all spikes
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    for (let i = 0; i < spikeCount; i++) {
      const sx = x + i * spikeW;
      ctx.moveTo(sx, y + TILE_SIZE);
      ctx.lineTo(sx + spikeW / 2, y + 4);
      ctx.lineTo(sx + spikeW, y + TILE_SIZE);
    }
    ctx.stroke();

    // Glow at tips
    ctx.shadowBlur = 25;
    ctx.globalAlpha = pulse;
    for (let i = 0; i < spikeCount; i++) {
      ctx.beginPath();
      ctx.arc(x + i * spikeW + spikeW / 2, y + 4, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ffe600'; // Yellow glowing tip flare!
      ctx.fill();
    }

    ctx.restore();

    // Extension below the hazard tile (if bottom-most in its column)
    if (tiles && row !== undefined && col !== undefined && this.isBottomMost(tiles, row, col)) {
      const extendY = y + TILE_SIZE;
      const bottomLimit = Math.max(tiles.length * TILE_SIZE, this.cameraY + this.viewHeight);
      const extendH = bottomLimit - extendY;
      
      if (extendH > 0) {
        ctx.save();
        // Draw repeating tiles vertically
        for (let ey = extendY; ey < bottomLimit; ey += TILE_SIZE) {
          const depthRatio = Math.min(1, (ey - y) / 320);
          const shadowOpacity = 0.35 + depthRatio * 0.45;
          
          const tileGrad = ctx.createLinearGradient(x, ey, x, ey + TILE_SIZE);
          tileGrad.addColorStop(0, colors.fillLight);
          tileGrad.addColorStop(1, colors.fill);
          ctx.fillStyle = tileGrad;
          ctx.fillRect(x, ey, TILE_SIZE, TILE_SIZE);
          
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + 1, ey + 1, TILE_SIZE - 2, TILE_SIZE - 2);
          ctx.fillStyle = colors.fillInner;
          ctx.fillRect(x + 2, ey + 2, TILE_SIZE - 4, TILE_SIZE - 4);
          
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 4, ey + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          
          ctx.save();
          ctx.strokeStyle = colors.edge;
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = 0.05 * (1 - depthRatio * 0.8);
          ctx.beginPath();
          const rowOffset = Math.floor(ey / TILE_SIZE);
          if ((rowOffset + col) % 2 === 0) {
            ctx.moveTo(x + 6, ey + 6);
            ctx.lineTo(x + TILE_SIZE - 6, ey + 6);
            ctx.lineTo(x + TILE_SIZE - 6, ey + TILE_SIZE - 6);
          } else {
            ctx.moveTo(x + 6, ey + TILE_SIZE - 6);
            ctx.lineTo(x + 6, ey + 6);
            ctx.lineTo(x + TILE_SIZE - 6, ey + TILE_SIZE - 6);
          }
          ctx.stroke();
          ctx.restore();
          
          ctx.fillStyle = `rgba(0, 0, 0, ${shadowOpacity})`;
          ctx.fillRect(x, ey, TILE_SIZE, TILE_SIZE);
        }
        
        const isLeftExposed = this.isExposed(tiles, row, col, 'left');
        const isRightExposed = this.isExposed(tiles, row, col, 'right');
        
        if (isLeftExposed || isRightExposed) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = colors.glow;
          ctx.strokeStyle = colors.edge;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.7 + Math.sin(this.time * 1.5) * 0.15;
          
          if (isLeftExposed) {
            ctx.beginPath();
            ctx.moveTo(x, extendY);
            ctx.lineTo(x, bottomLimit);
            ctx.stroke();
          }
          if (isRightExposed) {
            ctx.beginPath();
            ctx.moveTo(x + TILE_SIZE, extendY);
            ctx.lineTo(x + TILE_SIZE, bottomLimit);
            ctx.stroke();
          }
        }
        ctx.restore();
      }
    }
  }

  renderDecoration(ctx, x, y, colors, zone) {
    // Disabled to clean up background visual clutter and vector artifacts
    return;
  }

  getTileColor(zone) {
    switch (zone) {
      case 1: // Lower City - dark concrete + cyan neon
        return {
          fill: '#080a14',
          fillLight: '#141829',
          fillInner: '#0e111f',
          edge: '#00f0ff',
          glow: '#00f0ff'
        };
      case 2: // Corporate - metallic + hot pink/magenta neon
        return {
          fill: '#0d0d1a',
          fillLight: '#181830',
          fillInner: '#101024',
          edge: '#ff00aa',
          glow: '#ff00aa'
        };
      case 3: // The Grid - digital green
        return {
          fill: '#020a05',
          fillLight: '#081a0e',
          fillInner: '#041208',
          edge: '#00ff88',
          glow: '#00ff88'
        };
      case 4: // Sky Core - heavy carbon + orange gold glow
        return {
          fill: '#140c04',
          fillLight: '#261708',
          fillInner: '#1b1005',
          edge: '#ff8800',
          glow: '#ffaa00'
        };
      default:
        return {
          fill: '#080a14',
          fillLight: '#141829',
          fillInner: '#0e111f',
          edge: '#00f0ff',
          glow: '#00f0ff'
        };
    }
  }

  isExposed(tiles, row, col, side) {
    const rows = tiles.length;
    const cols = tiles[0].length;

    switch (side) {
      case 'top':
        return row === 0 || tiles[row - 1][col] === 0 || tiles[row - 1][col] === 2;
      case 'bottom':
        return row === rows - 1 || tiles[row + 1][col] === 0 || tiles[row + 1][col] === 2;
      case 'left':
        return col === 0 || tiles[row][col - 1] === 0 || tiles[row][col - 1] === 2;
      case 'right':
        return col === cols - 1 || tiles[row][col + 1] === 0 || tiles[row][col + 1] === 2;
      default:
        return false;
    }
  }
}

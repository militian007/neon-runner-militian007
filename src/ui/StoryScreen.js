export default class StoryScreen {
  constructor() {
    this.levelNum = 1;
    this.timer = 10.0; // 10 seconds auto-skip
    this.textProgress = 0;
    this.time = 0;
    this.video = null;
    this.videoLoaded = false;
    this.videoError = false;
    this.storyTexts = {
      1: "Neon se desliza por las sombras de los Suburbios Bajos. El aire es denso, cargado de lluvia ácida y estática. La corporación AetherCorp controla las comunicaciones. Tu misión comienza aquí: hackea el primer nodo de acceso y evita a las patrullas Viper-X.",
      2: "Las alarmas de seguridad local han detectado una anomalía. AetherCorp ha movilizado bots bípedos pesados en los callejones del sector. Neon debe moverse rápido y usar las grietas dimensionales de energía para alimentar sus implantes cyber-ninja.",
      3: "Perseguido por los callejones, Neon escala hacia los tejados de chapa y cables de alta tensión. Entre la lluvia y las grúas de carga, las torretas de defensa automática barren el área. Solo un paso en falso significa caer al abismo.",
      4: "Neon se adentra en la central de distribución eléctrica que alimenta las defensas del centro. El camino está plagado de compuertas láser. Debe hackear las terminales de seguridad para desactivar la red de contención antes de que lo acorralen.",
      5: "Neon ha llegado al procesador del Sector 1. Pero la salida está bloqueada por el Warden X-1, un mecha centinela fuertemente armado. La única forma de escapar y obtener los primeros núcleos de datos es destruyéndolo en combate directo.",
      // Planificación para zonas posteriores (6 a 20)
      6: "Neon inicia el asalto a las Torres Corporativas (Corporate Towers). La seguridad aquí es extrema. Drones de asalto cian y torretas de respuesta rápida protegen las terminales de datos.",
      7: "Avanzando por las oficinas ejecutivas de cristal y acero. Neon debe esquivar los campos de fuerza y encontrar las consolas de bypass de seguridad.",
      8: "El sistema de seguridad corporativo se ha puesto en alerta máxima. Las plataformas desaparecen y los guardias patrullan los pasillos de alta tensión.",
      9: "En las profundidades del centro de comunicaciones ópticas. Un paso más hacia la supercomputadora central, pero los láseres y mechas bloquean el paso.",
      10: "Neon ha alcanzado la cámara del Nexus Core. El mainframe central activa sus enjambres defensivos y escudos direccionales. ¡Destrúyelo para liberar la red!",
      11: "Neon digitaliza su conciencia y accede a 'The Grid', la red de datos virtuales. La física aquí es inestable y las anomalías de código modifican el entorno.",
      12: "Atravesando los sectores de cuarentena de virus. Las plataformas se desvanecen al tacto y las entidades glitch se teletransportan hacia ti.",
      13: "En las tuberías de flujo de datos infectadas. Neon debe purgar los nodos de red corruptos antes de que el firewall desconecte su cerebro.",
      14: "La red de datos colapsa en un desbordamiento de matriz. Neon debe moverse velozmente y hackear las terminales bajo una tormenta de bytes.",
      15: "Neon encara al Malware Zero en el núcleo virtual. El virus inestable crea clones holográficos y distorsiona el espacio. ¡Elimínalo!",
      16: "Neon asciende mediante el elevador espacial hacia la Sky Fortress. En esta estación orbital la gravedad es menor y las defensas experimentales están activas.",
      17: "Corriendo sobre las pasarelas exteriores de la fortaleza, con la Tierra de fondo. El viento estelar y las patrullas centinela dificultan el avance.",
      18: "En el condensador atmosférico de la estación orbital. Activa los fusibles para desactivar la rejilla láser que bloquea el núcleo energético.",
      19: "Neon ingresa al nodo de singularidad cuántica. Los mechas pesados y las trampas de energía se interponen en el último tramo hacia el CEO.",
      20: "Neon se encuentra frente al Omega Core, el mecha orbital definitivo controlado por el líder corporativo. ¡Destruye la estación y libera a Neo-City!"
    };
  }

  setup(levelNum) {
    this.levelNum = levelNum;
    this.timer = 10.0;
    this.textProgress = 0;
    this.videoLoaded = false;
    this.videoError = false;

    // Clean up previous video from DOM if exists
    this.cleanup();

    // Create offscreen video element attached to body (some browsers require DOM attachment to load/play)
    this.video = document.createElement('video');
    this.video.style.position = 'absolute';
    this.video.style.width = '0px';
    this.video.style.height = '0px';
    this.video.style.left = '-9999px';
    this.video.style.pointerEvents = 'none';
    this.video.loop = true;
    this.video.muted = true;
    this.video.setAttribute('playsinline', '');

    // Set handlers BEFORE src to prevent race conditions
    this.video.oncanplay = () => {
      this.videoLoaded = true;
      this.video.play().catch((e) => {
        console.warn("Autoplay blocked or failed:", e);
      });
    };

    this.video.onerror = (e) => {
      console.error("Video loading error:", this.video.error);
      this.videoError = true;
    };

    document.body.appendChild(this.video);
    
    // Use absolute URL from root to ensure correct resolution
    this.video.src = `/videos/level_${levelNum}.mp4`;
    this.video.load();
  }

  cleanup() {
    if (this.video) {
      this.video.pause();
      if (this.video.parentNode) {
        this.video.parentNode.removeChild(this.video);
      }
      this.video = null;
    }
  }

  update(dt, input) {
    this.time += dt;
    this.timer -= dt;

    // Typewriter text effect
    const fullText = this.storyTexts[this.levelNum] || "";
    this.textProgress = Math.min(fullText.length, this.textProgress + dt * 45);

    // Skip/continue on click or keypress
    if (input.isPressed(' ') || input.isPressed('enter') || input.isPressed('escape') || this.timer <= 0) {
      this.cleanup();
      return 'play';
    }

    // Check mouse click on SKIP button in bottom right (X: 1120-1240, Y: 600-640)
    if (input.isMouseDown()) {
      const mousePos = input.getMousePos();
      if (mousePos.x >= 1120 && mousePos.x <= 1240 && mousePos.y >= 600 && mousePos.y <= 640) {
        this.cleanup();
        return 'play';
      }
    }

    return null;
  }

  render(ctx, width, height) {
    // Background style
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, width, height);

    // Grid lines on background
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    ctx.restore();

    // Top title banner
    ctx.save();
    ctx.font = '14px Rajdhani, sans-serif';
    ctx.fillStyle = '#ff00aa';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff00aa';
    ctx.fillText(`TRANSMISIÓN DE DATOS // CAPÍTULO ${this.levelNum}`, 60, 60);

    ctx.font = 'bold 32px Orbitron, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f0ff';
    ctx.fillText(`NIVEL ${this.levelNum}: ${this.getLevelName()}`, 60, 100);
    ctx.restore();

    // Text box (Left side)
    const textBoxX = 60;
    const textBoxY = 160;
    const textBoxW = 540;
    const textBoxH = 400;

    // Glassmorphic panel for text
    ctx.save();
    ctx.fillStyle = 'rgba(10, 10, 20, 0.7)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.fillRect(textBoxX, textBoxY, textBoxW, textBoxH);
    ctx.strokeRect(textBoxX, textBoxY, textBoxW, textBoxH);
    
    // Tech corner accents on text box
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    const cs = 10;
    ctx.beginPath();
    ctx.moveTo(textBoxX, textBoxY + cs); ctx.lineTo(textBoxX, textBoxY); ctx.lineTo(textBoxX + cs, textBoxY);
    ctx.stroke();
    ctx.restore();

    // Draw story text (typewriter effect)
    ctx.save();
    ctx.font = '18px Rajdhani, sans-serif';
    ctx.fillStyle = '#a0aabf';
    const textToDraw = this.storyTexts[this.levelNum] || "";
    const visibleText = textToDraw.substring(0, Math.floor(this.textProgress));
    this.wrapText(ctx, visibleText, textBoxX + 25, textBoxY + 40, textBoxW - 50, 28);
    ctx.restore();

    // Video Box (Right side)
    const videoX = 660;
    const videoY = 160;
    const videoW = 560;
    const videoH = 400;

    ctx.save();
    ctx.fillStyle = '#020205';
    ctx.fillRect(videoX, videoY, videoW, videoH);
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(videoX, videoY, videoW, videoH);
    ctx.restore();

    // Render Video or Placeholder Hologram
    if (this.videoLoaded && !this.videoError && this.video) {
      try {
        ctx.drawImage(this.video, videoX, videoY, videoW, videoH);
      } catch (e) {
        this.renderHologram(ctx, videoX, videoY, videoW, videoH);
      }
    } else {
      this.renderHologram(ctx, videoX, videoY, videoW, videoH);
    }

    // Video Box tech outline
    ctx.save();
    ctx.strokeStyle = '#ff00aa';
    ctx.lineWidth = 2;
    const csV = 10;
    ctx.beginPath();
    ctx.moveTo(videoX + videoW, videoY + videoH - csV);
    ctx.lineTo(videoX + videoW, videoY + videoH);
    ctx.lineTo(videoX + videoW - csV, videoY + videoH);
    ctx.stroke();
    ctx.restore();

    // Skip Button (Bottom Right)
    ctx.save();
    const skipX = 1120;
    const skipY = 600;
    const skipW = 120;
    const skipH = 40;

    ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1;
    ctx.fillRect(skipX, skipY, skipW, skipH);
    ctx.strokeRect(skipX, skipY, skipW, skipH);

    ctx.font = 'bold 14px Orbitron, monospace';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SALTAR ▶', skipX + skipW / 2, skipY + skipH / 2);
    ctx.restore();

    // Timer Auto-Skip indicator (Bottom Left)
    ctx.save();
    ctx.font = '12px Rajdhani, sans-serif';
    ctx.fillStyle = '#556680';
    ctx.fillText(`INICIANDO EN: ${Math.ceil(this.timer)}s...`, 60, 620);
    ctx.restore();
  }

  getLevelName() {
    const names = [
      'Lower Slums Entrance', 'Neon Alleyways', 'Rainy Rooftops', 'Power Grid Sector', 'Sector 1 Core: Warden X-1',
      'Datastream Ingress', 'System Buffer', 'Corporate High-Rise', 'Optical Comm Hub', 'Sector 2 Core: Nexus Mainframe',
      'Glitch Valley', 'Virus Quarantine', 'Infected Pipelines', 'Matrix Overflow', 'Sector 3 Core: Malware Zero',
      'Ascension Lift', 'Sky Gateways', 'Atmosphere Condenser', 'Quantum Singularity Node', 'Sector 4 Core: Omega Core'
    ];
    return names[this.levelNum - 1] || 'Sector Desconocido';
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n] + ' ';
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  renderHologram(ctx, x, y, w, h) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const time = this.time;

    ctx.save();
    
    // Draw wireframe grid representing a neural hack
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.lineWidth = 1;
    for (let col = x + 30; col < x + w; col += 40) {
      ctx.beginPath();
      ctx.moveTo(col, y);
      ctx.lineTo(col + Math.sin(time + col) * 15, y + h);
      ctx.stroke();
    }

    // 3D wireframe rotating cube
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f0ff';

    const cubeSize = 60 + Math.sin(time * 3) * 5;
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.4);
    ctx.rotate(time * 0.25);

    // Front face
    ctx.strokeRect(-cubeSize / 2, -cubeSize / 2, cubeSize, cubeSize);
    
    // Back face (offset)
    ctx.strokeStyle = '#ff00aa';
    ctx.shadowColor = '#ff00aa';
    ctx.strokeRect(-cubeSize / 2 + 15, -cubeSize / 2 + 15, cubeSize, cubeSize);

    // Connect corners
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    const offsets = [
      [[-cubeSize/2, -cubeSize/2], [-cubeSize/2 + 15, -cubeSize/2 + 15]],
      [[cubeSize/2, -cubeSize/2], [cubeSize/2 + 15, -cubeSize/2 + 15]],
      [[-cubeSize/2, cubeSize/2], [-cubeSize/2 + 15, cubeSize/2 + 15]],
      [[cubeSize/2, cubeSize/2], [cubeSize/2 + 15, cubeSize/2 + 15]]
    ];
    for (const [p1, p2] of offsets) {
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    ctx.restore();

    // Glitch message overlay
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Orbitron, monospace';
    ctx.fillStyle = '#ff00aa';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#ff00aa';
    ctx.fillText('ANOMALÍA DE VIDEO // SIMULACIÓN HOLOGRÁFICA HACKEADA', cx, y + h - 40);

    // Binary code flow
    ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
    ctx.font = '10px monospace';
    for (let i = 0; i < 5; i++) {
      const bx = x + 30 + i * 110;
      const by = y + 40 + ((time * 80 + i * 50) % (h - 100));
      ctx.fillText(Math.random() > 0.5 ? '10101101' : '01011010', bx, by);
    }
    ctx.restore();
  }
}

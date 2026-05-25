# NEON RUNNER — Especificación Técnica del Motor de Juego

## 1. Arquitectura de Módulos y Flujo del Juego
El juego está construido como una aplicación Web modular en JavaScript vainilla (ES6) agrupada mediante Vite.

```
+-------------------------------------------------------------+
|                         index.html                          |
|                             |                               |
|                          main.js                            |
+-----------------------------|-------------------------------+
                              v
+-------------------------------------------------------------+
|                      engine/Game.js                         |
|  - Orquestador Central (Loop de Juego con Fixed Timestep)   |
|  - Gestor de Estados (MENU, LEVEL_SELECT, PLAYING, etc.)    |
+----|------------|------------|-----------|-------------|----+
     |            |            |           |             |
     v            v            v           v             v
  [Input]     [Camera]     [Physics]    [Audio]      [HUD]
  (Teclas)   (Saturación)  (Colisión) (Procedural)  (Interfaz)
```

### Loop de Juego (Fixed Timestep)
Para asegurar físicas consistentes e independientes de la tasa de refresco (60Hz vs 144Hz), `Game.js` utiliza un acumulador de tiempo con un paso físico fijo (`fixedDt = 1/60` de segundo):
* **update(fixedDt)**: Se ejecuta de forma determinista para la física y la lógica de entidades.
* **render()**: Se ejecuta en cada cuadro mediante `requestAnimationFrame`, suavizando el dibujado de elementos visuales y efectos de fondo.

---

## 2. Motor de Física y Resolución de Colisiones
Las colisiones en el juego son rectangulares, basadas en cajas alineadas a los ejes (AABB - Axis-Aligned Bounding Boxes).

### Algoritmo de Movimiento y Colisión de Tiles
Para evitar atravesar esquinas u obtener empujes erróneos, la física del jugador y de las entidades terrestres se ejecuta en dos pasos secuenciales:
1. **Paso X (Horizontal)**:
   - Se suma `vx` a la posición `x`.
   - Se calculan las columnas y filas de tiles que la entidad abarca.
   - Si colisiona con un tile sólido (tipo 1 o 3), se revierte la penetración ajustando `x` al borde del tile y se establece `vx = 0`.
2. **Paso Y (Vertical)**:
   - Se suma `vy` a la posición `y`.
   - Se calculan las columnas y filas de tiles que la entidad abarca.
   - Si colisiona con un tile sólido (tipo 1, 2 o 3), se revierte la penetración ajustando `y` al borde del tile, se establece `vy = 0` y se marca la bandera `grounded = true` (si el choque fue contra el suelo).
   - Para las plataformas de una sola vía (tipo 2), el chequeo se salta si el jugador está presionando agacharse (`dropThrough = true`) o si su posición previa ya estaba por debajo del tope de la plataforma.

### Plataformas Especiales (Móviles / Rompibles)
Las colisiones con entidades dinámicas (`Platform.js`) se calculan en el loop de `Game.js` después del movimiento del jugador.
* Si el jugador desciende (`vy >= 0`) y colisiona con el borde superior de la plataforma especial, se le posiciona encima.
* Si la plataforma es de tipo `moving`, las velocidades horizontales y verticales de la plataforma se suman directamente a la posición del jugador en la misma iteración para arrastrarlo sin desincronizaciones.

---

## 3. Renderizador de Neón Vectorial (`NeonRenderer`)
El renderizado del juego no utiliza hojas de sprites ni archivos de imagen para las entidades; todo se dibuja procedimentalmente mediante primitivas de Canvas:
* **Glow/Bloom**: Utiliza las propiedades `shadowColor` y `shadowBlur` del contexto 2D de HTML5 Canvas para emular la dispersión de luz de neón.
* **Optimización de Dibujo**: Los efectos pesados de sombra se limitan a las líneas de contorno expuestas del mapa y las siluetas del personaje para mantener los 60 FPS estables.
* **Cámara con Interpolación Lerp**: La cámara se desplaza suavemente hacia el jugador usando interpolación lineal con factor de amortiguación:
  `camera.x += (desiredX - camera.x) * (1 - Math.pow(1 - lerpFactor, dt))`

---

## 4. Motor de Audio Sintetizado Procedimentalmente (`AudioManager`)
Neon Runner genera toda su banda sonora en tiempo real a través de la **Web Audio API**:
* **Sintetizador Synthwave**: Crea un ritmo de batería (kick y snare) usando generadores de ruido blanco y osciladores de baja frecuencia.
* **Línea de Bajo Arpegiada**: Emplea osciladores de onda diente de sierra (`sawtooth`) con envolventes de filtro de paso bajo resonante para emular sintetizadores clásicos de los años 80.
* **Efectos de Sonido (SFX)**: Los sonidos de salto, daño, hackeo y explosiones se sintetizan en el momento usando variaciones rápidas de frecuencia en osciladores senoidales (`sine`) y de onda cuadrada (`square`).
* **Sistema de Muteo**: El canal de música puede mutearse independientemente del canal de efectos especiales (SFX) para mejorar la accesibilidad del usuario.

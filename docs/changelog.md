# Registro de Cambios — NEON RUNNER

## [v1.0.1] - 2026-05-23

### Correcciones de Bugs (Hotfixes)

1. **Colisiones y Movimiento Sólido del Jugador (`Player.js` & `engine.js`)**:
   - **Problema**: El jugador atravesaba bloques sólidos o se teletransportaba al revés al chocar lateralmente contra las paredes.
   - **Causa**: El algoritmo privado en `Player.js` hacía un chequeo de colisión generalizado basándose únicamente en el signo de la velocidad `vx/vy` sin importar la dirección de contacto real, empujando al jugador al extremo contrario del tile.
   - **Solución**: Se reemplazaron los algoritmos privados con las funciones globales optimizadas de AABB `resolveHorizontalTileCollisions` y `resolveVerticalTileCollisions` desde `engine.js`.
   - **Mejora**: Añadido soporte para `entity.dropThrough` en la física global para permitir bajar de las plataformas flotantes pulsando la tecla `S`.

2. **Cámara y Desplazamiento Visual de Tiles (`TileRenderer.js`)**:
   - **Problema**: Al caminar hacia la derecha, los bloques visuales se desplazaban a doble velocidad del jugador, desalineándose de su colisión física real.
   - **Causa**: En el bucle de renderizado de `Game.js`, el canvas ya era trasladado por la posición `-camera.x` e `-camera.y`. En `TileRenderer.js` se volvía a restar la cámara, aplicando un desfase doble.
   - **Solución**: Se eliminó la resta de `cameraX/cameraY` de los cálculos de dibujado en el renderizador de tiles. Ahora los bloques se dibujan en sus coordenadas de mapa absolutas y se alinean perfectamente.

3. **Sincronización del Puntaje en la HUD (`Game.js` & `HUD.js`)**:
   - **Problema**: Eliminar enemigos o recolectar chips aumentaba el puntaje interno pero no actualizaba el contador animado en la HUD superior derecha.
   - **Causa**: Faltaban los llamados explícitos a `hud.addScore(puntos)` y el reinicio de la HUD al recargar o reintentar el nivel.
   - **Solución**: Se incorporaron llamadas a `hud.addScore()` en todos los eventos que otorgan puntaje (derrota de enemigo, pisotón y recolección de chips). Adicionalmente, se configuró `hud.reset()` al cargar cada nivel para sincronizar el puntaje acumulado y actualizar el banner del nivel.

4. **Proyectiles Enemigos Ultra Veloces (`Projectile.js`)**:
   - **Problema**: El jugador perdía vida mágicamente nada más iniciar el nivel, incluso quedándose quieto sin enemigos cerca de la pantalla.
   - **Causa**: Los proyectiles disparados por Drones y Torreta en zonas lejanas del mapa sumaban su velocidad por segundo directamente por frame en `Projectile.js` (faltaba multiplicar `vx` y `vy` por el delta-time `dt`). Esto hacía que viajaran de forma instantánea impactando al jugador en milisegundos.
   - **Solución**: Se multiplicó el desplazamiento de proyectiles por el delta-time `dt`. Ahora los disparos avanzan a una velocidad balanceada en pantalla y son visibles/esquivables.

### Nuevas Características y Mejoras

1. **Interacción con Plataformas Dinámicas (`Game.js` & `Platform.js`)**:
   - Se añadió un sistema de colisión entre el jugador y las plataformas móviles, rompibles o que desaparecen en el loop de `Game.js`.
   - El jugador es arrastrado de forma fluida por la velocidad horizontal y vertical de las plataformas móviles (`platformVX` / `platformVY`).
   - Pararse sobre plataformas rompibles inicia la cuenta regresiva y el efecto visual de fracturas antes de colapsar.

## [v1.0.2] - 2026-05-23

### Correcciones de Bugs (Hotfixes)

1. **Soporte de Mouse en Menús (`GameOverScreen.js`, `PauseMenu.js`, `VictoryScreen.js`)**:
   - **Problema**: El clic de mouse no funcionaba en las pantallas de Game Over ("CONNECTION LOST"), Pausa y Victoria, requiriendo exclusivamente el uso del teclado.
   - **Solución**: Se agregaron coordenadas del área de los botones y detección del cursor/clic del mouse en los métodos `update(dt, input)` de cada pantalla. Ahora es posible seleccionar y presionar opciones de forma táctil/mouse de manera completamente intuitiva.

2. **Reinicio desde Checkpoints (`Game.js`)**:
   - **Problema**: Al morir, la partida volvía a empezar siempre desde el inicio del nivel, ignorando si el jugador había activado un checkpoint.
   - **Solución**: Se implementó una variable de estado `this.checkpoint` en el motor de juego. Al interactuar con un checkpoint, se guardan sus coordenadas y, al respawnear por muerte, se ubica al jugador allí en vez de al inicio del mapa.

3. **Visibilidad Aumentada de Púas/Spikes (`TileRenderer.js`)**:
   - **Problema**: Las púas de peligro terrestre no eran lo suficientemente visibles.
   - **Solución**: Se rediseñó el renderizado del tile de púas (tipo 3) agregando una base metálica de peligro, un contorno brillante de color magenta neón, triángulos interiores blancos para emular núcleos de calor extremo, y flares destellantes de color amarillo neón en las puntas.

## [v1.0.3] - 2026-05-23

### Correcciones de Bugs (Hotfixes)

1. **Física de Acoplamiento en Plataformas Móviles (`Game.js` & `Player.js`)**:
   - **Problema**: El jugador podía deslizarse o caerse a través de las plataformas móviles al moverse vertical u horizontalmente a alta velocidad, o experimentar temblores.
   - **Solución**: Se reordenó el loop de actualización para que las plataformas se muevan primero. Luego, si el jugador está parado sobre una plataforma móvil (`standingOnPlatform`), se le aplica exactamente la velocidad acumulada de la plataforma antes del update del jugador. Finalmente, el propio update del jugador calcula sus físicas y resuelve colisiones de tiles sin duplicidad de actualización de posición vertical, logrando un acoplamiento perfecto de físicas.

2. **Doble Salto Responsivo y Fluido (`Player.js`)**:
   - **Problema**: El doble salto no se sentía lo suficientemente ágil o responsivo al activarse.
   - **Solución**: Se incrementó la fuerza del doble salto a `-13` (igualando al salto normal) y se añadió una ráfaga explosiva neumática de 15 partículas de neón en todas direcciones desde los pies del jugador al activarse, mejorando drásticamente el feedback de jugabilidad.

3. **Checkpoints a Nivel del Suelo (`Game.js`)**:
   - **Problema**: Los checkpoints se generaban flotando en el aire a un bloque de altura del suelo.
   - **Solución**: Se implementó un algoritmo de escaneo vertical descendente en `Game.js` al cargar el nivel. Ahora, el checkpoint desciende automáticamente hasta tocar la primera superficie sólida (bloque o plataforma), colocándose exactamente a nivel del suelo.

### Nuevas Características y Mejoras

1. **Sierras Giratorias en Emisores Láser (`Hazard.js` & `Game.js`)**:
   - Se añadió un renderizador de sierras circulares de neón (`_renderSawBlade`) en `Hazard.js`.
   - Cuando un láser vertical u horizontal está activo o en fase de advertencia, se dibujan sierras girando a alta velocidad en las bases de los emisores láser (donde hace contacto con el bloque o superficie sólida), indicando claramente al jugador que no debe pisar ni tocar esas zonas.
   - Los haces láser se recortan dinámicamente escaneando los bloques del mapa (`tiles`), deteniéndose exactamente en el bloque sólido más cercano y situando las sierras allí.

2. **Checkpoints Holográficos de Alta Visibilidad (`Interactive.js`)**:
   - Se rediseñó el aspecto del checkpoint inactivo para mostrar un pedestal de soporte con una gema/diamante holográfico flotante que gira, bobs y emite un halo de energía circular, haciéndolo sumamente visible desde lejos.

3. **Portal de Meta Tridimensional (`Game.js`)**:
   - Se rediseñó la meta ("Exit Portal") para ser un gran portal ovalado vertical (vórtice de energía neón verde/cian) con múltiples anillos segmentados que giran en direcciones opuestas y partículas de datos atraídas y succionadas hacia su centro, ofreciendo una experiencia cinemática premium al superar el nivel.

## [v1.0.4] - 2026-05-24

### Correcciones de Bugs (Hotfixes)

1. **Límites de Escaneo en Láseres (`Hazard.js`)**:
   - **Problema**: Los láseres verticales y horizontales se extendían hasta abarcar toda la pantalla (de techo a suelo o de pared a pared), bloqueando el paso y resultando imposibles de evitar.
   - **Causa**: El bucle de escaneo de bloques sólidos buscaba obstáculos a lo largo de toda la fila/columna del mapa, expandiendo el haz láser más allá de su tamaño configurado original si encontraba una superficie sólida lejana.
   - **Solución**: Se limitó el escaneo de bloques sólidos estrictamente a los límites de longitud configurados (`width` / `height`) del emisor láser. Ahora el láser no se estira de manera artificial y mantiene su tamaño pasable original.
   - **Sincronización de Físicas**: Se actualizó `getHitbox` para sincronizar las colisiones físicas con el haz visual dinámico cortado por paredes o bloques del mapa.

### Nuevas Características y Mejoras

1. **Fondo Cyberpunk con Parallax Tridimensional y Autos Voladores (`Background.js`)**:
   - **Mejora 3D**: Procesado el fondo cyberpunk (`cyberpunk_bg.jpg`) para añadir una fuerte sensación tridimensional, profundidad de campo dramática y perspectivas de rascacielos que se extienden al horizonte.
   - **Renderizado**: Renderizado continuo con efecto de parallax horizontal lento (`0.08`) en la Zona 1 y Zona 2, y envoltura horizontal simétrica (horizontal mirroring) para eliminar costuras visuales.
   - **Autos Voladores**: Simulación de vehículos voladores en el cielo (`flyingCars`) con faros cyan de haz cónico y luces traseras rojas.

2. **Rediseño de Bloques de Suelo Modernos (`TileRenderer.js`)**:
   - **Problema**: El suelo de los niveles lucía plano y opaco, sin el estilo futurista moderno que requiere el juego.
   - **Solución**: Rediseñado el renderizado de bloques sólidos (`renderSolidTile`). Los bloques con superficie expuesta superior ahora cuentan con una franja/tapa neón brillante y micro-nodos de datos que pulsan a intervalos.
   - **Texturas Internas**: Añadidos patrones de trazo de circuito de neón y líneas diagonales de advertencia translúcidas en el interior de cada bloque.
   - **Paletas Enriquecidas**: Actualizados los colores de los escenarios; notablemente la Zona 2 (Corporate) ahora utiliza un neón rosa/magenta brillante en lugar del azul básico para hacer los niveles mucho más vibrantes y coloridos.

3. **Escudo Defensivo Neón de Alta Tecnología (`PowerManager.js`)**:
   - Se rediseñó visualmente el escudo de la **Q** (EMP Shield), reemplazando la esfera azul simple por una cresta/blasón neón de diseño angular futurista con líneas de escaneo cibernéticas horizontales que se desplazan de arriba a abajo, una rejilla vertical estática y descargas eléctricas/arcos aleatorios.

4. **Iconografía Vectorial y Cooldowns en el HUD (`HUD.js`)**:
   - Se rediseñó la sección de cooldowns en la esquina inferior izquierda. El botón de la habilidad **Q** ahora tiene forma de escudo/blasón neón, con iconos vectoriales detallados dibujados por Canvas para Q (escudo), E (persona corriendo) y R (relámpago), letras de accesos en 8px en la esquina superior izquierda, y recarga vertical de cooldowns.

5. **Advertencias de Activación y SFX de Error (`Game.js` & `SFXGenerator.js`)**:
   - Implementación del sonido procedimental `'deny'` (onda de sierra descendente de 140Hz a 90Hz) para advertir fallas de comandos.
   - Si el jugador presiona la tecla de un poder en cooldown (Q/E) o la habilidad definitiva (R) sin energía al 100%, se emite una notificación de advertencia sobre la cabeza del jugador (ej. "NEON STORM: NEED 100% ENERGY") y se reproduce el pitido de denegación.
   - Se integró la bandera `player.dashing` para sincronizar y acelerar la velocidad del ciclo de animación de carrera de las piernas del personaje durante el Phase Dash, simulando una carrera supersónica.

6. **Integración del Personaje desde Modelo 3D (`Player.js`)**:
   - Se importó la hoja de múltiples vistas (`player_sprite.png`) generada desde el modelo 3D del usuario.
   - Se implementó un **procesador de transparencia dinámico** en `Player.js` que filtra y remueve el fondo blanco original de la hoja de vistas (volviendo transparentes todos los píxeles con RGB > 240) mediante un canvas offscreen en tiempo de ejecución. Esto integra al personaje al 100% en los fondos oscuros del juego.
   - Se modificó `Player.js` para recortar y renderizar la vista de perfil (columna 4 del sprite) en tiempo real, reemplazando el dibujo de vectores original del cuerpo del jugador.
   - Se añadió un visor neón verde brillante animado sobre el casco del personaje y se mantuvieron las estelas de movimiento fantasmales (trails), los efectos de impulsión al saltar y las líneas de velocidad al correr para conservar el dinamismo visual del juego.

## [v1.0.5] - 2026-05-24

### Nuevas Características y Mejoras

1. **Skin del Personaje Adaptativa desde Spritesheet Generado (`Player.js`)**:
   - **Hoja de Sprites Integrada**: Se cargó y procesó el spritesheet de ninja generado (`ninja_spritesheet_generated.png`).
   - **Segmentación y Autocrop**: La hoja de sprites se divide automáticamente en tres partes horizontales iguales representando las poses de reposo (Idle), carrera (Run) y ataque (Attack). Cada pose se limpia de su fondo blanco (RGB > 240) y se recorta (trim) de manera precisa calculando el cuadro delimitador (bounding box) de los píxeles visibles de la skin.
   - **Máquina de Estados de Poses**: Se muestra `transparentSpriteIdle` de frente en reposo, `transparentSpriteAttack` al golpear y `transparentSpriteRun` al moverse, con giro horizontal `scale(-1, 1)` adaptado si se desplaza a la derecha.

2. **Aparición con Energía Completa (`Player.js`)**:
   - Se configuró al personaje para que inicie la partida o nivel con la energía al 100% (`maxEnergy`).

3. **Rebalanceo de Costos (Q = 40, R = 80) y Rango Neon Storm (`PowerManager.js`, `HUD.js` & `Game.js`)**:
   - **Costo Q (EMP Shield)**: La habilidad defensiva Q ahora cuesta **40 de energía**.
   - **Costo R (Neon Storm)**: La habilidad definitiva R ahora cuesta **80 de energía** (dos veces el costo de la Q) y descuenta dicho valor en lugar de vaciar la barra, permitiendo lanzar múltiples tormentas si se acumula energía.
   - **Rango Tormenta R**: Se limitó el daño de Neon Storm para que únicamente afecte a enemigos dentro de un rango de **6 bloques** (240 píxeles) de distancia del jugador, en lugar de barrer todo el mapa.
   - **HUD y Alertas**: Se actualizaron las alertas visuales y sonoras ("SHIELD: NEED 40% ENERGY" y "NEON STORM: NEED 80% ENERGY"), y se adaptaron las ranuras HUD y barra radial de la R para apagarse/atenuarse si no hay suficiente energía disponible.

4. **Tecla Rápida de Captura de Pantalla para Time-Lapse (`Game.js`)**:
   - Se añadió un escuchador para la tecla `P` que descarga una captura del lienzo en formato PNG y muestra un aviso `"CAPTURA GUARDADA"` en el centro del juego.

## [v1.0.6] - 2026-05-24

### Nuevas Características y Mejoras

1. **Fluidez de Combate y Animación de Ataque de Espada (`Player.js`)**:
   - **Lunge Físico de Combate**: Al atacar, se aplica un impulso horizontal instantáneo al ninja (`this.vx = this.facing * (this.moveSpeed * 1.2)`), permitiendo un deslizamiento/lunge de combate que hace el ataque mucho más ágil y responsivo.
   - **Estela de Espada en Media Luna (Crescent Sweep)**: Se rediseñó el dibujado del corte de espada en `_drawAttackSlash`. Reemplaza la línea rígida previa por un barrido relleno en forma de media luna con un gradiente cian translúcido y una punta blanca afilada que representa el filo térmico de la espada.
   - **Efecto de Chispas del Arma**: Añadida una lista de partículas local `this.attackParticles` que emite chispas cian brillantes de alta velocidad desde la punta de la espada durante el movimiento del tajo.

2. **Activación Única y Permanente de Checkpoints y Consolas (`Interactive.js`)**:
   - **Bloqueo de Toggle**: Modificada la interacción con los checkpoints y consolas/terminales en `interact()`. Al presionarse "F" una vez, se fuerza su estado `activated = true` de forma permanente y ya no se puede volver a apagar o alternar.
   - **Desaparición del Prompt**: El indicador visual de interacción de la tecla "F" (`showPrompt`) deja de mostrarse una vez que el checkpoint o consola ha sido activada, eliminando ruidos en pantalla.

## [v1.0.7] - 2026-05-24

### Correcciones de Bugs (Hotfixes)

1. **Uso de Estado Real de Vidas en HUD (`HUD.js` & `Game.js`)**:
   - **Problema**: El HUD leía la propiedad `player.lives` para renderizar los corazones, pero la entidad `Player` no cuenta con dicha propiedad (las vidas se gestionan en el motor `Game.js` mediante `this.lives`). Esto hacía que el contador no reflejara el número real de vidas tras morir.
   - **Solución**: Se modificó `HUD.js` para pasar `levelInfo` como argumento a `renderLives`. Ahora lee el conteo de vidas en tiempo real directamente de la propiedad `lives` enviada desde el motor de juego.

2. **Sombras Fantasmas de Botones Eliminadas (`Background.js` & assets)**:
   - **Problema**: Había siluetas de botones grises de la interfaz anterior dibujadas detrás de los botones de habilidades (Q, E, R), causando una superposición de interfaces sucia.
   - **Solución**: Se identificó que las sombras grises estaban impresas directamente en el archivo de imagen de fondo `cyberpunk_bg.jpg`. Se editó la imagen eliminando esas siluetas e integrando limpiamente la ciudad cyberpunk en esa esquina. Las imágenes `cyberpunk_bg.jpg` y `cyberpunk_bg.png` en los assets del juego fueron actualizadas.

### Nuevas Características y Mejoras

1. **Reubicación de Vidas (Corazones) en el HUD (`HUD.js`)**:
   - Se trasladaron los tres corazones de vida desde la esquina inferior derecha a la esquina superior izquierda, ubicándolos justo debajo de la barra de energía (`y = 78`).
   - Se añadió una etiqueta de texto `"LIVES"` en gris de sistema para rotular la vida de manera clara e intuitiva.
   - Los corazones de vida se dibujan un poco más grandes (`16px`), con brillo de neón rosa intenso (`#ff00aa`) en los activos, y un contorno rosa opaco muy tenue (`rgba(255, 0, 170, 0.15)`) para los corazones perdidos, mejorando enormemente la visibilidad del estado de supervivencia.

2. **Extensión del Suelo hasta el Fondo de Pantalla (`TileRenderer.js`)**:
   - Se agregó la detección de bloques sólidos (tipo 1) y de peligro (tipo 3) que se sitúan como la base inferior de su columna respectiva (`isBottomMost`).
   - En lugar de dejar un vacío parallax por debajo de los bloques inferiores, se rellena de forma sólida hacia abajo hasta el final de la pantalla (`cameraY + viewHeight`) con el color interno del bloque de la zona respectiva (`colors.fillInner`) matizado por una sombra para dar profundidad.
   - Si los lados de la columna están expuestos, las líneas de borde de neón brillante también se extienden verticalmente hasta el final de la pantalla. Se suprimió la línea de neón inferior en los bloques que se extienden para mantener la fluidez visual del terreno.

## [v1.0.8] - 2026-05-24

### Correcciones de Bugs (Hotfixes)

1. **Hitbox de Bocina de Audio en el Motor (`Game.js`)**:
   - **Problema**: Tras mover el botón de silencio a la esquina inferior derecha, los clics del mouse en la nueva posición no hacían nada, ya que la lógica de clics seguía ligada a la coordenada original en la esquina superior izquierda.
   - **Solución**: Se actualizaron las coordenadas de la función `checkMuteButtonClick` para detectar clics en los nuevos límites X: [1225, 1265], Y: [655, 695].

### Nuevas Características y Mejoras

1. **Suelo Texturizado y Acoplado Completo (`TileRenderer.js`)**:
   - Se reemplazó el relleno negro plano de la extensión del suelo por un bucle vertical que dibuja bloques de terreno de `TILE_SIZE` (40px) repetidos de forma fluida.
   - Cada bloque subterráneo mantiene el gradiente de iluminación, relieve tridimensional, rejilla metálica y marcas tecnológicas de circuito de los bloques sólidos de la superficie.
   - Se integró un multiplicador de sombra progresivo en función de la profundidad para difuminar los bloques gradualmente hacia el negro a medida que descienden, creando una transición espacial muy inmersiva.

2. **Rediseño Minimalista del Botón de Silencio (`HUD.js`)**:
   - Se removió por completo el contenedor rectangular de fondo negro opaco y su borde neón de la bocina, logrando un icono flotante limpio.
   - Se eliminó el texto de soporte `[M] MUTE` debajo del icono para un diseño minimalista cyberpunk libre de distracciones.
   - Se trasladó el icono de la bocina a la esquina inferior derecha (`x = 1225, y = 655`), aprovechando el espacio liberado por los corazones de vidas.

## [v1.0.9] - 2026-05-24

### Correcciones de Bugs (Hotfixes)

1. **Coleccionables Atascados en Columnas (`LevelData.js`)**:
   - **Problema**: En la generación procedimental de secciones de muros altos, los chips de energía se creaban incrustados dentro del bloque sólido superior de la columna, impidiendo su recolección.
   - **Solución**: Se corrigió el cálculo de la coordenada Y de spawn en `LevelData.js`, cambiándolo a `height - 2 - wallHeight`. Ahora, los coleccionables se generan flotando libremente en el aire exactamente un bloque de rejilla por encima de la columna.

### Nuevas Características y Mejoras

1. **Variabilidad y 3 Diseños de Drones de Patrulla (`DronePatrol.js`)**:
   - Se implementó la propiedad `this.variant` basada en la posición de spawn del dron, distribuyendo de forma secuencial y automática 3 variantes visuales:
     - **Variante 0: Dron de Combate**: El cuerpo elíptico clásico en púrpura oscuro (`#2a1a2e`), dos hélices/rotores laterales neón magenta (`#ff00aa`), ojo de disparo rojo y proyectiles magenta.
     - **Variante 1: Dron de Reconocimiento**: Un chasis aerodinámico en forma de diamante azul oscuro (`#10202e`), un rotor superior único estilo helicóptero neón cian (`#00f0ff`), ojo de disparo cian y proyectiles cian.
     - **Variante 2: Dron Centinela**: Un cuerpo esférico dorado (`#2e2610`), soporte en forma de X de cuatro brazos con mini-propulsores neón amarillo (`#ffe600`), sensor vertical naranja y proyectiles amarillos.
   - Se acopló el color de disparo de los proyectiles (`return.color`) para coincidir con la paleta de colores de la variante del dron emisor.

2. **Variabilidad de Colores en Drones Hackers (`HackerDrone.js`)**:
   - Se aplicó la propiedad `this.variant` en `HackerDrone.js` para alternar entre 3 colores de chasis, campos de fuerza y partículas flotantes:
     - Variante 0: Verde neón clásico (`#00ff88`).
     - Variante 1: Cian neón (`#00f0ff`).
     - Variante 2: Violeta neón (`#8b5cf6`).

3. **Desbloqueo Completo de los 20 Niveles (`LevelManager.js`)**:
   - Se forzó el desbloqueo permanente de todas las etapas en el constructor y el cargador de progreso de `LevelManager.js`.
   - Todos los niveles de las cuatro zonas del juego (Neon Streets, Cyber Grid, Glitch Sector, Singularity Core) están disponibles en la pantalla de selección desde el primer momento para su revisión.

## [v1.1.0] - 2026-05-24

### Nuevas Características y Mejoras

1. **Implementación de Modelos de Drones Cyberpunk Personalizados (`DronePatrol.js` & `HackerDrone.js`)**:
   - Reemplazado el dibujado básico de Canvas por los tres nuevos conceptos aprobados por el usuario para los enemigos voladores:
     - **Modelo A: Viper-X Combat Drone (Variante 0 - Magenta)**: Dibujado con un chasis poligonal aerodinámico con punta direccional, estabilizadores/alerones frontales barridos hacia adelante, cañones dobles suspendidos inferiores y propulsores neón magenta.
     - **Modelo B: Ocular Sentinel Drone (Variante 1 - Cian)**: Estructura esférica rodeada de placas de armadura concéntricas en arco, aletas de dirección laterales cian neón y un gran lente holográfico cian de sensor de disparo en el centro.
     - **Modelo C: Scavenger Quad Drone (Variante 2 - Amarillo)**: Chasis rectangular mecánico compacto con patrones de franjas amarillas de peligro ("caution stripes"), antenas dobles curvas tipo insecto con puntas brillantes y cuatro brazos rotores con palas giratorias en cada esquina.
   - **Variantes de Drones Hackers**: Se adaptaron las 3 variantes de `HackerDrone` para usar estos mismos 3 patrones de diseño (diamante con estabilizadores para Verde, esférico con anillos orbitales para Cian, y rectangular modular con 4 nodos flotantes para Púrpura).

2. **Organización del Historial de Imágenes y Actualizaciones (`images/`)**:
   - Creado un directorio dedicado `/images` en la raíz del proyecto para centralizar todas las imágenes, capturas y conceptos de la evolución y actualizaciones del juego.
   - Copiados los nuevos conceptos de drones (`viper_combat_drone.png`, `ocular_sentinel_drone.png`, `scavenger_quad_drone.png`) al directorio de assets e imágenes del proyecto para mantener el historial intacto para el video de evolución futura.

## [v1.1.1] - 2026-05-24

### Correcciones de Bugs y Limpieza Visual

1. **Limpieza de Ruido y Siluetas en el Fondo (`Background.js`)**:
   - **Problema**: Las siluetas y edificios planos dibujados en `Background.js` sobre el fondo de parallax de la Zona 1 (Lower Slums) y la Zona 2 (Corporate Grid) generaban columnas verticales grises/azules tenues que se confundían fácilmente con las plataformas y paredes reales de la partida.
   - **Solución**: Se deshabilitó el dibujado procedural de estas siluetas/torres planas. El fondo de parallax ahora utiliza de forma limpia y exclusiva la imagen 3D de alta definición `cyberpunk_bg.jpg` (y sus reflejos), maximizando la claridad visual del nivel.

2. **Remoción de Cables de Decoración en la Rejilla (`TileRenderer.js`)**:
   - **Problema**: Los cables horizontales de neón (decoraciones tipo 4) flotaban a nivel de fondo de la cuadrícula del mapa, lo que recordaba al arte vectorial primitivo y sumaba ruido visual innecesario en la Zona 1 y Zona 2.
   - **Solución**: Se desactivó el renderizado de estas decoraciones flotantes para lograr un entorno más moderno y estilizado.

3. **Sincronización del Registro de Evolución de Imágenes (`images/`)**:
   - Se copiaron todas las nuevas capturas de pantalla tomadas durante el desarrollo y los sprites transparentes generados para los drones (`media__1779603*.png` y `*_drone_sprite_1779603*.png`) a la carpeta centralizada `/images/`, completando la galería de evolución del juego.

## [v1.1.2] - 2026-05-24

### Correcciones de Texturas, Plataformas, Spawns del Suelo y Enemigos

1. **Limpieza de Fondos y Eliminación de Pixelado de Drones**:
   - **Problema**: El procesamiento previo por umbral de distancia global de color causaba que el algoritmo de remoción de fondo penetrara en los chasis de los drones Viper-X y Scavenger Quad, dejándolos con huecos transparentes. Por otro lado, usar umbrales muy bajos dejaba una caja negra/azul sólida y opaca alrededor del dron, bloqueando la visibilidad del parallax de fondo. Además, los sprites de 1024x1024 se veían muy pixelados al escalarse directamente a 56x44 en el canvas, y existían píxeles de ruido sólido en los bordes de las imágenes originales que estiraban el área de recorte y formaban recuadros oscuros.
   - **Solución**: Rediseñado el procesamiento de assets implementando un limpiador de bordes incondicional (25px) y una condición por rangos de canal individuales (`R < 55 && G < 85 && B < 105`) en `clean_drones_custom_bfs.ps1`. Adicionalmente, se programó un sistema de **pre-escalado de alta calidad (mipmapping)** en `makeTransparent` y `makeTransparentTinted` dentro de `DronePatrol.js` y `HackerDrone.js` que reduce los sprites a un máximo de 256px durante la carga inicial con suavizado de imagen de alta calidad, erradicando por completo el pixelado y el aliasing en partida.
   - **Copias de Historial**: Se guardaron los nuevos sprites transparentes con marca de tiempo en la carpeta `/images/`.

2. **Distribución de 8 Drones en el Nivel 1 (`LevelData.js`)**:
   - **Problema**: Los drones de prueba del Nivel 1 aparecían agrupados muy cerca al principio de la partida.
   - **Solución**: Limpiados los drones de patrulla generados de forma aleatoria/automática en el Nivel 1 y colocados **8 drones** distribuidos uniformemente por todo el mapa (desde la columna X = 12 hasta X = 100, aproximadamente cada 13 bloques), garantizando que patrullen a lo largo de todo el recorrido del nivel.
   - **Asignación Explícita de Variantes (`Game.js`, `DronePatrol.js`, `HackerDrone.js`)**: Se modificó el loop de generación de enemigos en el motor y los constructores de drones para aceptar un parámetro de variante opcional. Esto nos permite forzar de manera explícita que las 8 patrullas del Nivel 1 sigan una secuencia balanceada (0, 1, 2, 0, 1, 2, 0, 1) alternando Viper-X, Ocular Sentinel y Scavenger Quad.

3. **Rediseño de Plataformas Unidireccionales (`TileRenderer.js`)**:
   - **Problema**: Los peldaños de salto (tipo de bloque 2) anexados a los muros verticales de los pilares eran líneas finas de apenas 4 píxeles de alto con cuerpo transparente/vacío, lo que los hacía lucir como fallas visuales de la grilla o espacios huecos ilegibles ("vacio"), en lugar de puntos seguros de salto.
   - **Solución**: Rediseñado el método `renderOneWayPlatform` en `TileRenderer.js` para dibujar mini-plataformas holográficas metálicas robustas con un espesor de 10px. Se incorporó una base interior sólida (`fillInner`), bordes neon superior/inferior vibrantes con shadow blur intenso, brackets de anclaje diagonales a los extremos y un tramado central de líneas cibernéticas de advertencia (caution hashing), haciéndolos altamente reconocibles y sumamente estéticos.

4. **Corrección de Cuadros Vacíos en el Suelo (`LevelData.js`)**:
   - **Problema**: Aparecían bloques oscuros o "cuadros sin textura" recortados en la superficie del suelo de forma regular.
   - **Causa**: Al final del generador `buildStandardLevel` de `LevelData.js`, un bucle forzado colocaba baldosas de tipo de decoración `4` (que no se renderiza) cada 8 bloques en la fila `height - 3`. Si el suelo en esa columna estaba elevado a `height - 3` (como en escalones o bases de terminales), la baldosa sólida tipo `1` era sobrescrita por el tipo `4` vacío, recortando un agujero negro de 40x40 en el suelo.
   - **Solución**: Se eliminó por completo el bucle de generación de baldosas decorativas de tipo `4` en `LevelData.js`, ya que están desactivadas visualmente en el renderizador, eliminando el bug de los agujeros negros en el suelo y devolviéndole su textura sólida e ininterrumpida.

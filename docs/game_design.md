# NEON RUNNER — Documento de Diseño de Juego (GDD)

## 1. Premisa e Historia
* **Año**: 2087
* **Lugar**: Neo-City, una metrópolis futurista dominada por cuatro mega-corporaciones autoritarias.
* **Protagonista**: **NEON**, un cyber-runner rebelde equipado con implantes biomecánicos y habilidades de hackeo en tiempo real.
* **Misión**: Infiltrarse en las bases de datos corporativas a través de 20 sectores de alta seguridad para recuperar núcleos de datos desencriptados y liberar la ciudad del control corporativo.

---

## 2. Estilo Visual y Estética
* **Vectores de Alta Definición**: Gráficos vectoriales nativos renderizados mediante la API Canvas de HTML5. Sin pixel-art.
* **Neon Glow & Bloom**: Efectos de luminiscencia en tiempo real en los bordes expuestos del mapa, el personaje, enemigos y disparos.
* **Paleta Cyberpunk Tailored**:
  - **Fondo**: `#0a0a0f` (Negro abisal) y `#0d1b2a` (Azul medianoche)
  - **Aliados / Player**: `#00f0ff` (Cyan Neón)
  - **Amenazas / Enemigos**: `#ff00aa` (Magenta Neón)
  - **Energía / Items**: `#ffe600` (Amarillo Neón)
  - **Poderes Especiales**: `#8b5cf6` (Violeta Eléctrico)
  - **Terminales / Interactivos**: `#00ff88` (Verde Matriz)

---

## 3. Controles del Juego

| Tecla / Input | Acción | Descripción |
|---|---|---|
| **W** / **ArrowUp** | Saltar / Doble Salto | Permite realizar un salto vertical y un segundo salto impulsado por propulsores. |
| **A** / **ArrowLeft** | Mover Izquierda | Aceleración progresiva hacia la izquierda con fricción física. |
| **S** / **ArrowDown** | Bajar plataforma | Permite deslizarse y atravesar plataformas de una sola vía (tipo 2). |
| **D** / **ArrowRight** | Mover Derecha | Aceleración progresiva hacia la derecha con fricción física. |
| **Espacio** | Saltar | Alternativa para realizar saltos y dobles saltos. |
| **Click Izquierdo** / **J** | Ataque | Tajo cuerpo a cuerpo con espada de energía de corto alcance. |
| **Q** | EMP Shield (Poder 1) | Activa un escudo de energía cyan de 2 segundos que refleja proyectiles enemigos. Cooldown: 8s. |
| **E** | Phase Dash (Poder 2) | Dash horizontal corto en estado de intangibilidad que atraviesa enemigos y trampas. Cooldown: 5s. |
| **R** | Neon Storm (Especial) | Descarga eléctrica masiva AOE que daña a todos los enemigos presentes. Requiere barra de energía al 100%. |
| **F** | Interactuar / Hackear | Hackea terminales de seguridad para abrir puertas láser o activar checkpoints. |
| **M** | Silenciar Música | Alterna la música de fondo procedimental sin silenciar los efectos de sonido (SFX). |
| **ESC** | Pausar | Detiene el loop de juego y abre el menú de pausa. |

---

## 4. Estructura de Zonas y Niveles (20 Niveles)

El juego se divide en 4 grandes sectores lógicos, cada uno con su propio estilo musical procedimental, decoraciones y enemigos temáticos:

### 🏙️ Sector 1: Neon Streets (Niveles 1-5)
*Las zonas más bajas de Neo-City. Humedad constante, lluvia ácida y carteles publicitarios descoloridos.*
* **Jefe final**: **WARDEN-X1** (Robot centinela blindado).

### 🏢 Sector 2: Corporate Towers (Niveles 6-10)
*Interiores de cristal y acero. Rascacielos corporativos de alta seguridad tecnológica con defensas automatizadas.*
* **Jefe final**: **NEXUS-CORE** (La supercomputadora central y sus enjambres defensivos).

### ⚡ Sector 3: The Grid (Niveles 11-15)
*La red de datos virtuales. Un paisaje de información desmaterializado donde las plataformas aparecen y desaparecen.*
* **Jefe final**: **MALWARE-ZERO** (Un virus de datos inestable y distorsionante).

### 🌃 Sector 4: Sky Fortress (Niveles 16-20)
*La base orbital secreta en los límites de la atmósfera. Baja gravedad y defensas mecha experimentales.*
* **Jefe final**: **OMEGA CORE** (El mecha orbital definitivo controlado por el CEO principal).

---

## 5. Glosario de Enemigos e Inteligencia Artificial

1. **Drone Patrulla (Esfera Cyan/Magenta)**: Vuela horizontalmente patrullando su zona y dispara ráfagas dirigidas al jugador cada 2.5 segundos.
2. **Security Bot (Robot Bípedo)**: Patrulla plataformas terrestres. Si detecta al jugador, se alarma y embiste a gran velocidad con su escudo corporal.
3. **Turret (Torreta de techo/pared)**: Detecta al jugador a distancia media y dispara ráfagas de 3 proyectiles de plasma de alta velocidad tras cargar.
4. **Hacker Drone (Hexágono Verde)**: Flota en un patrón sinusoidal. Emite ondas de hackeo que alteran las plataformas del jugador.
5. **Glitch Entity (Forma Distorsionada)**: Enemigo de la red virtual que se teletransporta aleatoriamente e interactúa erráticamente.
6. **Mech Soldier (Cyborg Pesado)**: Soldado de élite de la fortaleza aérea con armadura gruesa, ataques de plasma y golpes contundentes.

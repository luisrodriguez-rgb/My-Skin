import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalPosition } from "@tauri-apps/api/window";
import {
  initRoamingSystem,
  togglePinMode,
  getFacingDirection,
  setFacingDirection,
  getIsPinned,
  setRoamingAlertState,
  syncPositionAfterUserDrag,
  setIsDragging,
  moveWindowBy,
  clampWindowPosition,
  updateWindowCoordinates,
  getWindowPosition,
  shiftWindowUpForController,
  restoreWindowAfterController,
} from "./roaming";
import { audioEngine } from "./audio";
import { pomodoroEngine, PomodoroPhase } from "./pomodoro";
import { academicSyncService } from "./syncService";
import { githubMonitor } from "./githubMonitor";

// --- TIPOS DEL SISTEMA DE SKINS ---
export type PetStateName =
  | "IDLE"
  | "WALK"
  | "ALERT_SEMESTRE"
  | "VICTORY_GITHUB"
  | "FOCUS"
  | "SLEEP";

interface StateConfig {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  nextState?: PetStateName;
}

interface SkinDialogues {
  alert?: string;
  victory?: string;
  focus?: string;
  break?: string;
  sleep?: string;
}

interface SkinManifest {
  id: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  anchorY: number;
  personalityPrompt: string;
  dialogues?: SkinDialogues;
  states: Record<PetStateName, StateConfig>;
}

// --- CONFIGURACIÓN DEL CANVAS ---
const canvas = document.getElementById("pet-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

const CANVAS_WIDTH = 300;
const CANVAS_HEIGHT = 240;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// CRÍTICO: Desactivar el suavizado para mantener Pixel Art puro al escalar
ctx.imageSmoothingEnabled = false;

// --- VARIABLES GLOBALES DE ESTADO Y HIT-TEST ---
let isCurrentlyIgnoring = true;
const ALPHA_THRESHOLD = 20;

let activeManifest: SkinManifest | null = null;
let spriteImage: HTMLImageElement | null = null;

// Variables de la Máquina de Estados Finitos (FSM)
let currentState: PetStateName = "IDLE";
let currentFrameIndex = 0;
let lastFrameTimestamp = 0;

// Detección de inactividad (Modo Siesta / SLEEP)
let lastUserInteractionTime = Date.now();
const IDLE_SLEEP_TIMEOUT_MS = 120000; // 2 minutos sin actividad

function recordUserActivity() {
  lastUserInteractionTime = Date.now();
  if (currentState === "SLEEP") {
    // Despertar al interactuar
    setPetState("IDLE");
  }
}

// Estado del globo de notificación (Web del semestre / GitHub)
let activeNotification: { title: string; subtitle: string; urgent: boolean } | null = null;

/**
 * 1. Cargador dinámico de Skins (lee el manifest.json y la textura PNG)
 */
export async function loadSkin(skinFolder: string) {
  try {
    const res = await fetch(`/skins/${skinFolder}/manifest.json`);
    activeManifest = (await res.json()) as SkinManifest;

    const img = new Image();
    img.src = `/skins/${skinFolder}/spritesheet.png`;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    spriteImage = img;
    setPetState("IDLE");
    drawCurrentStateToCanvas();
    syncCardInfo();
    console.log(`[MySkin] Skin "${activeManifest.name}" cargado exitosamente.`);
  } catch (err) {
    console.error(`Error al cargar el skin "${skinFolder}":`, err);
  }
}

/**
 * 2. Cambiar de estado en la Máquina de Estados (FSM)
 */
export function setPetState(
  newState: PetStateName,
  notification?: { title: string; subtitle: string; urgent?: boolean }
) {
  if (!activeManifest || !activeManifest.states[newState]) return;

  // Si ya estamos en el mismo estado y no hay notificación nueva, evitar reiniciar fotograma
  if (currentState === newState && !notification) {
    return;
  }

  // Desencadenar efectos sonoros retro según el estado
  if (newState === "ALERT_SEMESTRE") {
    audioEngine.playAlert();
  } else if (newState === "VICTORY_GITHUB") {
    audioEngine.playVictory();
  } else if (newState === "FOCUS") {
    audioEngine.playFocus();
  } else if (newState === "SLEEP") {
    audioEngine.playSleep();
  }

  currentState = newState;
  currentFrameIndex = 0;
  lastFrameTimestamp = performance.now();

  if (notification) {
    setRoamingAlertState(true);
    activeNotification = {
      title: notification.title,
      subtitle: notification.subtitle,
      urgent: notification.urgent ?? false,
    };
  } else if (newState === "IDLE") {
    setRoamingAlertState(false);
    activeNotification = null;
  }

  drawCurrentStateToCanvas();
  syncActionButtons(newState);
}

/**
 * 3. Dibuja el Sprite + el Globo de Notificación y actualiza la máscara Alpha
 */
function drawCurrentStateToCanvas() {
  if (!activeManifest || !spriteImage) return;

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.imageSmoothingEnabled = false;

  const stateCfg = activeManifest.states[currentState];
  const { frameWidth, frameHeight, scale, anchorY } = activeManifest;

  // Coordenadas de recorte dentro del spritesheet.png
  const sourceX = currentFrameIndex * frameWidth;
  const sourceY = stateCfg.row * frameHeight;

  // Tamaño final escalado en pantalla (ej. 64 * 2 = 128x128 px)
  const destWidth = frameWidth * scale;
  const destHeight = frameHeight * scale;
  const destX = Math.floor((CANVAS_WIDTH - destWidth) / 2);
  const destY = anchorY;

  // Guardar caja envolvente del personaje para optimizar hit-testing en O(1)
  characterBoundingBox = {
    minX: destX,
    maxX: destX + destWidth,
    minY: destY,
    maxY: destY + destHeight,
  };

  // Inversión horizontal sobre el eje central si el personaje camina hacia la izquierda
  ctx.save();
  if (getFacingDirection() === -1) {
    ctx.translate(CANVAS_WIDTH, 0);
    ctx.scale(-1, 1);
  }

  // Dibujar el frame exacto del personaje
  ctx.drawImage(
    spriteImage,
    sourceX,
    sourceY,
    frameWidth,
    frameHeight,
    destX,
    destY,
    destWidth,
    destHeight
  );

  // Restaurar el contexto ANTES del globo para que el texto no quede invertido
  ctx.restore();

  // Si hay una notificación activa (ej. Entrega del semestre o Push en GitHub), dibujamos el globo
  if (activeNotification) {
    drawPixelSpeechBubble(
      activeNotification.title,
      activeNotification.subtitle,
      activeNotification.urgent
    );
  }
}

/**
 * 4. Dibuja un globo de diálogo con estética Pixel Art directamente en el Canvas
 */
function drawPixelSpeechBubble(title: string, subtitle: string, urgent: boolean) {
  const bx = 16;
  const by = 8;
  const bw = 268;
  const bh = 68;

  // Borde exterior negro (estilo retro 8-bits)
  ctx.fillStyle = "#090B10";
  ctx.fillRect(bx - 4, by - 4, bw + 8, bh + 8);

  // Borde interior de color según urgencia
  ctx.fillStyle = urgent ? "#E63946" : "#FFD000";
  ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);

  // Fondo oscuro del globo
  ctx.fillStyle = "#141824";
  ctx.fillRect(bx, by, bw, bh);

  // Pico del globo apuntando al personaje abajo
  ctx.fillStyle = "#090B10";
  ctx.fillRect(142, by + bh + 4, 16, 8);
  ctx.fillStyle = "#141824";
  ctx.fillRect(144, by + bh, 12, 8);

  // Textos de la notificación
  ctx.fillStyle = urgent ? "#FF6B6B" : "#FFD000";
  ctx.font = "bold 11px monospace";
  ctx.fillText(title.slice(0, 32), bx + 10, by + 20);

  ctx.fillStyle = "#F1FAEE";
  ctx.font = "10px monospace";
  ctx.fillText(subtitle.slice(0, 36), bx + 10, by + 40);

  // Pequeño indicador para descartar con clic
  ctx.fillStyle = "#8D99AE";
  ctx.font = "9px monospace";
  ctx.fillText("[Clic para descartar]", bx + 10, by + 58);
}

/**
 * 5. Bucle del Motor de Animación (corre sincronizado con requestAnimationFrame)
 */
function animationLoop(timestamp: number) {
  if (activeManifest && spriteImage) {
    const stateCfg = activeManifest.states[currentState];
    const frameDurationMs = 1000 / stateCfg.fps;

    // Solo avanzamos de frame cuando se cumple el tiempo exacto de los FPS del estado
    if (timestamp - lastFrameTimestamp >= frameDurationMs) {
      lastFrameTimestamp = timestamp;
      currentFrameIndex++;

      // Sonido de pasos suave al caminar
      if (currentState === "WALK" && (currentFrameIndex === 1 || currentFrameIndex === 4)) {
        audioEngine.playStep();
      }

      if (currentFrameIndex >= stateCfg.frames) {
        if (stateCfg.loop) {
          currentFrameIndex = 0;
        } else {
          // Si no es loop (ej. celebración de GitHub), transiciona al estado siguiente
          setPetState(stateCfg.nextState || "IDLE");
        }
      }

      // Redibujamos el Canvas y actualizamos el mapa Alpha únicamente al cambiar de frame
      drawCurrentStateToCanvas();
    }
  }

  requestAnimationFrame(animationLoop);
}

// Caja envolvente del personaje activo en pantalla para descarte O(1)
let characterBoundingBox = {
  minX: 0,
  maxX: CANVAS_WIDTH,
  minY: 0,
  maxY: CANVAS_HEIGHT,
};

// --- HIT-TEST OPTIMIZADO (O(1) BOUNDING BOX + MUESTREO PUNTUAL BAJO DEMANDA) ---
// Cero asignaciones en memoria por frame. Solo extrae un parche de 17x17 px cuando el cursor toca la caja del personaje.
function isHoveringCharacter(x: number, y: number): boolean {
  if (
    x < characterBoundingBox.minX - 8 ||
    x > characterBoundingBox.maxX + 8 ||
    y < characterBoundingBox.minY - 8 ||
    y > characterBoundingBox.maxY + 8
  ) {
    return false;
  }

  const startX = Math.max(0, Math.floor(x - 8));
  const startY = Math.max(0, Math.floor(y - 8));
  const patchWidth = Math.min(CANVAS_WIDTH - startX, 17);
  const patchHeight = Math.min(CANVAS_HEIGHT - startY, 17);

  if (patchWidth <= 0 || patchHeight <= 0) return false;

  const patch = ctx.getImageData(startX, startY, patchWidth, patchHeight).data;
  for (let i = 3; i < patch.length; i += 4) {
    if (patch[i] > ALPHA_THRESHOLD) {
      return true;
    }
  }
  return false;
}

/**
 * Determina si las coordenadas del cursor (relativas a la ventana)
 * caen sobre un elemento interactuable (panel de control abierto o pixel del personaje).
 */
function isCursorOverInteractable(windowX: number, windowY: number): boolean {
  // 1. Si el panel de control está abierto, TODA la ventana es interactuable (nunca ignorar cursor)
  if (debugPanel && !debugPanel.classList.contains("hidden")) {
    return true;
  }

  // 2. Si el cursor está sobre el canvas del personaje
  const canvasRect = canvas.getBoundingClientRect();
  if (
    windowX >= canvasRect.left &&
    windowX <= canvasRect.right &&
    windowY >= canvasRect.top &&
    windowY <= canvasRect.bottom
  ) {
    const canvasX = (windowX - canvasRect.left) * (CANVAS_WIDTH / canvasRect.width);
    const canvasY = (windowY - canvasRect.top) * (CANVAS_HEIGHT / canvasRect.height);

    // Si hay notificación activa sobre el globo
    if (activeNotification && canvasY < 84 && canvasX >= 15 && canvasX <= 285) {
      return true;
    }

    // Comprobación de colisión precisa sobre el sprite (O(1) descarte + 1 parche pequeño)
    if (isHoveringCharacter(canvasX, canvasY)) {
      return true;
    }
  }

  return false;
}

/**
 * Sondeo adaptativo de posición del cursor:
 * - 10 Hz (100ms) cuando el cursor está fuera de la ventana (ahorra 70% de llamadas IPC a Rust).
 * - 33 Hz (30ms) cuando el cursor entra en la ventana para interacción fluida.
 * - Pausado a 8 Hz (120ms) sin llamadas IPC cuando el panel está abierto o se arrastra la ventana.
 */
async function adaptiveHitTestLoop() {
  let nextDelay = 30;

  if (isMouseDragging) {
    window.setTimeout(adaptiveHitTestLoop, 100);
    return;
  }

  // Si el panel de control está abierto, NUNCA ignorar eventos de cursor y pausar sondeo IPC
  if (debugPanel && !debugPanel.classList.contains("hidden")) {
    if (isCurrentlyIgnoring) {
      isCurrentlyIgnoring = false;
      await invoke("set_ignore_cursor", { ignore: false });
    }
    window.setTimeout(adaptiveHitTestLoop, 120);
    return;
  }

  try {
    const pos = await invoke<{ x: number; y: number; inside: boolean }>("get_cursor_rel_pos");

    if (!pos.inside) {
      if (!isCurrentlyIgnoring) {
        isCurrentlyIgnoring = true;
        await invoke("set_ignore_cursor", { ignore: true });
      }
      nextDelay = 100; // Cursor fuera de la ventana: frecuencia reducida a 10 Hz
    } else {
      nextDelay = 30; // Cursor dentro: alta reactividad (33 Hz) para clics y hover
      const isInteractable = isCursorOverInteractable(pos.x, pos.y);
      const shouldIgnore = !isInteractable;

      if (shouldIgnore !== isCurrentlyIgnoring) {
        isCurrentlyIgnoring = shouldIgnore;
        await invoke("set_ignore_cursor", { ignore: shouldIgnore });
        canvas.style.cursor = isInteractable ? "pointer" : "default";
      }
    }
  } catch (err) {
    console.debug("Hit-test poll info:", err);
    nextDelay = 200;
  }

  window.setTimeout(adaptiveHitTestLoop, nextDelay);
}

// --- SISTEMA ROBUSTO DE ARRASTRE DIRECTO CON EL MOUSE (DRAG & DROP) ---
let isMouseDragging = false;
let dragStartMouseX = 0;
let dragStartMouseY = 0;
let dragStartWinX = 0;
let dragStartWinY = 0;

canvas.addEventListener("pointerdown", async (e) => {
  if (e.button !== 0) return;
  recordUserActivity();

  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  // 1. Si hizo clic en la parte superior (donde está el globo de alerta), descartamos la alerta
  if (activeNotification && clickY < 84) {
    setRoamingAlertState(false);
    setPetState("IDLE");
    drawCurrentStateToCanvas();
    return;
  }

  // 2. Comprobar si hizo clic sobre el cuerpo del personaje
  const hitCharacter = isHoveringCharacter(clickX, clickY);
  if (!hitCharacter) return;

  try {
    canvas.setPointerCapture(e.pointerId);
  } catch (_) {}

  isMouseDragging = true;
  setIsDragging(true);
  dragStartMouseX = e.screenX;
  dragStartMouseY = e.screenY;

  const currentPos = getWindowPosition();
  dragStartWinX = currentPos.x;
  dragStartWinY = currentPos.y;

  // Asegurar que no se ignoren eventos mientras el usuario arrastra
  isCurrentlyIgnoring = false;
  try {
    await invoke("set_ignore_cursor", { ignore: false });
  } catch (_) {}
});

// Doble clic sobre el personaje: abre o cierra el panel de control
canvas.addEventListener("dblclick", async (e) => {
  e.preventDefault();
  recordUserActivity();

  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  const hitCharacter = isHoveringCharacter(clickX, clickY);
  if (hitCharacter) {
    const isHidden = debugPanel?.classList.contains("hidden") ?? true;
    await setControllerVisibility(isHidden);
  }
});

window.addEventListener("pointermove", async (e) => {
  recordUserActivity();
  if (!isMouseDragging) return;

  const deltaX = e.screenX - dragStartMouseX;
  const deltaY = e.screenY - dragStartMouseY;

  if (Math.abs(deltaX) > 2) {
    setFacingDirection(deltaX > 0 ? 1 : -1);
    setPetState("WALK");
  }

  const clamped = clampWindowPosition(dragStartWinX + deltaX, dragStartWinY + deltaY);
  updateWindowCoordinates(clamped.x, clamped.y);

  if (mainAppWindow) {
    try {
      await mainAppWindow.setPosition(new LogicalPosition(Math.round(clamped.x), Math.round(clamped.y)));
    } catch (err) {
      console.debug("Error en arrastre de ventana:", err);
    }
  }
});

window.addEventListener("pointerup", (e) => {
  if (isMouseDragging) {
    isMouseDragging = false;
    setIsDragging(false);
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch (_) {}
    syncPositionAfterUserDrag();
    setPetState("IDLE");
  }
});

// Comprobación periódica de inactividad (Modo Siesta / SLEEP tras 2 minutos)
setInterval(() => {
  if (
    currentState === "IDLE" &&
    getIsPinned() &&
    pomodoroEngine.getPhase() !== "focus" &&
    Date.now() - lastUserInteractionTime > IDLE_SLEEP_TIMEOUT_MS
  ) {
    const sleepDialogue = activeManifest?.dialogues?.sleep || "Modo reposo activado... zZ...";
    setPetState("SLEEP", {
      title: "MODO REPOSO",
      subtitle: sleepDialogue.slice(0, 36),
      urgent: false,
    });
  }
}, 5000);

// Iniciar aplicación
loadSkin("spartan").then(() => {
  initRoamingSystem();
});
requestAnimationFrame(animationLoop);
adaptiveHitTestLoop();

// Iniciar servicios en segundo plano (Fase 2: Académico y GitHub)
academicSyncService.startPeriodicCheck(60);
githubMonitor.startPolling(180);

academicSyncService.subscribe((deadline, timeRemaining) => {
  const customAlert = activeManifest?.dialogues?.alert || `${deadline.course}: ${deadline.title}`;
  setPetState("ALERT_SEMESTRE", {
    title: `ENTREGA: ${timeRemaining.toUpperCase()}`,
    subtitle: customAlert.slice(0, 36),
    urgent: deadline.urgent,
  });
});

githubMonitor.subscribe({
  onMerge: (event) => {
    const customVic = activeManifest?.dialogues?.victory || `PR #${event.prNumber} mergeada con exito`;
    setPetState("VICTORY_GITHUB", {
      title: `GITHUB: PR #${event.prNumber} MERGED`,
      subtitle: customVic.slice(0, 36),
      urgent: false,
    });
  },
  onCommit: (commit) => {
    setPetState("IDLE", {
      title: `COMMIT: ${commit.sha}`,
      subtitle: commit.message.slice(0, 36),
      urgent: false,
    });
  },
});

// --- PRUEBA RÁPIDA EN CONSOLA Y MÉTODOS GLOBALES ---
(window as any).testAlert = () => {
  const next = academicSyncService.getNextUrgentDeadline();
  const timeStr = next ? academicSyncService.formatRemainingTime(next.dueAt) : "1h 45m";
  const customMsg = activeManifest?.dialogues?.alert || (next ? `${next.course} - ${next.title}` : "Lab. Física - Circuitos RC");
  setPetState("ALERT_SEMESTRE", {
    title: `ENTREGA: ${timeStr.toUpperCase()}`,
    subtitle: customMsg.slice(0, 36),
    urgent: true,
  });
};

(window as any).testVictory = () => {
  const customMsg = activeManifest?.dialogues?.victory || "PR #12 mergeada en main con honor";
  setPetState("VICTORY_GITHUB", {
    title: "GITHUB: PR #12 MERGED",
    subtitle: customMsg.slice(0, 36),
    urgent: false,
  });
  githubMonitor.triggerSimulatedMerge();
};

(window as any).setPetState = setPetState;
(window as any).loadSkin = loadSkin;
(window as any).togglePinMode = togglePinMode;
(window as any).getIsPinned = getIsPinned;

// --- PANEL DE CONTROL: PIXEL MINIMAL UI ---
const debugPanel = document.getElementById("debug-panel");
const btnCloseDebug = document.getElementById("btn-close-debug");
const btnSoundToggle = document.getElementById("btn-sound-toggle");
const selectSkin = document.getElementById("select-skin") as HTMLSelectElement | null;
const btnSemester = document.getElementById("btn-event-semester");
const btnGithub = document.getElementById("btn-event-github");
const charNameEl = document.getElementById("char-name");
const charSpecEl = document.getElementById("char-spec");
const statusFsmText = document.getElementById("status-fsm-text");
const thumbCanvas = document.getElementById("thumb-canvas") as HTMLCanvasElement | null;
const thumbCtx = thumbCanvas?.getContext("2d");

// Pomodoro UI elements
const pomoClockEl = document.getElementById("pomo-clock");
const pomoStatusEl = document.getElementById("pomo-status");
const btnPomoToggle = document.getElementById("btn-pomo-toggle");
const btnPomoReset = document.getElementById("btn-pomo-reset");

// Inicializar estado de sonido en el botón
if (btnSoundToggle) {
  const enabled = audioEngine.isEnabled();
  btnSoundToggle.textContent = enabled ? "AUDIO: ON" : "AUDIO: OFF";
  btnSoundToggle.classList.toggle("active", enabled);
}

btnSoundToggle?.addEventListener("click", () => {
  const enabled = audioEngine.toggle();
  btnSoundToggle.textContent = enabled ? "AUDIO: ON" : "AUDIO: OFF";
  btnSoundToggle.classList.toggle("active", enabled);
});

// Renderizar miniatura del personaje en la tarjeta del controlador
function updateThumbnail() {
  if (!thumbCanvas || !thumbCtx || !activeManifest || !spriteImage) return;
  thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
  thumbCtx.imageSmoothingEnabled = false;

  const { frameWidth, frameHeight } = activeManifest;
  const sx = 0; // Primer frame IDLE
  const sy = 0;

  thumbCtx.drawImage(
    spriteImage,
    sx,
    sy,
    frameWidth,
    frameHeight,
    2,
    2,
    thumbCanvas.width - 4,
    thumbCanvas.height - 4
  );
}

// Sincronizar metadatos en la tarjeta activa
function syncCardInfo() {
  if (!activeManifest) return;
  if (charNameEl) charNameEl.textContent = activeManifest.name;
  if (charSpecEl) charSpecEl.textContent = `Skin pixel · ${activeManifest.frameWidth} × ${activeManifest.frameHeight}`;
  updateThumbnail();
}

// Control dinámico de visibilidad del panel y redimensión de la ventana nativa
const isTauriEnv = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const mainAppWindow = isTauriEnv ? getCurrentWindow() : null;

function syncActionButtons(state: PetStateName) {
  document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((btn) => {
    if (btn.dataset.action === state) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  if (statusFsmText) {
    statusFsmText.textContent = `Estado: ${state}`;
  }
}

async function setControllerVisibility(visible: boolean) {
  if (!debugPanel) return;
  if (visible) {
    debugPanel.classList.remove("hidden");
    // Subir la ventana automáticamente si está cerca del borde inferior para que NUNCA se corte
    await shiftWindowUpForController(340, 620);
    if (mainAppWindow) {
      try {
        await mainAppWindow.setFocus();
      } catch (err) {
        console.debug("setFocus error:", err);
      }
    }

    // Asegurar inmediatamente que los clics no se ignoren sobre el panel
    isCurrentlyIgnoring = false;
    try {
      await invoke("set_ignore_cursor", { ignore: false });
    } catch (_) {}
  } else {
    debugPanel.classList.add("hidden");
    await restoreWindowAfterController(300, 240);
  }
}

// Permitir arrastrar la ventana desde el encabezado del controlador
const controllerHeader = document.querySelector(".controller-header");
controllerHeader?.addEventListener("pointerdown", async (e) => {
  const me = e as PointerEvent;
  const target = me.target as HTMLElement;
  if (
    target.closest("#btn-close-debug") ||
    target.closest("#btn-sound-toggle") ||
    target.tagName === "BUTTON" ||
    target.tagName === "SELECT"
  ) {
    return;
  }
  if (me.button !== 0) return;

  try {
    (e.currentTarget as HTMLElement).setPointerCapture(me.pointerId);
  } catch (_) {}

  isMouseDragging = true;
  setIsDragging(true);
  dragStartMouseX = me.screenX;
  dragStartMouseY = me.screenY;

  const currentPos = getWindowPosition();
  dragStartWinX = currentPos.x;
  dragStartWinY = currentPos.y;

  isCurrentlyIgnoring = false;
  try {
    await invoke("set_ignore_cursor", { ignore: false });
  } catch (_) {}
});

// Permitir arrastrar también desde la tarjeta del personaje en el controlador
const cardCharacter = document.querySelector(".card-character");
cardCharacter?.addEventListener("pointerdown", async (e) => {
  const me = e as PointerEvent;
  const target = me.target as HTMLElement;
  if (target.tagName === "SELECT" || target.tagName === "OPTION" || target.closest("select")) {
    return;
  }
  if (me.button !== 0) return;

  try {
    (e.currentTarget as HTMLElement).setPointerCapture(me.pointerId);
  } catch (_) {}

  isMouseDragging = true;
  setIsDragging(true);
  dragStartMouseX = me.screenX;
  dragStartMouseY = me.screenY;

  const currentPos = getWindowPosition();
  dragStartWinX = currentPos.x;
  dragStartWinY = currentPos.y;

  isCurrentlyIgnoring = false;
  try {
    await invoke("set_ignore_cursor", { ignore: false });
  } catch (_) {}
});

// Atajos de teclado:
// - Cmd+Shift+D o Ctrl+Shift+D: Alterna la visibilidad del panel de control sin interferir con la escritura de código
// - Tecla 'Escape': Cierra el panel de control si está visible
// - Flechas Direccionales: Mueven al personaje por la pantalla de forma ágil y rápida
window.addEventListener("keydown", async (e) => {
  recordUserActivity();

  if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === "d" || e.key === "D")) {
    e.preventDefault();
    const isHidden = debugPanel?.classList.contains("hidden") ?? true;
    await setControllerVisibility(isHidden);
    return;
  }

  if (e.key === "Escape") {
    const isVisible = !(debugPanel?.classList.contains("hidden") ?? true);
    if (isVisible) {
      await setControllerVisibility(false);
      return;
    }
  }

  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    e.preventDefault();
    const step = e.shiftKey ? 45 : 22; // Movimiento ágil y rápido
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -step;
    if (e.key === "ArrowRight") dx = step;
    if (e.key === "ArrowUp") dy = -step;
    if (e.key === "ArrowDown") dy = step;
    await moveWindowBy(dx, dy);
  }
});

// Clic derecho: sobre el personaje alterna modo Fijo/Patrulla; sobre el fondo alterna el controlador
canvas.addEventListener("contextmenu", async (e) => {
  e.preventDefault();
  recordUserActivity();

  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  if (isHoveringCharacter(clickX, clickY)) {
    const pinned = togglePinMode();
    if (statusFsmText) {
      statusFsmText.textContent = pinned ? "Estado: FIJO (ANCLADO)" : "Estado: LIBRE (PATRULLA)";
    }
  } else {
    const isHidden = debugPanel?.classList.contains("hidden") ?? true;
    await setControllerVisibility(isHidden);
  }
});

btnCloseDebug?.addEventListener("click", async () => {
  await setControllerVisibility(false);
});

selectSkin?.addEventListener("change", async (e) => {
  const skin = (e.target as HTMLSelectElement).value;
  await loadSkin(skin);
  syncCardInfo();
});

document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((btn) => {
  btn.addEventListener("click", () => {
    const action = btn.dataset.action as PetStateName;
    if (action) {
      setPetState(action);
    }
  });
});

btnSemester?.addEventListener("click", () => {
  (window as any).testAlert();
});

btnGithub?.addEventListener("click", () => {
  (window as any).testVictory();
});

// --- INTEGRACIÓN POMODORO ---
pomodoroEngine.subscribe({
  onTick: (_remaining, phase) => {
    if (pomoClockEl) {
      pomoClockEl.textContent = pomodoroEngine.formatTime();
    }
    if (pomoStatusEl) {
      if (phase === "focus") {
        pomoStatusEl.textContent = "Foco Activo";
        pomoStatusEl.style.color = "var(--accent-primary)";
      } else if (phase === "break") {
        pomoStatusEl.textContent = "Descanso Activo";
        pomoStatusEl.style.color = "var(--success-green)";
      } else {
        pomoStatusEl.textContent = "En reposo";
        pomoStatusEl.style.color = "var(--text-muted)";
      }
    }
  },
  onPhaseChange: (newPhase: PomodoroPhase) => {
    if (newPhase === "focus") {
      const focusMsg = activeManifest?.dialogues?.focus || "25 min de foco y código continuo";
      setPetState("FOCUS", {
        title: "POMODORO: FOCO",
        subtitle: focusMsg.slice(0, 36),
        urgent: false,
      });
      if (btnPomoToggle) btnPomoToggle.textContent = "PAUSAR";
    } else if (newPhase === "break") {
      const breakMsg = activeManifest?.dialogues?.break || "5 min de descanso y estiramiento";
      setPetState("WALK", {
        title: "POMODORO: DESCANSO",
        subtitle: breakMsg.slice(0, 36),
        urgent: false,
      });
      if (btnPomoToggle) btnPomoToggle.textContent = "PAUSAR";
    } else {
      setPetState("IDLE");
      if (btnPomoToggle) btnPomoToggle.textContent = "INICIAR FOCO";
    }
  },
});

btnPomoToggle?.addEventListener("click", () => {
  const currentPhase = pomodoroEngine.getPhase();
  if (currentPhase === "idle") {
    pomodoroEngine.startFocus();
  } else if (currentPhase === "focus" || currentPhase === "break") {
    pomodoroEngine.pause();
    if (btnPomoToggle) btnPomoToggle.textContent = "CONTINUAR";
  }
});

btnPomoReset?.addEventListener("click", () => {
  pomodoroEngine.reset();
  if (btnPomoToggle) btnPomoToggle.textContent = "INICIAR FOCO";
  if (pomoClockEl) pomoClockEl.textContent = "25:00";
  if (pomoStatusEl) pomoStatusEl.textContent = "En reposo";
});

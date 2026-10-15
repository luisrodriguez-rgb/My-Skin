import { invoke } from "@tauri-apps/api/core";
import { emit, listen, isTauri } from "./platform";
import type { AppState, PetStateName } from "./appState";
export type { PetStateName } from "./appState";
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
} from "./roaming";
import { audioEngine } from "./audio";
import { pomodoroEngine, PomodoroPhase } from "./pomodoro";
import { academicSyncService } from "./syncService";
import { githubMonitor } from "./githubMonitor";
import { NotificationQueue, contextualPetState } from "./notifications";
import type { AppNotification } from "./notifications";
import { safeTaskUrl } from "./webLinks";

// --- TIPOS DEL SISTEMA DE SKINS ---
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
let cursorInsideWindow = false;
const notifications = new NotificationQueue();
let ambientState: PetStateName = "IDLE";
let visibleNotificationId: string | null = null;
let skinError: string | undefined;
let actionError: string | undefined;
let currentFrameImageData: Uint8ClampedArray | null = null;
const ALPHA_THRESHOLD = 20;

let activeManifest: SkinManifest | null = null;
let loadSequence = 0;
let calendarSyncing = false;
let calendarError: string | undefined;
let controllerWindow: Window | null = null;
const mainAppWindow = isTauri ? getCurrentWindow() : null;
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
  const sequence = ++loadSequence;
  skinError = undefined;
  try {
    if (!/^[a-z0-9-]+$/.test(skinFolder)) throw new Error("Identificador de skin inválido.");
    const res = await fetch(`/skins/${skinFolder}/manifest.json`);
    if (!res.ok) throw new Error(`Skin HTTP ${res.status}`);
    const manifest = (await res.json()) as SkinManifest;

    const img = new Image();
    const ready = new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
    img.src = `/skins/${skinFolder}/spritesheet.png`;
    await ready;

    if (sequence !== loadSequence) return;
    activeManifest = manifest;
    spriteImage = img;
    currentFrameIndex = 0;
    lastFrameTimestamp = performance.now();
    skinError = undefined;
    refreshPresentation(true);

    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("myskin_active_skin", skinFolder);
      }
    } catch (_) {}

    console.log(`[MySkin] Skin "${activeManifest.name}" cargado exitosamente.`);
  } catch {
    if (sequence !== loadSequence) return;
    skinError = "No se pudo cargar el personaje. Se conserva el anterior; vuelve a intentarlo.";
    publishState();
  }
}

/**
 * 2. Cambiar de estado en la Máquina de Estados (FSM)
 */
export function setPetState(
  newState: PetStateName,
  notification?: { title: string; subtitle: string; urgent?: boolean }
) {
  if (!["IDLE", "WALK", "ALERT_SEMESTRE", "VICTORY_GITHUB", "FOCUS", "SLEEP"].includes(newState)) return;
  if (activeManifest && !activeManifest.states[newState]) return;

  if (!notification && newState === "FOCUS") {
    if (pomodoroEngine.getPhase() !== "focus") pomodoroEngine.startFocus();
    else if (!pomodoroEngine.isRunning()) pomodoroEngine.resume();
  } else if (notification) {
    if (!["VICTORY_GITHUB", "ALERT_SEMESTRE", "FOCUS"].includes(newState)) ambientState = newState;
    notifications.push({
      id: `visual:${crypto.randomUUID()}`, kind: ["IDLE", "SLEEP"].includes(newState) ? "ambient" : "demo", state: newState,
      title: notification.title, subtitle: notification.subtitle,
      urgent: notification.urgent, durationMs: 4000,
    });
  } else ambientState = newState;
  refreshPresentation();
}

function displayNotification(item: AppNotification): AppNotification {
  return item.kind === "academic" && item.dueAt !== undefined
    ? { ...item, title: `ENTREGA: ${academicSyncService.formatRemainingTime(item.dueAt).toUpperCase()}` }
    : item;
}

function refreshPresentation(force = false) {
  const item = notifications.current();
  const notification = item ? displayNotification(item) : null;
  const newState = notification?.state ?? contextualPetState(pomodoroEngine.snapshot(), ambientState);
  const changed = currentState !== newState || visibleNotificationId !== (notification?.id ?? null);
  const contentChanged = activeNotification?.title !== notification?.title || activeNotification?.subtitle !== notification?.subtitle;
  if (changed) {
    if (newState === "ALERT_SEMESTRE") audioEngine.playAlert();
    else if (newState === "VICTORY_GITHUB") audioEngine.playVictory();
    else if (newState === "FOCUS") audioEngine.playFocus();
    else if (newState === "SLEEP") audioEngine.playSleep();
    currentFrameIndex = 0;
    lastFrameTimestamp = performance.now();
  }
  currentState = newState;
  if (visibleNotificationId !== (notification?.id ?? null)) {
    const announcement = document.getElementById("pet-announcement");
    if (announcement) announcement.textContent = notification ? `${notification.title}. ${notification.subtitle}` : "";
  }
  visibleNotificationId = notification?.id ?? null;
  activeNotification = notification ? { title: notification.title, subtitle: notification.subtitle, urgent: notification.urgent ?? false } : null;
  setRoamingAlertState(!!notification || (pomodoroEngine.isRunning() && pomodoroEngine.getPhase() === "focus"));
  canvas.dataset.state = currentState;
  canvas.setAttribute("aria-label", notification ? `${notification.title}. ${notification.subtitle}. Pulsa Enter para descartar.` : `Compañero MySkin. Estado ${currentState}. Pulsa Enter para abrir el controlador.`);
  if (changed || contentChanged || force) drawCurrentStateToCanvas();
  publishState();
}

function dismissNotification(id: string) {
  notifications.dismiss(id);
  refreshPresentation();
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

  // Cache en memoria del frame activo para hit-testing instantaneo sin latencia de GPU
  currentFrameImageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
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
          if (notifications.current()) currentFrameIndex = stateCfg.frames - 1;
          else setPetState(stateCfg.nextState || "IDLE");
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

// --- HIT-TEST ROBUSTO DE CANAL ALPHA Y PANEL DE CONTROL ---
function isPixelSolid(x: number, y: number): boolean {
  if (
    x < characterBoundingBox.minX - 4 ||
    x >= characterBoundingBox.maxX + 4 ||
    y < characterBoundingBox.minY - 4 ||
    y >= characterBoundingBox.maxY + 4
  ) {
    return false;
  }

  if (!currentFrameImageData) return false;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || px >= CANVAS_WIDTH || py < 0 || py >= CANVAS_HEIGHT) return false;

  const alphaIndex = (py * CANVAS_WIDTH + px) * 4 + 3;
  return currentFrameImageData[alphaIndex] > ALPHA_THRESHOLD;
}

/**
 * Tolerancia de 8px alrededor del sprite para capturar clics rápidos de forma instantánea
 */
function isCharacterHit(x: number, y: number): boolean {
  if (isPixelSolid(x, y)) return true;
  for (let dx = -8; dx <= 8; dx += 4) {
    for (let dy = -8; dy <= 8; dy += 4) {
      if (isPixelSolid(x + dx, y + dy)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Determina si las coordenadas del cursor (relativas a la ventana)
 * caen sobre un elemento interactuable (panel de control abierto o pixel del personaje).
 */
function isCursorOverInteractable(windowX: number, windowY: number): boolean {
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

    // Comprobación de colisión precisa sobre el sprite
    if (isCharacterHit(canvasX, canvasY)) {
      return true;
    }
  }

  return false;
}

/**
 * Sondeo continuo a 30ms para alternar transparencia de clics instantáneamente
 */
async function checkCursorHitTest() {
  if (isMouseDragging) return; // Nunca ignorar cursor mientras se arrastra con el mouse

  try {
    const pos = await invoke<{ x: number; y: number; inside: boolean }>("get_cursor_rel_pos");

    cursorInsideWindow = pos.inside;
    if (!pos.inside) {
      if (!isCurrentlyIgnoring) {
        isCurrentlyIgnoring = true;
        await invoke("set_ignore_cursor", { ignore: true });
      }
      return;
    }

    const isInteractable = isCursorOverInteractable(pos.x, pos.y);
    const shouldIgnore = !isInteractable;

    if (shouldIgnore !== isCurrentlyIgnoring) {
      isCurrentlyIgnoring = shouldIgnore;
      await invoke("set_ignore_cursor", { ignore: shouldIgnore });
      canvas.style.cursor = isInteractable ? "pointer" : "default";
    }
  } catch (err) {
    console.debug("Hit-test poll info:", err);
  }
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
    if (visibleNotificationId) dismissNotification(visibleNotificationId);
    return;
  }

  // 2. Comprobar si hizo clic sobre el cuerpo del personaje (con tolerancia para clics ágiles)
  const hitCharacter = isCharacterHit(clickX, clickY);
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

  const hitCharacter = isCharacterHit(clickX, clickY);
  if (hitCharacter) {
    await setControllerVisibility();
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
const savedSkin = (typeof localStorage !== "undefined" && localStorage.getItem("myskin_active_skin")) || "spartan";
const initialSkin = loadSkin(savedSkin).then(() => initRoamingSystem());
requestAnimationFrame(animationLoop);
// A normal browser has no native cursor bridge. Await each poll to prevent overlap.
let cursorPollTimer: number | undefined;
if (isTauri) {
  const pollCursor = async () => {
    await checkCursorHitTest();
    cursorPollTimer = window.setTimeout(pollCursor, isMouseDragging ? 120 : cursorInsideWindow ? 30 : 100);
  };
  void pollCursor();
}

// React to service events in the sprite window.
academicSyncService.subscribe((deadline) => {
  notifications.push({
    id: `deadline:${deadline.id}:${deadline.dueAt}`, kind: "academic", state: "ALERT_SEMESTRE",
    title: "ENTREGA", subtitle: `${deadline.course}: ${deadline.title}`,
    urgent: true, deadlineId: deadline.id, dueAt: deadline.dueAt,
  });
  refreshPresentation();
});

githubMonitor.subscribe({
  onMerge: (event) => {
    notifications.push({ id: `merge:${event.prNumber}:${event.mergedAt}`, kind: "github", state: "VICTORY_GITHUB",
      title: `GITHUB: PR #${event.prNumber} MERGED`, subtitle: event.title, durationMs: 4000 });
    refreshPresentation();
  },
  onCommit: (commit) => {
    notifications.push({ id: `commit:${commit.sha}`, kind: "github", state: "IDLE",
      title: `COMMIT: ${commit.sha}`, subtitle: commit.message, durationMs: 4000 });
    refreshPresentation();
  },
});

// Commands are handled only here. The controller renders snapshots and owns no timers.
async function registerCommands() {
  await Promise.all([
    listen<string>("tray-action", async ({ payload: action }) => {
      if (action.startsWith("skin_")) await loadSkin(action.slice(5));
      else if (action === "toggle_controller") await setControllerVisibility();
      else if (action === "toggle_roam") togglePinMode();
      else if (action === "start_pomodoro") pomodoroEngine.startFocus();
      else if (action === "toggle_audio") audioEngine.toggle();
      publishState();
    }),
    listen<string>("skin-changed", ({ payload }) => { void loadSkin(payload); }),
    listen<{ state: PetStateName; notification?: { title: string; subtitle: string; urgent?: boolean } }>(
      "set-pet-state", ({ payload }) => setPetState(payload.state, payload.notification)),
    listen<boolean>("toggle-audio", ({ payload }) => {
      if (audioEngine.isEnabled() !== payload) audioEngine.toggle();
      publishState();
    }),
    listen<boolean>("toggle-pin", ({ payload }) => {
      if (getIsPinned() !== payload) togglePinMode();
      publishState();
    }),
    listen("pomo-toggle", () => pomodoroEngine.toggle()),
    listen<string>("deadline-complete", ({ payload }) => {
      academicSyncService.markCompleted(payload);
      refreshPresentation();
    }),
    listen<string>("deadline-open", ({ payload }) => { void openDeadline(payload); }),
    listen<string>("notification-dismiss", ({ payload }) => dismissNotification(payload)),
    listen("pomo-reset", () => pomodoroEngine.reset()),
    listen<string>("calendar-sync", ({ payload }) => { void syncCalendar(payload); }),
    listen("state-request", () => publishState()),
  ]);
  await initialSkin;
  academicSyncService.startPeriodicCheck(60);
  githubMonitor.startPolling(180);
  publishState();
}

async function syncCalendar(url: string) {
  if (calendarSyncing) return;
  calendarSyncing = true;
  calendarError = undefined;
  publishState();
  const result = await academicSyncService.syncFromIcs(url);
  calendarError = result.error;
  calendarSyncing = false;
  publishState();
}

function publishState() {
  const state: AppState = {
    skin: activeManifest?.id || "spartan",
    petState: currentState,
    pinned: getIsPinned(),
    audio: audioEngine.isEnabled(),
    pomodoro: pomodoroEngine.snapshot(),
    notifications: notifications.snapshot().map(displayNotification),
    activeNotificationId: visibleNotificationId,
    skinError,
    actionError,
    calendar: {
      url: academicSyncService.getCalendarUrl(),
      count: academicSyncService.getDeadlines().length,
      deadlines: academicSyncService.getDeadlines(),
      lastSync: academicSyncService.getLastSyncFormatted(),
      syncing: calendarSyncing,
      error: calendarError,
    },
  };
  void emit("state-changed", state).catch((error) => console.error("No se pudo compartir el estado", error));
}

// --- PRUEBA RÁPIDA EN CONSOLA Y MÉTODOS GLOBALES ---
(window as any).testAlert = () => setPetState("ALERT_SEMESTRE", {
  title: "DEMO: ENTREGA ACADÉMICA", subtitle: "Esta es una notificación de prueba.", urgent: true,
});
(window as any).testVictory = () => setPetState("VICTORY_GITHUB", {
  title: "DEMO: GITHUB MERGE", subtitle: "Esta es una celebración de prueba.",
});

(window as any).setPetState = setPetState;
(window as any).loadSkin = loadSkin;
(window as any).togglePinMode = () => { const pinned = togglePinMode(); publishState(); return pinned; };
(window as any).getIsPinned = getIsPinned;

async function setControllerVisibility(visible?: boolean) {
  if (isTauri) {
    await invoke("toggle_controller_window", { visible: visible ?? null });
  } else if (visible === false) {
    controllerWindow?.close();
  } else {
    controllerWindow = window.open("/controller.html", "myskin-controller", "width=560,height=720");
    controllerWindow?.focus();
  }
}

// Local shortcuts; desktop-wide shortcuts require a native plugin.
window.addEventListener("keydown", async (event) => {
  recordUserActivity();
  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d") {
    event.preventDefault();
    await setControllerVisibility();
  } else if (event.key === "Escape") {
    await setControllerVisibility(false);
  } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
    event.preventDefault();
    const step = event.shiftKey ? 45 : 22;
    await moveWindowBy(event.key === "ArrowLeft" ? -step : event.key === "ArrowRight" ? step : 0,
      event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0);
  }
});

canvas.addEventListener("contextmenu", async (event) => {
  event.preventDefault();
  recordUserActivity();
  const rect = canvas.getBoundingClientRect();
  if (isCharacterHit((event.clientX - rect.left) * CANVAS_WIDTH / rect.width,
    (event.clientY - rect.top) * CANVAS_HEIGHT / rect.height)) {
    togglePinMode();
    publishState();
  } else await setControllerVisibility();
});

pomodoroEngine.subscribe({
  onTick: () => {
    if (!pomodoroEngine.isRunning()) notifications.removeWhere((item) => item.kind === "pomodoro");
    refreshPresentation();
  },
  onPhaseChange: (phase: PomodoroPhase) => {
    ambientState = "IDLE";
    if (phase === "break") notifications.push({
      id: `pomodoro:${Date.now()}`, kind: "pomodoro", state: "WALK",
      title: "SESIÓN COMPLETADA", subtitle: "Completaste tu sesión de concentración.", durationMs: 8000,
    });
    if (phase === "idle") notifications.removeWhere((item) => item.kind === "pomodoro");
    refreshPresentation();
  },
});
academicSyncService.onChange(() => {
  const valid = new Map(academicSyncService.getPendingDeadlines().map((deadline) => [deadline.id, deadline]));
  notifications.removeWhere((item) => item.kind === "academic" &&
    (!item.deadlineId || !valid.get(item.deadlineId)?.urgent || valid.get(item.deadlineId)?.dueAt !== item.dueAt));
  for (const item of notifications.snapshot()) {
    const deadline = item.deadlineId ? valid.get(item.deadlineId) : undefined;
    if (item.kind === "academic" && deadline) {
      notifications.push({ ...item, subtitle: `${deadline.course}: ${deadline.title}` });
    }
  }
  refreshPresentation();
});
const notificationTimer = window.setInterval(refreshPresentation, 1000);
canvas.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  if (visibleNotificationId) dismissNotification(visibleNotificationId);
  else void setControllerVisibility();
});
void registerCommands().catch((error) => console.error("No se pudieron iniciar los servicios", error));
window.addEventListener("pagehide", () => {
  if (cursorPollTimer !== undefined) clearTimeout(cursorPollTimer);
  clearInterval(notificationTimer);
  academicSyncService.stopPeriodicCheck();
  githubMonitor.stopPolling();
  pomodoroEngine.pause();
});

async function openDeadline(id: string) {
  const link = safeTaskUrl(academicSyncService.getDeadlines().find((deadline) => deadline.id === id)?.link);
  if (!link || !isTauri) return;
  actionError = undefined;
  try { await invoke("open_external_url", { url: link }); }
  catch { actionError = "No se pudo abrir la entrega en el navegador. Vuelve a intentarlo."; }
  publishState();
}

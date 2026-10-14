import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import {
  initRoamingSystem,
  togglePinMode,
  getFacingDirection,
  getIsPinned,
  setRoamingAlertState,
  syncPositionAfterUserDrag,
  setIsDragging,
  moveWindowBy,
} from "./roaming";

// --- TIPOS DEL SISTEMA DE SKINS ---
export type PetStateName = "IDLE" | "WALK" | "ALERT_SEMESTRE" | "VICTORY_GITHUB";

interface StateConfig {
  row: number;
  frames: number;
  fps: number;
  loop: boolean;
  nextState?: PetStateName;
}

interface SkinManifest {
  id: string;
  name: string;
  frameWidth: number;
  frameHeight: number;
  scale: number;
  anchorY: number;
  personalityPrompt: string;
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
let currentFrameImageData: Uint8ClampedArray | null = null;
const ALPHA_THRESHOLD = 20;

let activeManifest: SkinManifest | null = null;
let spriteImage: HTMLImageElement | null = null;

// Variables de la Máquina de Estados Finitos (FSM)
let currentState: PetStateName = "IDLE";
let currentFrameIndex = 0;
let lastFrameTimestamp = 0;

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

  // Actualizamos la caché de píxeles SOLO cuando se redibuja un frame nuevo
  currentFrameImageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
}

/**
 * 4. Dibuja un globo de diálogo con estética Pixel Art directamente en el Canvas
 */
function drawPixelSpeechBubble(title: string, subtitle: string, urgent: boolean) {
  const bx = 20;
  const by = 8;
  const bw = 260;
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
  ctx.fillText(title.slice(0, 28), bx + 10, by + 20);

  ctx.fillStyle = "#F1FAEE";
  ctx.font = "10px monospace";
  ctx.fillText(subtitle.slice(0, 30), bx + 10, by + 40);

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

// --- HIT-TEST DE CANAL ALPHA Y PANEL DE CONTROL (CONECTADO A RUST) ---
function isPixelSolid(x: number, y: number): boolean {
  if (!currentFrameImageData) return false;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || px >= CANVAS_WIDTH || py < 0 || py >= CANVAS_HEIGHT) return false;

  const alphaIndex = (py * CANVAS_WIDTH + px) * 4 + 3;
  return currentFrameImageData[alphaIndex] > ALPHA_THRESHOLD;
}

/**
 * Determina si las coordenadas del cursor (relativas a la ventana)
 * caen sobre un elemento interactuable (panel de control abierto o pixel del personaje).
 */
function isCursorOverInteractable(windowX: number, windowY: number): boolean {
  // 1. Si el panel de control esta abierto y el cursor esta sobre su area
  if (debugPanel && !debugPanel.classList.contains("hidden")) {
    const panelRect = debugPanel.getBoundingClientRect();
    if (
      windowX >= panelRect.left &&
      windowX <= panelRect.right &&
      windowY >= panelRect.top &&
      windowY <= panelRect.bottom
    ) {
      return true;
    }
  }

  // 2. Si el cursor esta sobre el canvas del personaje
  const canvasRect = canvas.getBoundingClientRect();
  if (
    windowX >= canvasRect.left &&
    windowX <= canvasRect.right &&
    windowY >= canvasRect.top &&
    windowY <= canvasRect.bottom
  ) {
    const canvasX = (windowX - canvasRect.left) * (CANVAS_WIDTH / canvasRect.width);
    const canvasY = (windowY - canvasRect.top) * (CANVAS_HEIGHT / canvasRect.height);
    if (isPixelSolid(canvasX, canvasY)) {
      return true;
    }
  }

  return false;
}

async function checkCursorHitTest() {
  try {
    const pos = await invoke<{ x: number; y: number; inside: boolean }>("get_cursor_rel_pos");

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
    // Fuera del runtime nativo de Tauri (ej. vista previa en navegador)
    console.debug("Hit-test poll info:", err);
  }
}

// --- INTERACCIÓN CON EL PERSONAJE Y EL GLOBO ---
canvas.addEventListener("mousedown", async (e) => {
  if (e.button !== 0 || isCurrentlyIgnoring) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  // Si hizo clic en la parte superior (donde esta el globo de alerta), descartamos la alerta
  if (activeNotification && clickY < 84) {
    setRoamingAlertState(false);
    setPetState("IDLE");
    drawCurrentStateToCanvas();
    return;
  }

  // Si hizo clic sobre un pixel solido del cuerpo del personaje, permite arrastrarlo
  if (!isPixelSolid(clickX, clickY)) return;

  try {
    setIsDragging(true);
    await getCurrentWindow().startDragging();
    await syncPositionAfterUserDrag();
  } catch (err) {
    console.debug("startDragging disponible unicamente dentro de Tauri:", err);
  } finally {
    setIsDragging(false);
  }
});

// Soporte de interacción con cursor para modo navegador
canvas.addEventListener("mousemove", (e) => {
  const solid = isCursorOverInteractable(e.clientX, e.clientY);
  isCurrentlyIgnoring = !solid;
  canvas.style.cursor = solid ? "pointer" : "default";
});

// --- INICIALIZACIÓN ---
loadSkin("spartan").then(() => {
  initRoamingSystem();
});
requestAnimationFrame(animationLoop);
setInterval(checkCursorHitTest, 30);

// --- PRUEBA RÁPIDA EN CONSOLA Y MÉTODOS GLOBALES ---
(window as any).testAlert = () => {
  setPetState("ALERT_SEMESTRE", {
    title: "ENTREGA EN 1H 45M",
    subtitle: "Lab. Física - Circuitos RC",
    urgent: true,
  });
};

(window as any).testVictory = () => {
  setPetState("VICTORY_GITHUB", {
    title: "GITHUB: PR MERGED",
    subtitle: "Branch feature/companion integrado",
    urgent: false,
  });
};

(window as any).setPetState = setPetState;
(window as any).loadSkin = loadSkin;
(window as any).togglePinMode = togglePinMode;
(window as any).getIsPinned = getIsPinned;

// --- PANEL DE CONTROL: PIXEL MINIMAL UI ---
const debugPanel = document.getElementById("debug-panel");
const btnCloseDebug = document.getElementById("btn-close-debug");
const selectSkin = document.getElementById("select-skin") as HTMLSelectElement | null;
const btnSemester = document.getElementById("btn-event-semester");
const btnGithub = document.getElementById("btn-event-github");
const charNameEl = document.getElementById("char-name");
const charSpecEl = document.getElementById("char-spec");
const statusFsmText = document.getElementById("status-fsm-text");
const thumbCanvas = document.getElementById("thumb-canvas") as HTMLCanvasElement | null;
const thumbCtx = thumbCanvas?.getContext("2d");

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

// Control dinamico de visibilidad del panel y redimension de la ventana nativa
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
    if (mainAppWindow) {
      try {
        await mainAppWindow.setSize(new LogicalSize(340, 580));
      } catch (err) {
        console.debug("setSize error:", err);
      }
    }
    // Asegurar inmediatamente que los clics no se ignoren sobre el panel
    isCurrentlyIgnoring = false;
    try {
      await invoke("set_ignore_cursor", { ignore: false });
    } catch (_) {}
  } else {
    debugPanel.classList.add("hidden");
    if (mainAppWindow) {
      try {
        await mainAppWindow.setSize(new LogicalSize(300, 240));
      } catch (err) {
        console.debug("setSize error:", err);
      }
    }
  }
}

// Permitir arrastrar la ventana desde el encabezado del controlador
const controllerHeader = document.querySelector(".controller-header");
controllerHeader?.addEventListener("mousedown", async (e) => {
  const target = (e as MouseEvent).target as HTMLElement;
  if (target.closest("#btn-close-debug") || target.tagName === "BUTTON" || target.tagName === "SELECT") {
    return;
  }
  if ((e as MouseEvent).button !== 0) return;

  try {
    setIsDragging(true);
    await getCurrentWindow().startDragging();
    await syncPositionAfterUserDrag();
  } catch (err) {
    console.debug("startDragging disponible unicamente dentro de Tauri:", err);
  } finally {
    setIsDragging(false);
  }
});

// Atajos de teclado:
// - Tecla 'D': Alterna la visibilidad del panel de control
// - Tecla 'Escape': Cierra el panel de control si esta visible
// - Flechas Direccionales: Mueven al personaje por la pantalla (Shift para pasos mas largos)
window.addEventListener("keydown", async (e) => {
  if (e.key === "d" || e.key === "D") {
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
    const step = e.shiftKey ? 35 : 12;
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
  const rect = canvas.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  if (isPixelSolid(clickX, clickY)) {
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




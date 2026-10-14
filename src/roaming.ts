import { getCurrentWindow, currentMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import { setPetState } from "./main";

// Deteccion segura de entorno Tauri v2
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const appWindow = isTauri ? getCurrentWindow() : null;

// --- ESTADO DE MOVIMIENTO Y LOCOMOCION ---
// Por defecto en MODO FIJO: El usuario decide donde colocarlo y no se mueve solo
let isPinned = true;             // true = Fijo en pantalla | false = Modo patrulla libre
let isDragging = false;          // Pausa el movimiento automatico durante arrastre manual
let hasActiveAlert = false;      // Detiene la caminata mientras hay una alerta desplegada
let facingDirection: 1 | -1 = 1; // 1 = Derecha, -1 = Izquierda

// Dimensiones de pantalla y limites seguros del monitor
let monitorWidth = 1440;
let monitorHeight = 900;
let currentWinWidth = 300;
let currentWinHeight = 240;

// Coordenadas fisicas de la ventana en el monitor
let winX = 200;
let winY = 700;
let targetX = 600;
let minX = 0;
let maxX = 1200;

const WALK_SPEED = 2.5; // Pixeles por tick
let isWalkingNow = false;
let waitTimer = 0;
let keyboardWalkTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Limita estrictamente las coordenadas de la ventana para que NUNCA se pierda de pantalla
 * ni quede cortada contra los bordes superior, inferior, izquierdo o derecho.
 */
export function clampWindowPosition(x: number, y: number, w = currentWinWidth, h = currentWinHeight) {
  // Margen superior para evitar quedar bajo la barra de menu de macOS
  const minY = 28;
  const minX = 0;
  const safeMaxX = Math.max(0, monitorWidth - w);
  const safeMaxY = Math.max(minY, monitorHeight - h);

  return {
    x: Math.max(minX, Math.min(x, safeMaxX)),
    y: Math.max(minY, Math.min(y, safeMaxY)),
  };
}

/**
 * 1. Inicializa limites del monitor para mantener la ventana dentro de los margenes visibles
 */
export async function initRoamingSystem() {
  if (!appWindow) {
    console.debug("[Roaming] Entorno web detectado. Locomocion nativa de ventana pausada.");
    return;
  }

  try {
    const monitor = await currentMonitor();
    const winSize = await appWindow.outerSize();
    const currentPos = await appWindow.outerPosition();

    winX = currentPos.x;
    winY = currentPos.y;

    if (monitor) {
      monitorWidth = monitor.size.width;
      monitorHeight = monitor.size.height;
      currentWinWidth = winSize.width;
      currentWinHeight = winSize.height;

      minX = 0;
      maxX = Math.max(0, monitor.size.width - winSize.width);

      // Si la ventana inicio en (0,0), posicionarla en la esquina inferior derecha
      if (winX <= 20 && winY <= 20) {
        winX = monitor.size.width - winSize.width - 60;
        winY = monitor.size.height - winSize.height - 90;
        await appWindow.setPosition(new PhysicalPosition(Math.round(winX), Math.round(winY)));
      }
    }

    // Bucle para modo libre (solo activo si el usuario desactiva el anclado)
    setInterval(updateMovementStep, 30);
  } catch (err) {
    console.debug("[Roaming] Error al inicializar monitor:", err);
  }
}

/**
 * 2. Selecciona aleatoriamente el siguiente punto de destino (solo en modo patrulla)
 */
function pickNextDestination() {
  maxX = Math.max(0, monitorWidth - currentWinWidth);
  targetX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
  facingDirection = targetX >= winX ? 1 : -1;
}

/**
 * 3. Bucle de locomocion: actualiza la posicion solo si isPinned = false
 */
async function updateMovementStep() {
  if (!appWindow || isPinned || isDragging || hasActiveAlert) {
    return;
  }

  // Intervalo de reposo entre caminatas
  if (!isWalkingNow) {
    waitTimer--;
    if (waitTimer <= 0) {
      isWalkingNow = true;
      pickNextDestination();
      setPetState("WALK");
    }
    return;
  }

  // Distancia restante hacia el objetivo
  const dist = targetX - winX;

  if (Math.abs(dist) <= WALK_SPEED) {
    // Llegada a destino: reposo en IDLE entre 4 y 8 segundos
    winX = targetX;
    isWalkingNow = false;
    waitTimer = Math.floor(Math.random() * 150) + 120;
    setPetState("IDLE");
  } else {
    // Paso en direccion horizontal
    winX += Math.sign(dist) * WALK_SPEED;
    const clamped = clampWindowPosition(winX, winY);
    winX = clamped.x;
    winY = clamped.y;
    try {
      await appWindow.setPosition(new PhysicalPosition(Math.round(winX), Math.round(winY)));
    } catch (err) {
      console.debug("[Roaming] Error al posicionar ventana:", err);
    }
  }
}

/**
 * 4. Mover la ventana de forma fluida mediante flechas del teclado
 */
export async function moveWindowBy(dx: number, dy: number) {
  if (!appWindow) return;

  if (dx !== 0) {
    facingDirection = dx > 0 ? 1 : -1;
  }

  // Activar animacion de caminata
  setPetState("WALK");
  if (keyboardWalkTimer) clearTimeout(keyboardWalkTimer);
  keyboardWalkTimer = setTimeout(() => {
    setPetState("IDLE");
  }, 220);

  const clamped = clampWindowPosition(winX + dx, winY + dy);
  winX = clamped.x;
  winY = clamped.y;

  try {
    await appWindow.setPosition(new PhysicalPosition(Math.round(winX), Math.round(winY)));
  } catch (err) {
    console.debug("[Roaming] Error al mover ventana con teclado:", err);
  }
}

/**
 * 5. Reubica la ventana si cambia de tamano para asegurar que no se corte en los bordes
 */
export async function ensureWindowInBounds(newWidth: number, newHeight: number) {
  if (!appWindow) return;
  currentWinWidth = newWidth;
  currentWinHeight = newHeight;

  const clamped = clampWindowPosition(winX, winY, newWidth, newHeight);
  winX = clamped.x;
  winY = clamped.y;

  try {
    await appWindow.setPosition(new PhysicalPosition(Math.round(winX), Math.round(winY)));
  } catch (err) {
    console.debug("[Roaming] Error al ajustar limites de ventana:", err);
  }
}

/**
 * 6. Alternar entre Modo Fijo (Anclado) y Modo Libre (Patrulla)
 */
export function togglePinMode(): boolean {
  isPinned = !isPinned;

  if (isPinned) {
    isWalkingNow = false;
    setPetState("IDLE", {
      title: "MODO FIJO ACTIVADO",
      subtitle: "Posicion fija en pantalla",
      urgent: false,
    });
    setTimeout(() => {
      if (!hasActiveAlert) setPetState("IDLE");
    }, 2000);
  } else {
    waitTimer = 30;
    pickNextDestination();
    setPetState("IDLE", {
      title: "MODO LIBRE ACTIVADO",
      subtitle: "Patrullando el escritorio",
      urgent: false,
    });
    setTimeout(() => {
      if (!hasActiveAlert) setPetState("IDLE");
    }, 2000);
  }

  return isPinned;
}

/**
 * 7. Notificar presencia de alerta activa para frenar la caminata
 */
export function setRoamingAlertState(hasAlert: boolean) {
  hasActiveAlert = hasAlert;
  if (hasAlert) {
    isWalkingNow = false;
  }
}

/**
 * 8. Sincronizar coordenadas tras arrastre manual del usuario
 */
export async function syncPositionAfterUserDrag() {
  if (!appWindow) return;
  try {
    const pos = await appWindow.outerPosition();
    const clamped = clampWindowPosition(pos.x, pos.y);
    winX = clamped.x;
    winY = clamped.y;
    await appWindow.setPosition(new PhysicalPosition(Math.round(winX), Math.round(winY)));
  } catch (err) {
    console.debug("[Roaming] Error al sincronizar posicion tras arrastre:", err);
  }
}

export function updateWindowCoordinates(x: number, y: number) {
  winX = x;
  winY = y;
}

export function getWindowPosition() {
  return { x: winX, y: winY };
}

export function setIsDragging(dragging: boolean) {
  isDragging = dragging;
}

export function getFacingDirection(): 1 | -1 {
  return facingDirection;
}

export function setFacingDirection(dir: 1 | -1) {
  facingDirection = dir;
}

export function getIsPinned(): boolean {
  return isPinned;
}

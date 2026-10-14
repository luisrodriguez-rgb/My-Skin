import { getCurrentWindow, currentMonitor, LogicalPosition, LogicalSize } from "@tauri-apps/api/window";
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

// Dimensiones de pantalla en PUNTOS LOGICOS (coherente con CSS y el mouse)
let monitorWidth = 1440;
let monitorHeight = 900;
let currentWinWidth = 300;
let currentWinHeight = 240;

// Coordenadas logicas de la ventana en el monitor
let winX = 200;
let winY = 600;
let targetX = 600;
let minX = 0;
let maxX = 1200;

const WALK_SPEED = 2.5; // Pixeles por tick
let isWalkingNow = false;
let waitTimer = 0;
let keyboardWalkTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Limita las coordenadas de la ventana en puntos logicos.
 * Permite que el personaje suba hasta tocar la barra de menu sin pared invisible,
 * y evita que caiga fuera de la pantalla por la derecha o abajo.
 */
export function clampWindowPosition(x: number, y: number, w = currentWinWidth, h = currentWinHeight) {
  // -60px permite que la cabeza del personaje alcance la barra de menu superior de macOS
  const minY = -60;
  const minX = -40; // Permite que el cuerpo alcance el borde izquierdo real
  const safeMaxX = Math.max(minX, monitorWidth - w + 40);
  const safeMaxY = Math.max(minY, monitorHeight - h);

  return {
    x: Math.max(minX, Math.min(x, safeMaxX)),
    y: Math.max(minY, Math.min(y, safeMaxY)),
  };
}

/**
 * 1. Inicializa limites del monitor en coordenadas logicas (normalizando escala Retina)
 */
export async function initRoamingSystem() {
  if (!appWindow) {
    console.debug("[Roaming] Entorno web detectado. Locomocion nativa de ventana pausada.");
    return;
  }

  try {
    const monitor = await currentMonitor();
    const scale = (await appWindow.scaleFactor()) || 1;
    const currentPos = await appWindow.outerPosition();
    const winSize = await appWindow.outerSize();

    // Guardar coordenadas normalizadas a puntos logicos
    winX = currentPos.x / scale;
    winY = currentPos.y / scale;

    if (monitor) {
      monitorWidth = monitor.size.width / scale;
      monitorHeight = monitor.size.height / scale;
      currentWinWidth = winSize.width / scale;
      currentWinHeight = winSize.height / scale;

      minX = 0;
      maxX = Math.max(0, monitorWidth - currentWinWidth);

      // Si la ventana inicio en (0,0), posicionarla en la esquina inferior derecha
      if (winX <= 20 && winY <= 20) {
        winX = monitorWidth - currentWinWidth - 60;
        winY = monitorHeight - currentWinHeight - 80;
        await appWindow.setPosition(new LogicalPosition(Math.round(winX), Math.round(winY)));
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
      await appWindow.setPosition(new LogicalPosition(Math.round(winX), Math.round(winY)));
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
    await appWindow.setPosition(new LogicalPosition(Math.round(winX), Math.round(winY)));
  } catch (err) {
    console.debug("[Roaming] Error al mover ventana con teclado:", err);
  }
}

/**
 * 5. Reubica la ventana subiendola si esta cerca del borde inferior al abrir el controlador
 * para que el panel de control NUNCA se corte por debajo de la pantalla.
 */
export async function shiftWindowUpForController(newW = 340, newH = 580) {
  if (!appWindow) return;

  try {
    const monitor = await currentMonitor();
    const scale = (await appWindow.scaleFactor()) || 1;
    const screenH = monitor ? monitor.size.height / scale : monitorHeight;
    const screenW = monitor ? monitor.size.width / scale : monitorWidth;

    currentWinWidth = newW;
    currentWinHeight = newH;

    // Si la altura del controlador sobrepasaria el borde inferior: subir la ventana
    if (winY + newH > screenH - 10) {
      winY = Math.max(30, screenH - newH - 25);
    }

    // Si sobrepasa el borde derecho:
    if (winX + newW > screenW - 10) {
      winX = Math.max(10, screenW - newW - 15);
    }

    await appWindow.setPosition(new LogicalPosition(Math.round(winX), Math.round(winY)));
    await appWindow.setSize(new LogicalSize(newW, newH));
  } catch (err) {
    console.debug("[Roaming] Error reposicionando ventana para controlador:", err);
  }
}

/**
 * 6. Restaura el tamano compacto del personaje al cerrar el controlador
 */
export async function restoreWindowAfterController(origW = 300, origH = 240) {
  if (!appWindow) return;
  currentWinWidth = origW;
  currentWinHeight = origH;

  try {
    await appWindow.setSize(new LogicalSize(origW, origH));
  } catch (err) {
    console.debug("[Roaming] Error restaurando ventana:", err);
  }
}

/**
 * 7. Alternar entre Modo Fijo (Anclado) y Modo Libre (Patrulla)
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
 * 8. Notificar presencia de alerta activa para frenar la caminata
 */
export function setRoamingAlertState(hasAlert: boolean) {
  hasActiveAlert = hasAlert;
  if (hasAlert) {
    isWalkingNow = false;
  }
}

/**
 * 9. Sincronizar coordenadas tras arrastre manual del usuario en puntos logicos
 */
export async function syncPositionAfterUserDrag() {
  if (!appWindow) return;
  try {
    const scale = (await appWindow.scaleFactor()) || 1;
    const pos = await appWindow.outerPosition();
    winX = pos.x / scale;
    winY = pos.y / scale;
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

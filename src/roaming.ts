import { getCurrentWindow, currentMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import { setPetState } from "./main";

// Deteccion segura de entorno Tauri v2
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const appWindow = isTauri ? getCurrentWindow() : null;

// --- ESTADO DE MOVIMIENTO Y LOCOMOCION ---
let isPinned = false;            // true = Fijo en pantalla | false = Modo patrulla libre
let isDragging = false;          // Pausa el movimiento automatico durante arrastre manual
let hasActiveAlert = false;      // Detiene la caminata mientras hay una alerta desplegada
let facingDirection: 1 | -1 = 1; // 1 = Derecha, -1 = Izquierda

// Coordenadas fisicas de la ventana en el monitor
let winX = 200;
let winY = 700;
let targetX = 600;
let minX = 20;
let maxX = 1200;

const WALK_SPEED = 2.5; // Pixeles por tick
let isWalkingNow = false;
let waitTimer = 0;

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
      // Limites horizontales seguros dentro de la pantalla
      minX = 20;
      maxX = monitor.size.width - winSize.width - 20;

      // Por defecto se posiciona en el borde inferior (justo encima del Dock)
      winY = monitor.size.height - winSize.height - 70;
      await appWindow.setPosition(new PhysicalPosition(Math.round(winX), Math.round(winY)));
    }

    pickNextDestination();
    setInterval(updateMovementStep, 30); // ~33 ticks por segundo para movimiento fluido
  } catch (err) {
    console.debug("[Roaming] Error al inicializar monitor:", err);
  }
}

/**
 * 2. Selecciona aleatoriamente el siguiente punto de destino
 */
function pickNextDestination() {
  targetX = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
  facingDirection = targetX >= winX ? 1 : -1;
}

/**
 * 3. Bucle de locomocion: actualiza la posicion de la ventana o mantiene estado IDLE
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
    // Llegada a destino: reposo en IDLE entre 3 y 7 segundos
    winX = targetX;
    isWalkingNow = false;
    waitTimer = Math.floor(Math.random() * 130) + 100;
    setPetState("IDLE");
  } else {
    // Paso en direccion horizontal
    winX += Math.sign(dist) * WALK_SPEED;
    try {
      await appWindow.setPosition(new PhysicalPosition(Math.round(winX), Math.round(winY)));
    } catch (err) {
      console.debug("[Roaming] Error al posicionar ventana:", err);
    }
  }
}

/**
 * 4. Alternar entre Modo Fijo (Anclado) y Modo Libre (Patrulla)
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
    waitTimer = 20;
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
 * 5. Notificar presencia de alerta activa para frenar la caminata
 */
export function setRoamingAlertState(hasAlert: boolean) {
  hasActiveAlert = hasAlert;
  if (hasAlert) {
    isWalkingNow = false;
  }
}

/**
 * 6. Sincronizar coordenadas tras arrastre manual del usuario
 */
export async function syncPositionAfterUserDrag() {
  if (!appWindow) return;
  try {
    const pos = await appWindow.outerPosition();
    winX = pos.x;
    winY = pos.y;
  } catch (err) {
    console.debug("[Roaming] Error al sincronizar posicion tras arrastre:", err);
  }
}

export function setIsDragging(dragging: boolean) {
  isDragging = dragging;
}

export function getFacingDirection(): 1 | -1 {
  return facingDirection;
}

export function getIsPinned(): boolean {
  return isPinned;
}

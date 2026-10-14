import { CharacterRenderer, SpeechBubble, CharacterState } from "./skinEngine";

// Detección segura de entorno Tauri v2
const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

let invokeTauri: ((cmd: string, args?: Record<string, unknown>) => Promise<unknown>) | null = null;
let startDraggingTauri: (() => Promise<void>) | null = null;

if (isTauri) {
  import("@tauri-apps/api/core").then((core) => {
    invokeTauri = core.invoke;
  });
  import("@tauri-apps/api/window").then((win) => {
    startDraggingTauri = () => win.getCurrentWindow().startDragging();
  });
}

const canvas = document.getElementById("pet-canvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 320;
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// Instanciar el motor del personaje
const renderer = new CharacterRenderer("spartan");

// Estado para no saturar el canal IPC de Tauri con llamadas redundantes
let isCurrentlyIgnoring = true;
let currentFrameImageData: Uint8ClampedArray | null = null;

// Umbral de opacidad (0 a 255). Todo píxel con Alpha > 20 es sólido
const ALPHA_THRESHOLD = 20;

/**
 * 1. Dibuja el frame y actualiza la caché de píxeles en memoria
 */
function renderFrame(_now: number) {
  // Delta time aproximado a 60 FPS
  renderer.update(16);
  renderer.draw(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Guardamos la matriz de píxeles del frame exacto para O(1) hit-testing
  currentFrameImageData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;

  requestAnimationFrame(renderFrame);
}

/**
 * 2. Hit-Testing: consulta si el píxel en (x, y) tiene opacidad > ALPHA_THRESHOLD
 */
function isPixelSolid(x: number, y: number): boolean {
  if (!currentFrameImageData) return false;

  const px = Math.floor(x);
  const py = Math.floor(y);

  if (px < 0 || px >= CANVAS_WIDTH || py < 0 || py >= CANVAS_HEIGHT) {
    return false;
  }

  // En ImageData cada píxel ocupa 4 bytes: [R, G, B, A]
  const alphaIndex = (py * CANVAS_WIDTH + px) * 4 + 3;
  return currentFrameImageData[alphaIndex] > ALPHA_THRESHOLD;
}

/**
 * 3. Bucle de detección de cursor a nivel de Sistema Operativo (50ms = 20 Hz)
 */
async function checkCursorHitTest() {
  if (!isTauri || !invokeTauri) return;

  try {
    const pos = (await invokeTauri("get_cursor_rel_pos")) as {
      x: number;
      y: number;
      inside: boolean;
    };

    if (!pos.inside) {
      if (!isCurrentlyIgnoring) {
        isCurrentlyIgnoring = true;
        await invokeTauri("set_ignore_cursor", { ignore: true });
        updateCursorStatus(false, false);
      }
      return;
    }

    const touchingSolidPixel = isPixelSolid(pos.x, pos.y);
    const shouldIgnore = !touchingSolidPixel;

    if (shouldIgnore !== isCurrentlyIgnoring) {
      isCurrentlyIgnoring = shouldIgnore;
      await invokeTauri("set_ignore_cursor", { ignore: shouldIgnore });
      updateCursorStatus(pos.inside, touchingSolidPixel);
      canvas.style.cursor = touchingSolidPixel ? "pointer" : "default";
    }
  } catch (err) {
    console.debug("Hit-test poll error:", err);
  }
}

/**
 * Manejador de clics:
 * - Si se hace clic sobre el globo de texto, se interactúa con él
 * - Si se hace clic sobre el personaje, se inicia el arrastre nativo de ventana
 */
canvas.addEventListener("mousedown", async (e) => {
  if (e.button !== 0) return;

  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Clic en el globo de texto (zona superior del canvas)
  if (renderer.bubble && clickY <= 104 && isPixelSolid(clickX, clickY)) {
    console.log("Globo interactuado:", renderer.bubble.title);
    renderer.setBubble(null);
    renderer.setState("celebrate");
    setTimeout(() => {
      if (renderer.state === "celebrate") renderer.setState("idle");
    }, 2000);
    return;
  }

  // Clic en el cuerpo del personaje: arrastrar la ventana
  if (isTauri && startDraggingTauri && isPixelSolid(clickX, clickY)) {
    await startDraggingTauri();
  }
});

// Soporte para depuración en navegador web (cuando no corre dentro de Tauri)
if (!isTauri) {
  canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const touching = isPixelSolid(x, y);
    canvas.style.cursor = touching ? "pointer" : "default";
    updateCursorStatus(true, touching);
  });
}

function updateCursorStatus(inside: boolean, solid: boolean) {
  const statusEl = document.getElementById("status-cursor");
  if (!statusEl) return;
  if (!inside) {
    statusEl.textContent = "Modo: Fuera de ventana (Click-Through activo)";
    statusEl.style.color = "#64748b";
  } else if (solid) {
    statusEl.textContent = "Modo: Píxel sólido detectado (Clic activo)";
    statusEl.style.color = "#22c55e";
  } else {
    statusEl.textContent = "Modo: Área transparente (Click-Through activo)";
    statusEl.style.color = "#eab308";
  }
}

/* -------------------------------------------------------------
 * Interfaz de Depuración y Simulación de Eventos
 * ------------------------------------------------------------*/
const debugPanel = document.getElementById("debug-panel") as HTMLDivElement;
const btnCloseDebug = document.getElementById("btn-close-debug") as HTMLButtonElement;
const selectSkin = document.getElementById("select-skin") as HTMLSelectElement;
const btnSemester = document.getElementById("btn-event-semester") as HTMLButtonElement;
const btnGithub = document.getElementById("btn-event-github") as HTMLButtonElement;

// Mostrar panel con la tecla 'D'
window.addEventListener("keydown", (e) => {
  if (e.key === "d" || e.key === "D") {
    debugPanel.classList.toggle("hidden");
  }
});

btnCloseDebug.addEventListener("click", () => {
  debugPanel.classList.add("hidden");
});

// En navegador tradicional sin Tauri, mostrar panel por defecto para facilitar pruebas
if (!isTauri) {
  debugPanel.classList.remove("hidden");
}

selectSkin.addEventListener("change", (e) => {
  const skinId = (e.target as HTMLSelectElement).value;
  renderer.setSkin(skinId);
});

// Botones de cambio de animación
document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".btn-action").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const action = btn.dataset.action as CharacterState;
    renderer.setState(action);
  });
});

// Simulación de evento: Entrega del Semestre
btnSemester.addEventListener("click", () => {
  const skin = renderer.getSkin();
  const alertBubble: SpeechBubble = {
    title: "Alerta: Entrega en 2h",
    message: skin.id === "spartan"
      ? "¡Guerrero! Quedan 2 horas para entregar Sistemas Distribuidos."
      : "Deadline inminente: 2 horas restantes para el reporte final.",
    actionText: "[ Marcar Entregada ]",
    source: "semester",
    expiresAt: Date.now() + 15000,
  };

  renderer.setState("alert");
  renderer.setBubble(alertBubble);
});

// Simulación de evento: GitHub
btnGithub.addEventListener("click", () => {
  const githubBubble: SpeechBubble = {
    title: "GitHub: PR Aprobado",
    message: "Pull Request #42 merged exitosamente en main. Tests en verde.",
    actionText: "[ Ver en GitHub ]",
    source: "github",
    expiresAt: Date.now() + 12000,
  };

  renderer.setState("celebrate");
  renderer.setBubble(githubBubble);
});

// Iniciar bucles de render y polling
requestAnimationFrame(renderFrame);
if (isTauri) {
  setInterval(checkCursorHitTest, 50);
}

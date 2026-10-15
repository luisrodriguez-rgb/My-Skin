import { emit, listen, isTauri } from "./platform";
import { invoke } from "@tauri-apps/api/core";
import type { AppState, PetStateName } from "./appState";

const selectSkin = document.querySelector<HTMLSelectElement>("#select-skin")!;
const charName = document.getElementById("char-name")!;
const charSpec = document.getElementById("char-spec")!;
const thumbnail = document.querySelector<HTMLCanvasElement>("#thumb-canvas")!;
const sound = document.querySelector<HTMLButtonElement>("#btn-sound-toggle")!;
const pin = document.querySelector<HTMLButtonElement>("#btn-pin-toggle")!;
const fsm = document.getElementById("status-fsm-text")!;
const pomoClock = document.getElementById("pomo-clock")!;
const pomoStatus = document.getElementById("pomo-status")!;
const pomoToggle = document.querySelector<HTMLButtonElement>("#btn-pomo-toggle")!;
const calendarUrl = document.querySelector<HTMLInputElement>("#input-calendar-url")!;
const syncButton = document.querySelector<HTMLButtonElement>("#btn-sync-calendar")!;
const syncFeedback = document.getElementById("sync-feedback")!;
const controls = document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>("button, select");
let state: AppState | null = null;
let loadedSkin = "";
let lastCalendarUrl: string | null = null;
let metadataSequence = 0;
let lastStateAt = 0;

function setConnected(connected: boolean) {
  controls.forEach((control) => { control.disabled = !connected; });
  if (!connected) fsm.textContent = "Esperando al personaje. Abre MySkin para conectar.";
}
setConnected(false);

async function loadMetadata(skin: string) {
  const sequence = ++metadataSequence;
  try {
    const response = await fetch(`/skins/${skin}/manifest.json`);
    if (!response.ok) throw new Error("No se pudo cargar el personaje.");
    const manifest = await response.json();
    const image = new Image();
    const ready = new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; });
    image.src = `/skins/${skin}/spritesheet.png`;
    await ready;
    if (sequence !== metadataSequence) return;
    charName.textContent = manifest.name;
    charSpec.textContent = `Skin pixel · ${manifest.frameWidth} × ${manifest.frameHeight}`;
    const context = thumbnail.getContext("2d")!;
    context.clearRect(0, 0, thumbnail.width, thumbnail.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, manifest.states.IDLE.row * manifest.frameHeight,
      manifest.frameWidth, manifest.frameHeight, 0, 0, thumbnail.width, thumbnail.height);
    loadedSkin = skin;
  } catch { loadedSkin = ""; charName.textContent = "No se pudo cargar el personaje"; }
}

function render(snapshot: AppState) {
  state = snapshot;
  lastStateAt = Date.now();
  setConnected(true);
  selectSkin.value = snapshot.skin;
  if (loadedSkin !== snapshot.skin) { loadedSkin = snapshot.skin; void loadMetadata(snapshot.skin); }
  sound.textContent = snapshot.audio ? "AUDIO: ON" : "AUDIO: OFF";
  sound.classList.toggle("active", snapshot.audio);
  pin.textContent = snapshot.pinned ? "MODO: FIJO" : "MODO: LIBRE";
  pin.classList.toggle("active", snapshot.pinned);
  fsm.textContent = `Estado: ${snapshot.petState}`;
  document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((button) => {
    button.classList.toggle("active", button.dataset.action === snapshot.petState);
  });
  const { phase, running, remainingSeconds } = snapshot.pomodoro;
  pomoClock.textContent = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  pomoStatus.textContent = phase === "idle" ? "En reposo" : !running ? "En pausa" : phase === "focus" ? "Concentración activa" : "Descanso";
  pomoToggle.textContent = running ? "PAUSAR" : phase === "idle" ? "INICIAR FOCO" : "CONTINUAR";
  if (lastCalendarUrl !== snapshot.calendar.url) {
    calendarUrl.value = snapshot.calendar.url;
    lastCalendarUrl = snapshot.calendar.url;
  }
  syncButton.disabled = snapshot.calendar.syncing;
  syncFeedback.textContent = snapshot.calendar.syncing ? "Sincronizando calendario…"
    : snapshot.calendar.error ? `Error: ${snapshot.calendar.error}`
    : `${snapshot.calendar.count} entregas · ${snapshot.calendar.lastSync}`;
}

function command<T>(name: string, payload?: T) {
  void emit(name, payload).catch(() => { fsm.textContent = "No se pudo enviar la acción. Inténtalo de nuevo."; });
}
selectSkin.addEventListener("change", () => command("skin-changed", selectSkin.value));
sound.addEventListener("click", () => { if (state) command("toggle-audio", !state.audio); });
pin.addEventListener("click", () => { if (state) command("toggle-pin", !state.pinned); });
document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((button) => {
  button.addEventListener("click", () => command("set-pet-state", { state: button.dataset.action as PetStateName }));
});
pomoToggle.addEventListener("click", () => command("pomo-toggle"));
document.getElementById("btn-pomo-reset")!.addEventListener("click", () => command("pomo-reset"));
syncButton.addEventListener("click", () => {
  const url = calendarUrl.value.trim();
  if (!url) { syncFeedback.textContent = "Ingresa una URL de calendario."; return; }
  command("calendar-sync", url);
});
document.getElementById("btn-event-semester")!.addEventListener("click", () => command("set-pet-state", {
  state: "ALERT_SEMESTRE", notification: { title: "DEMO: ENTREGA ACADÉMICA", subtitle: "Esta es una alerta de prueba", urgent: true },
}));
document.getElementById("btn-event-github")!.addEventListener("click", () => command("set-pet-state", {
  state: "VICTORY_GITHUB", notification: { title: "DEMO: GITHUB MERGE", subtitle: "Esta es una celebración de prueba", urgent: false },
}));
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isTauri) {
    void invoke("toggle_controller_window", { visible: false }).catch(() => { fsm.textContent = "No se pudo ocultar el controlador."; });
  }
});

async function connect() {
  await listen<AppState>("state-changed", ({ payload }) => render(payload));
  await emit("state-request");
  const heartbeat = window.setInterval(() => {
    if (Date.now() - lastStateAt > 5000) setConnected(false);
    command("state-request");
  }, 2000);
  window.addEventListener("pagehide", () => clearInterval(heartbeat), { once: true });
}
void connect().catch(() => { fsm.textContent = "No se pudo conectar con MySkin."; });

import { emit, listen, isTauri } from "./platform";
import { invoke } from "@tauri-apps/api/core";
import { calendarFeedUrl, safeTaskUrl } from "./webLinks";
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
const deadlineList = document.getElementById("deadline-list")!;
const notificationList = document.getElementById("notification-list")!;
const skinFeedback = document.getElementById("skin-error")!;
const actionFeedback = document.getElementById("action-error")!;
let state: AppState | null = null;
let loadedSkin = "";
let lastCalendarUrl: string | null = null;
let metadataSequence = 0;
let lastStateAt = 0;
let validationError = "";
let metadataError = "";
let commandError = "";
let taskSignature = "";
let notificationSignature = "";
let previousCompleted = new Set<string>();
let connected = false;

function setConnected(value: boolean) {
  connected = value;
  document.querySelectorAll<HTMLButtonElement | HTMLSelectElement>("button, select").forEach((control) => {
    control.disabled = !value || control.dataset.completed === "true";
  });
  if (!value) fsm.textContent = "Esperando al personaje. Abre MySkin para conectar.";
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
    charSpec.textContent = "Tu compañero de escritorio";
    const context = thumbnail.getContext("2d")!;
    context.clearRect(0, 0, thumbnail.width, thumbnail.height);
    context.imageSmoothingEnabled = false;
    context.drawImage(image, 0, manifest.states.IDLE.row * manifest.frameHeight,
      manifest.frameWidth, manifest.frameHeight, 0, 0, thumbnail.width, thumbnail.height);
    thumbnail.setAttribute("aria-label", manifest.name);
    metadataError = "";
    loadedSkin = skin;
  } catch {
    if (sequence !== metadataSequence) return;
    loadedSkin = "";
    metadataError = "No se pudo cargar la vista del personaje. Vuelve a seleccionarlo.";
  }
  showError(skinFeedback, state?.skinError || metadataError);
}

function showError(element: HTMLElement, message?: string) {
  const value = message || "";
  if (element.textContent !== value) element.textContent = value;
  element.hidden = !value;
}

function renderFeedback() {
  calendarUrl.setAttribute("aria-invalid", String(!!validationError));
  syncFeedback.classList.toggle("feedback-error", !!validationError || !!state?.calendar.error);
  const text = validationError || (state?.calendar.syncing ? "Sincronizando calendario…"
    : state?.calendar.error ? `Error: ${state.calendar.error}`
    : `${state?.calendar.count ?? 0} entregas · ${state?.calendar.lastSync ?? "Sin sincronizar"}`);
  if (syncFeedback.textContent !== text) syncFeedback.textContent = text;
}

function taskTime(dueAt: number, completed: boolean): string {
  if (completed) return "Completada";
  const minutes = Math.ceil((dueAt - Date.now()) / 60000);
  if (minutes <= 0) return "Plazo vencido";
  if (minutes < 60) return `Vence en ${minutes} min`;
  if (minutes < 24 * 60) return `Vence en ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `Vence el ${new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(dueAt)}`;
}

function renderTasks(snapshot: AppState) {
  const deadlines = snapshot.calendar.deadlines;
  const signature = JSON.stringify(deadlines.map(({ id, course, title, dueAt, completed, link }) => ({ id, course, title, dueAt, completed, link })));
  if (signature !== taskSignature) {
    const focused = document.activeElement instanceof HTMLElement && deadlineList.contains(document.activeElement);
    deadlineList.replaceChildren();
    for (const deadline of deadlines) {
      const item = document.createElement("li");
      item.className = `deadline-item${deadline.completed ? " completed" : ""}`;
      item.dataset.deadlineId = deadline.id;
      const info = document.createElement("div"); info.className = "item-info";
      const course = document.createElement("span"); course.className = "group-caption"; course.textContent = deadline.course;
      const title = document.createElement("h3"); title.textContent = deadline.title;
      const time = document.createElement("span"); time.className = "deadline-time";
      const date = document.createElement("time");
      date.dateTime = new Date(deadline.dueAt).toISOString();
      date.textContent = new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(deadline.dueAt);
      date.className = "group-caption";
      info.append(course, title, time, date);
      const actions = document.createElement("div"); actions.className = "item-actions";
      const complete = document.createElement("button"); complete.className = "secondary-button";
      complete.textContent = deadline.completed ? "Completada" : "Completar";
      complete.setAttribute("aria-label", `Completar ${deadline.title}`);
      complete.dataset.completed = String(deadline.completed);
      complete.disabled = deadline.completed || !connected;
      complete.addEventListener("click", () => command("deadline-complete", deadline.id));
      actions.append(complete);
      const url = safeTaskUrl(deadline.link);
      if (url) {
        const link = document.createElement("a"); link.className = "secondary-button";
        link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
        link.textContent = "Abrir entrega"; link.setAttribute("aria-label", `Abrir ${deadline.title}`);
        link.addEventListener("click", (event) => {
          if (isTauri) { event.preventDefault(); command("deadline-open", deadline.id); }
        });
        actions.append(link);
      }
      item.append(info, actions); deadlineList.append(item);
      if (deadline.completed && !previousCompleted.has(deadline.id) && taskSignature) {
        document.getElementById("task-feedback")!.textContent = `Entrega completada: ${deadline.title}`;
      }
    }
    if (focused) document.getElementById("deadlines-heading")!.focus();
    taskSignature = signature;
    previousCompleted = new Set(deadlines.filter((d) => d.completed).map((d) => d.id));
  }
  for (const item of deadlineList.children) {
    const deadline = deadlines.find((entry) => entry.id === (item as HTMLElement).dataset.deadlineId)!;
    item.querySelector(".deadline-time")!.textContent = taskTime(deadline.dueAt, deadline.completed);
    item.classList.toggle("urgent", !deadline.completed && deadline.urgent);
  }
  document.getElementById("deadlines-empty")!.hidden = deadlines.length > 0;
  const pending = deadlines.filter((d) => !d.completed).length;
  document.getElementById("deadline-count")!.textContent = deadlines.length ? `${pending} pendientes · ${deadlines.length - pending} completadas` : "";
}

function renderNotifications(snapshot: AppState) {
  const signature = snapshot.notifications.map((item) => item.id).join("|");
  if (signature !== notificationSignature) {
    const focused = document.activeElement instanceof HTMLElement && notificationList.contains(document.activeElement);
    notificationList.replaceChildren();
    for (const notification of snapshot.notifications) {
      const item = document.createElement("li"); item.className = "notification-item";
      const info = document.createElement("div"); info.className = "item-info";
      const title = document.createElement("h3"); const subtitle = document.createElement("p");
      info.append(title, subtitle);
      const dismiss = document.createElement("button"); dismiss.className = "secondary-button";
      dismiss.textContent = "Descartar"; dismiss.setAttribute("aria-label", `Descartar ${notification.subtitle}`);
      dismiss.addEventListener("click", () => command("notification-dismiss", notification.id));
      item.dataset.notificationId = notification.id;
      item.append(info, dismiss); notificationList.append(item);
    }
    notificationSignature = signature;
    if (focused) {
      if (snapshot.notifications.length) document.getElementById("notifications-heading")!.focus();
      else pomoToggle.focus();
    }
  }
  for (const item of notificationList.children) {
    const notification = snapshot.notifications.find((entry) => entry.id === (item as HTMLElement).dataset.notificationId)!;
    item.querySelector("h3")!.textContent = notification.title;
    item.querySelector("p")!.textContent = notification.subtitle;
    item.classList.toggle("current", notification.id === snapshot.activeNotificationId);
  }
  document.getElementById("notifications-section")!.hidden = !snapshot.notifications.length;
  document.getElementById("notification-count")!.textContent = String(snapshot.notifications.length);
}

function render(snapshot: AppState) {
  state = snapshot;
  lastStateAt = Date.now();
  setConnected(true);
  selectSkin.value = snapshot.skin;
  if (loadedSkin !== snapshot.skin) { loadedSkin = snapshot.skin; void loadMetadata(snapshot.skin); }
  sound.textContent = snapshot.audio ? "AUDIO: ON" : "AUDIO: OFF";
  sound.classList.toggle("active", snapshot.audio);
  sound.setAttribute("aria-pressed", String(snapshot.audio));
  pin.textContent = snapshot.pinned ? "MODO: FIJO" : "MODO: LIBRE";
  pin.classList.toggle("active", snapshot.pinned);
  pin.setAttribute("aria-pressed", String(snapshot.pinned));
  fsm.textContent = `Estado: ${snapshot.petState}`;
  document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((button) => {
    button.classList.toggle("active", button.dataset.action === snapshot.petState);
    button.setAttribute("aria-pressed", String(button.dataset.action === snapshot.petState));
  });
  const { phase, running, remainingSeconds } = snapshot.pomodoro;
  pomoClock.textContent = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  pomoStatus.textContent = phase === "idle" ? "En reposo" : !running ? "En pausa" : phase === "focus" ? "Concentración activa" : "Descanso";
  pomoToggle.textContent = running ? "Pausar" : phase === "idle" ? "Concentrarme" : "Continuar";
  if (lastCalendarUrl !== snapshot.calendar.url) { calendarUrl.value = snapshot.calendar.url; lastCalendarUrl = snapshot.calendar.url; }
  syncButton.disabled = snapshot.calendar.syncing;
  renderFeedback(); renderTasks(snapshot); renderNotifications(snapshot);
  showError(skinFeedback, snapshot.skinError || metadataError);
  showError(actionFeedback, commandError || snapshot.actionError);
}

function command<T>(name: string, payload?: T) {
  commandError = "";
  void emit(name, payload).catch(() => {
    commandError = "No se pudo enviar la acción. Inténtalo de nuevo.";
    showError(actionFeedback, commandError);
  });
}
selectSkin.addEventListener("change", () => command("skin-changed", selectSkin.value));
sound.addEventListener("click", () => { if (state) command("toggle-audio", !state.audio); });
pin.addEventListener("click", () => { if (state) command("toggle-pin", !state.pinned); });
document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((button) => {
  button.addEventListener("click", () => command("set-pet-state", { state: button.dataset.action as PetStateName }));
});
pomoToggle.addEventListener("click", () => command("pomo-toggle"));
document.getElementById("btn-pomo-reset")!.addEventListener("click", () => command("pomo-reset"));
calendarUrl.addEventListener("input", () => { validationError = ""; renderFeedback(); });
syncButton.addEventListener("click", () => {
  const url = calendarUrl.value.trim();
  validationError = !url ? "Ingresa una URL de calendario." : !calendarFeedUrl(url) ? "Usa una URL HTTP, HTTPS o webcal válida." : "";
  renderFeedback();
  if (validationError) { calendarUrl.focus(); return; }
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
    void invoke("toggle_controller_window", { visible: false }).catch(() => {
      commandError = "No se pudo ocultar el controlador."; showError(actionFeedback, commandError);
    });
  }
});

async function connect() {
  await listen<AppState>("state-changed", ({ payload }) => render(payload));
  await emit("state-request");
  const heartbeat = window.setInterval(() => {
    if (Date.now() - lastStateAt > 5000) setConnected(false);
    void emit("state-request").catch(() => setConnected(false));
  }, 2000);
  window.addEventListener("pagehide", () => clearInterval(heartbeat), { once: true });
}
void connect().catch(() => { fsm.textContent = "No se pudo conectar con MySkin."; });

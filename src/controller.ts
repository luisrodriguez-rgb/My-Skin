import { emit, listen, isTauri } from "./platform";
import { invoke } from "@tauri-apps/api/core";
import { calendarFeedUrl, safeTaskUrl } from "./webLinks";
import { setupTabs } from "./controllerTabs";
import { skinCatalog, loadPreview, drawPreview, type SkinCategory } from "./skinCatalog";
import type { AppState, PetStateName } from "./appState";

const charName = document.getElementById("char-name")!;
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
const githubRepo = document.querySelector<HTMLInputElement>("#input-github-repo")!;
const githubFeedback = document.getElementById("github-feedback")!;
const petGrid = document.getElementById("pet-grid")!;
const petSearch = document.querySelector<HTMLInputElement>("#input-pet-search");
const categoryFilters = document.getElementById("pet-category-filters");
const petGridEmpty = document.getElementById("pet-grid-empty");
const scheduleSection = document.getElementById("schedule-section")!;
const scheduleList = document.getElementById("schedule-list")!;
const scheduleEmpty = document.getElementById("schedule-empty")!;
const scheduleCaption = document.getElementById("schedule-caption")!;
const misemestreUrl = document.querySelector<HTMLInputElement>("#input-misemestre-url")!;
const misemestreToggle = document.querySelector<HTMLButtonElement>("#btn-toggle-misemestre")!;
const misemestreFeedback = document.getElementById("misemestre-feedback")!;
let state: AppState | null = null;
let lastCalendarUrl: string | null = null;
let lastRepository: string | null = null;
let lastMisemestreUrl: string | null = null;
let selectedCategory: SkinCategory = "all";
let searchQuery = "";
let calendarDraftChanged = false;
let repositoryDraftChanged = false;
let misemestreDraftChanged = false;
let metadataSequence = 0;
let heroKey = "";
let lastStateAt = 0;
let validationError = "";
let githubValidationError = "";
let metadataError = "";
let commandError = "";
let taskSignature = "";
let scheduleSignature = "";
let notificationSignature = "";
let previousCompleted = new Set<string>();
let connected = false;
let galleryReady = false;

const activateTab = setupTabs((panel) => {
  if (panel === "pets") initializeGallery();
  window.scrollTo({ top: 0, behavior: "auto" });
});
document.querySelector(".brand")!.addEventListener("click", (event) => { event.preventDefault(); activateTab("today", true); });
document.getElementById("choose-companion")!.addEventListener("click", () => activateTab("pets", true));
document.querySelectorAll<HTMLButtonElement>("[data-calendar-shortcut]").forEach((button) => {
  button.addEventListener("click", () => { activateTab("settings"); calendarUrl.focus(); });
});

function setConnected(value: boolean) {
  connected = value;
  document.querySelectorAll<HTMLButtonElement>("[data-command]").forEach((control) => {
    control.disabled = !value || control.dataset.completed === "true" || (!!state?.skinLoading && control.dataset.skin === state.skinLoading);
  });
  const status = document.getElementById("connection-status")!;
  const label = value ? "En compañía" : "Abre MySkin para conectar";
  if (status.textContent !== label) status.textContent = label;
  status.dataset.connected = String(value);
}
setConnected(false);

async function loadMetadata(snapshot: AppState) {
  const key = `${snapshot.skin}:${snapshot.petState}`;
  if (heroKey === key) return;
  heroKey = key;
  const sequence = ++metadataSequence;
  const name = skinCatalog.find((skin) => skin.id === snapshot.skin)?.name ?? snapshot.skin;
  charName.textContent = name;
  thumbnail.setAttribute("aria-label", `${name}, tu compañero`);
  try {
    const asset = await loadPreview(snapshot.skin);
    if (sequence !== metadataSequence) return;
    drawPreview(thumbnail, asset, snapshot.petState);
    metadataError = "";
  } catch {
    if (sequence !== metadataSequence) return;
    heroKey = "";
    metadataError = "No se pudo cargar la vista del personaje. Vuelve a seleccionarlo.";
  }
  showError(skinFeedback, state?.skinError || metadataError);
}

function applyGalleryFilters() {
  const query = searchQuery.trim().toLowerCase();
  let visibleCount = 0;

  for (const button of petGrid.querySelectorAll<HTMLButtonElement>("[data-skin]")) {
    const skinId = button.dataset.skin;
    const skin = skinCatalog.find((item) => item.id === skinId);
    if (!skin) continue;

    const matchesCategory = selectedCategory === "all" || skin.category === selectedCategory;
    const matchesSearch = !query ||
      skin.name.toLowerCase().includes(query) ||
      skin.detail.toLowerCase().includes(query) ||
      skin.id.toLowerCase().includes(query);

    const visible = matchesCategory && matchesSearch;
    button.hidden = !visible;
    if (visible) visibleCount++;
  }

  if (petGridEmpty) {
    petGridEmpty.hidden = visibleCount > 0;
  }
}

function initializeGallery() {
  if (galleryReady) return;
  galleryReady = true;

  petSearch?.addEventListener("input", () => {
    searchQuery = petSearch.value;
    applyGalleryFilters();
  });

  categoryFilters?.addEventListener("click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>(".filter-chip");
    if (!target || !target.dataset.category) return;
    selectedCategory = target.dataset.category as SkinCategory;

    categoryFilters.querySelectorAll<HTMLButtonElement>(".filter-chip").forEach((chip) => {
      const active = chip === target;
      chip.classList.toggle("active", active);
      chip.setAttribute("aria-pressed", String(active));
    });

    applyGalleryFilters();
  });

  for (const skin of skinCatalog) {
    const button = document.createElement("button");
    button.className = "pet-choice"; button.dataset.skin = skin.id; button.dataset.command = "";
    button.style.setProperty("--pet-color", skin.color);
    button.setAttribute("aria-label", `Elegir ${skin.name}`);
    button.setAttribute("aria-pressed", String(state?.skin === skin.id));
    button.disabled = !connected;
    const canvas = document.createElement("canvas"); canvas.width = 96; canvas.height = 96; canvas.setAttribute("aria-hidden", "true");
    const name = document.createElement("span"); name.className = "pet-label"; name.textContent = skin.name;
    const detail = document.createElement("span"); detail.className = "pet-detail"; detail.textContent = skin.detail;
    const selected = document.createElement("span"); selected.className = "pet-selection";
    button.append(canvas, name, detail, selected); petGrid.append(button);
    button.addEventListener("click", () => command("skin-changed", skin.id));
    void loadPreview(skin.id).then((asset) => drawPreview(canvas, asset)).catch(() => { detail.textContent = "Vista previa no disponible"; });
  }
  applyGalleryFilters();
  if (state) renderGallery(state);
}

function renderGallery(snapshot: AppState) {
  petGrid.setAttribute("aria-busy", String(!!snapshot.skinLoading));
  for (const button of petGrid.querySelectorAll<HTMLButtonElement>("[data-skin]")) {
    const selected = button.dataset.skin === snapshot.skin;
    const loading = button.dataset.skin === snapshot.skinLoading;
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-busy", String(loading));
    button.querySelector(".pet-selection")!.textContent = loading ? "Cargando…" : selected ? "Tu compañero" : "Elegir";
    button.disabled = !connected || loading;
  }
  const name = skinCatalog.find((skin) => skin.id === snapshot.skin)?.name ?? snapshot.skin;
  const text = snapshot.skinLoading ? "Preparando tu compañero…" : `${name} te acompaña. Listo para seguir en Hoy.`;
  const feedback = document.getElementById("companion-feedback")!;
  if (feedback.textContent !== text) feedback.textContent = text;
}

function showError(element: HTMLElement, message?: string) {
  const value = message || "";
  if (element.textContent !== value) element.textContent = value;
  element.hidden = !value;
}

function renderFeedback() {
  calendarUrl.setAttribute("aria-invalid", String(!!validationError));
  syncFeedback.classList.toggle("feedback-error", !!validationError || !!state?.calendar.error);
  const count = state?.calendar.count ?? 0;
  const text = validationError || (state?.calendar.syncing ? "Sincronizando calendario…"
    : state?.calendar.error ? `Error: ${state.calendar.error}`
    : `${count} ${count === 1 ? "entrega" : "entregas"} · ${state?.calendar.lastSync ?? "Sin sincronizar"}`);
  if (syncFeedback.textContent !== text) syncFeedback.textContent = text;
  const githubError = githubValidationError || state?.github.error;
  githubRepo.setAttribute("aria-invalid", String(!!githubValidationError));
  githubFeedback.classList.toggle("feedback-error", !!githubError);
  const githubText = githubError || (state ? `Repositorio elegido: ${state.github.repository}` : "Esperando al personaje.");
  if (githubFeedback.textContent !== githubText) githubFeedback.textContent = githubText;

  if (misemestreFeedback && state?.misemestre) {
    const m = state.misemestre;
    misemestreFeedback.classList.toggle("feedback-error", !!m.error);
    const mText = m.syncing
      ? "Conectando con MiSemestre…"
      : m.error
      ? `Error: ${m.error}`
      : m.connected
      ? `Conectado a MiSemestre · ${m.todayClasses.length} clases hoy · ${m.lastSync || "Sincronizado"}`
      : m.enabled
      ? "Intentando conectar con MiSemestre…"
      : "Integración desactivada.";
    if (misemestreFeedback.textContent !== mText) misemestreFeedback.textContent = mText;
  }
}

function renderSchedule(snapshot: AppState) {
  const misemestre = snapshot.misemestre;
  if (!misemestre || !misemestre.enabled) {
    scheduleSection.hidden = true;
    return;
  }
  scheduleSection.hidden = false;

  const classes = misemestre.todayClasses || [];
  const signature = JSON.stringify(classes.map((c) => ({ id: c.id, s: c.startTime, e: c.endTime, c: c.isCurrent, u: c.isUpcoming })));

  if (signature !== scheduleSignature) {
    scheduleList.replaceChildren();

    if (classes.length === 0) {
      scheduleEmpty.hidden = false;
      scheduleCaption.textContent = "Sin clases programadas para hoy.";
    } else {
      scheduleEmpty.hidden = true;
      scheduleCaption.textContent = misemestre.semester ? `${misemestre.semester} · ${classes.length} ${classes.length === 1 ? "clase hoy" : "clases hoy"}` : `${classes.length} clases hoy`;

      for (const item of classes) {
        const li = document.createElement("li");
        const statusClass = item.isCurrent ? "current" : item.isUpcoming ? "upcoming" : "past";
        li.className = `schedule-item ${statusClass}`;
        if (item.color) li.style.setProperty("--class-color", item.color);

        const info = document.createElement("div");
        info.className = "item-info";

        const topRow = document.createElement("div");
        topRow.style.display = "flex";
        topRow.style.gap = "8px";
        topRow.style.alignItems = "center";

        const tag = document.createElement("span");
        tag.className = `schedule-tag ${statusClass}`;
        tag.textContent = item.isCurrent
          ? "En curso"
          : item.isUpcoming
          ? item.startsInMinutes <= 60
            ? `En ${item.startsInMinutes} min`
            : "Próxima"
          : "Terminada";

        const code = document.createElement("span");
        code.className = "group-caption";
        code.textContent = item.subjectCode ? `[${item.subjectCode}]` : "";

        topRow.append(tag, code);

        const title = document.createElement("h3");
        title.textContent = item.subjectName;

        const details = document.createElement("p");
        details.textContent = `${item.startTime} - ${item.endTime} · ${item.location}`;

        info.append(topRow, title, details);

        const actions = document.createElement("div");
        actions.className = "item-actions";

        if (item.isCurrent || item.isUpcoming) {
          const focusBtn = document.createElement("button");
          focusBtn.className = "secondary-button";
          focusBtn.textContent = "Foco";
          focusBtn.setAttribute("aria-label", `Foco para ${item.subjectName}`);
          focusBtn.dataset.command = "";
          focusBtn.disabled = !connected;
          focusBtn.addEventListener("click", () => {
            command("pomo-start-task", item.subjectName);
          });
          actions.append(focusBtn);
        }

        li.append(info, actions);
        scheduleList.append(li);
      }
    }
    scheduleSignature = signature;
  }
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
      complete.dataset.command = "";
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
    if (focused && !document.getElementById("today")!.hidden) document.getElementById("deadlines-heading")!.focus();
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
  document.getElementById("deadline-count")!.textContent = deadlines.length ? `${pending} ${pending === 1 ? "pendiente" : "pendientes"} · ${deadlines.length - pending} ${deadlines.length - pending === 1 ? "completada" : "completadas"}` : "";
}

function renderNotifications(snapshot: AppState) {
  const signature = JSON.stringify(snapshot.notifications.map((item) => [item.id, item.subtitle]));
  if (signature !== notificationSignature) {
    const focused = document.activeElement instanceof HTMLElement && notificationList.contains(document.activeElement);
    notificationList.replaceChildren();
    for (const notification of snapshot.notifications) {
      const item = document.createElement("li"); item.className = "notification-item";
      const info = document.createElement("div"); info.className = "item-info";
      const title = document.createElement("h3"); const subtitle = document.createElement("p");
      info.append(title, subtitle);
      const dismiss = document.createElement("button"); dismiss.className = "secondary-button";
      dismiss.dataset.command = "";
      dismiss.disabled = !connected;
      dismiss.textContent = "Descartar"; dismiss.setAttribute("aria-label", `Descartar ${notification.subtitle}`);
      dismiss.addEventListener("click", () => command("notification-dismiss", notification.id));
      item.dataset.notificationId = notification.id;
      item.append(info, dismiss); notificationList.append(item);
    }
    notificationSignature = signature;
    if (focused && !document.getElementById("today")!.hidden) {
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
  void loadMetadata(snapshot);
  renderGallery(snapshot);
  sound.textContent = snapshot.audio ? "Sonido activado" : "Sonido desactivado";
  sound.setAttribute("aria-pressed", String(snapshot.audio));
  pin.textContent = snapshot.pinned ? "Modo fijo" : "Modo libre";
  pin.setAttribute("aria-pressed", String(snapshot.pinned));
  fsm.textContent = `Estado: ${snapshot.petState}`;
  document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.action === snapshot.petState));
  });
  const { phase, running, remainingSeconds } = snapshot.pomodoro;
  pomoClock.textContent = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  pomoStatus.textContent = phase === "idle" ? "En reposo" : !running ? "En pausa" : phase === "focus" ? "Concentración activa" : "Descanso";
  pomoToggle.textContent = running ? "Pausar" : phase === "idle" ? "Concentrarme" : "Continuar";
  const pending = snapshot.calendar.deadlines.filter((deadline) => !deadline.completed);
  const next = pending.find((deadline) => deadline.dueAt > Date.now());
  if (snapshot.misemestre?.currentClass) {
    document.getElementById("focus-task")!.textContent = `En clase: ${snapshot.misemestre.currentClass.subjectName}`;
    document.getElementById("focus-course")!.textContent = `${snapshot.misemestre.currentClass.location} (${snapshot.misemestre.currentClass.startTime} - ${snapshot.misemestre.currentClass.endTime})`;
  } else if (snapshot.misemestre?.nextClass && snapshot.misemestre.nextClass.startsInMinutes <= 60 && snapshot.misemestre.nextClass.startsInMinutes > 0) {
    document.getElementById("focus-task")!.textContent = `Próxima clase: ${snapshot.misemestre.nextClass.subjectName}`;
    document.getElementById("focus-course")!.textContent = `${snapshot.misemestre.nextClass.location} (en ${snapshot.misemestre.nextClass.startsInMinutes} min)`;
  } else {
    document.getElementById("focus-task")!.textContent = next?.title || "Haz espacio para concentrarte.";
    document.getElementById("focus-course")!.textContent = next?.course || "Un paso pequeño también cuenta.";
  }
  document.getElementById("summary-pending")!.textContent = String(pending.length);
  document.getElementById("summary-completed")!.textContent = String(snapshot.calendar.deadlines.length - pending.length);
  const today = new Date().toDateString();
  document.getElementById("summary-today")!.textContent = String(pending.filter((deadline) => new Date(deadline.dueAt).toDateString() === today).length);
  if (lastCalendarUrl !== snapshot.calendar.url) {
    if (!calendarDraftChanged || calendarUrl.value.trim() === snapshot.calendar.url) {
      calendarUrl.value = snapshot.calendar.url; calendarDraftChanged = false;
    }
    lastCalendarUrl = snapshot.calendar.url;
  }
  if (lastRepository !== snapshot.github.repository) {
    if (!repositoryDraftChanged || githubRepo.value.trim() === snapshot.github.repository) {
      githubRepo.value = snapshot.github.repository; repositoryDraftChanged = false;
    }
    lastRepository = snapshot.github.repository;
  }
  if (snapshot.misemestre) {
    if (lastMisemestreUrl !== snapshot.misemestre.url) {
      if (!misemestreDraftChanged || misemestreUrl.value.trim() === snapshot.misemestre.url) {
        misemestreUrl.value = snapshot.misemestre.url;
        misemestreDraftChanged = false;
      }
      lastMisemestreUrl = snapshot.misemestre.url;
    }
    misemestreToggle.textContent = snapshot.misemestre.enabled ? "Desactivar" : "Activar";
    misemestreToggle.setAttribute("aria-pressed", String(snapshot.misemestre.enabled));
  }
  syncButton.disabled = snapshot.calendar.syncing;
  renderFeedback(); renderSchedule(snapshot); renderTasks(snapshot); renderNotifications(snapshot);
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
sound.addEventListener("click", () => { if (state) command("toggle-audio", !state.audio); });
pin.addEventListener("click", () => { if (state) command("toggle-pin", !state.pinned); });
document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((button) => {
  button.addEventListener("click", () => command("set-pet-state", { state: button.dataset.action as PetStateName }));
});
pomoToggle.addEventListener("click", () => command("pomo-toggle"));
document.getElementById("btn-pomo-reset")!.addEventListener("click", () => command("pomo-reset"));
misemestreUrl.addEventListener("input", () => { misemestreDraftChanged = true; });
document.getElementById("misemestre-form")!.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = misemestreUrl.value.trim();
  command("misemestre-sync", url);
});
misemestreToggle.addEventListener("click", () => {
  if (state?.misemestre) {
    command("misemestre-toggle", !state.misemestre.enabled);
  }
});
calendarUrl.addEventListener("input", () => { calendarDraftChanged = true; validationError = ""; renderFeedback(); });
document.getElementById("calendar-form")!.addEventListener("submit", (event) => {
  event.preventDefault();
  const url = calendarUrl.value.trim();
  validationError = !url ? "Ingresa una URL de calendario." : !calendarFeedUrl(url) ? "Usa una URL HTTP, HTTPS o webcal válida." : "";
  renderFeedback();
  if (validationError) { calendarUrl.focus(); return; }
  command("calendar-sync", url);
});
githubRepo.addEventListener("input", () => { repositoryDraftChanged = true; githubValidationError = ""; renderFeedback(); });
document.getElementById("github-form")!.addEventListener("submit", (event) => {
  event.preventDefault();
  const repository = githubRepo.value.trim();
  githubValidationError = /^[\w.-]+\/[\w.-]+$/.test(repository) ? "" : "Usa el formato propietario/repositorio.";
  renderFeedback();
  if (githubValidationError) { githubRepo.focus(); return; }
  command("github-repository", repository);
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
void connect().catch(() => { document.getElementById("connection-status")!.textContent = "No se pudo conectar con MySkin."; });

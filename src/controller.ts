import { emit, listen } from "@tauri-apps/api/event";
import { audioEngine } from "./audio";
import { pomodoroEngine } from "./pomodoro";
import { academicSyncService } from "./syncService";

// --- REFERENCIAS AL DOM ---
const selectSkin = document.getElementById("select-skin") as HTMLSelectElement | null;
const charNameEl = document.getElementById("char-name");
const charSpecEl = document.getElementById("char-spec");
const thumbCanvas = document.getElementById("thumb-canvas") as HTMLCanvasElement | null;
const thumbCtx = thumbCanvas?.getContext("2d");
const btnSoundToggle = document.getElementById("btn-sound-toggle");
const btnPinToggle = document.getElementById("btn-pin-toggle");
const statusFsmText = document.getElementById("status-fsm-text");

// Pomodoro
const pomoClockEl = document.getElementById("pomo-clock");
const pomoStatusEl = document.getElementById("pomo-status");
const btnPomoToggle = document.getElementById("btn-pomo-toggle");
const btnPomoReset = document.getElementById("btn-pomo-reset");

// Event buttons
const btnSemester = document.getElementById("btn-event-semester");
const btnGithub = document.getElementById("btn-event-github");

// Calendar sync
const inputCalendarUrl = document.getElementById("input-calendar-url") as HTMLInputElement | null;
const btnSyncCalendar = document.getElementById("btn-sync-calendar");
const syncFeedback = document.getElementById("sync-feedback");

let activeSkin = localStorage.getItem("myskin_active_skin") || "spartan";

/**
 * 1. Cargar metadatos y miniatura del skin activo
 */
async function loadSkinMetadata(skinFolder: string) {
  try {
    activeSkin = skinFolder;
    localStorage.setItem("myskin_active_skin", skinFolder);

    const res = await fetch(`/skins/${skinFolder}/manifest.json`);
    const manifest = await res.json();

    if (charNameEl) charNameEl.textContent = manifest.name;
    if (charSpecEl) charSpecEl.textContent = `Skin pixel · ${manifest.frameWidth || 64} × ${manifest.frameHeight || 64}`;
    if (selectSkin && selectSkin.value !== skinFolder) {
      selectSkin.value = skinFolder;
    }

    const img = new Image();
    img.src = `/skins/${skinFolder}/spritesheet.png`;
    img.onload = () => {
      if (!thumbCanvas || !thumbCtx) return;
      thumbCtx.clearRect(0, 0, thumbCanvas.width, thumbCanvas.height);
      thumbCtx.imageSmoothingEnabled = false;

      const idleState = manifest.states?.IDLE || { frameWidth: 64, frameHeight: 64, frames: [{ x: 0, y: 0 }] };
      const frame = idleState.frames?.[0] || { x: 0, y: 0 };
      const fw = idleState.frameWidth || 64;
      const fh = idleState.frameHeight || 64;

      thumbCtx.drawImage(img, frame.x, frame.y, fw, fh, 0, 0, thumbCanvas.width, thumbCanvas.height);
    };
  } catch (err) {
    console.debug("[Controller] Error cargando metadatos de skin:", err);
  }
}

// Inicializar selección de skin
if (selectSkin) {
  selectSkin.value = activeSkin;
  selectSkin.addEventListener("change", async (e) => {
    const newSkin = (e.target as HTMLSelectElement).value;
    await loadSkinMetadata(newSkin);
    await emit("skin-changed", newSkin);
  });
}
loadSkinMetadata(activeSkin);

// Inicializar botón de audio
if (btnSoundToggle) {
  const enabled = audioEngine.isEnabled();
  btnSoundToggle.textContent = enabled ? "AUDIO: ON" : "AUDIO: OFF";
  btnSoundToggle.classList.toggle("active", enabled);

  btnSoundToggle.addEventListener("click", async () => {
    const isNowOn = audioEngine.toggle();
    btnSoundToggle.textContent = isNowOn ? "AUDIO: ON" : "AUDIO: OFF";
    btnSoundToggle.classList.toggle("active", isNowOn);
    await emit("toggle-audio", isNowOn);
  });
}

// Inicializar botón de pin
if (btnPinToggle) {
  const savedPin = localStorage.getItem("myskin_pin_mode") !== "false";
  btnPinToggle.textContent = savedPin ? "MODO: FIJO" : "MODO: LIBRE";
  btnPinToggle.classList.toggle("active", savedPin);

  btnPinToggle.addEventListener("click", async () => {
    const cur = localStorage.getItem("myskin_pin_mode") !== "false";
    const next = !cur;
    localStorage.setItem("myskin_pin_mode", String(next));
    btnPinToggle.textContent = next ? "MODO: FIJO" : "MODO: LIBRE";
    btnPinToggle.classList.toggle("active", next);
    if (statusFsmText) {
      statusFsmText.textContent = next ? "Estado: FIJO (ANCLADO)" : "Estado: LIBRE (PATRULLA)";
    }
    await emit("toggle-pin", next);
  });
}

// Botones de acción FSM
document.querySelectorAll<HTMLButtonElement>(".btn-action").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const action = btn.dataset.action;
    if (action) {
      document.querySelectorAll(".btn-action").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (statusFsmText) statusFsmText.textContent = `Estado: ${action}`;
      await emit("set-pet-state", { state: action });
    }
  });
});

// Pomodoro
pomodoroEngine.subscribe({
  onTick: () => {
    if (pomoClockEl) pomoClockEl.textContent = pomodoroEngine.formatTime();
    if (pomoStatusEl) {
      const phase = pomodoroEngine.getPhase();
      pomoStatusEl.textContent = phase === "focus" ? "Concentración activa" : (phase === "break" ? "Descanso" : "En pausa");
    }
    if (btnPomoToggle) {
      btnPomoToggle.textContent = pomodoroEngine.isRunning() ? "PAUSAR" : "INICIAR FOCO";
    }
  },
  onPhaseChange: (phase) => {
    if (pomoStatusEl) {
      pomoStatusEl.textContent = phase === "focus" ? "Concentración activa" : (phase === "break" ? "Descanso" : "En pausa");
    }
    if (btnPomoToggle) {
      btnPomoToggle.textContent = pomodoroEngine.isRunning() ? "PAUSAR" : "INICIAR FOCO";
    }
  },
});

btnPomoToggle?.addEventListener("click", async () => {
  pomodoroEngine.toggle();
  await emit("pomo-toggle");
});

btnPomoReset?.addEventListener("click", async () => {
  pomodoroEngine.reset();
  await emit("pomo-reset");
});

// Sincronización de Calendario (.ics / Canvas LMS)
if (inputCalendarUrl) {
  inputCalendarUrl.value = academicSyncService.getCalendarUrl();
  if (syncFeedback) {
    syncFeedback.textContent = `Última sincronización: ${academicSyncService.getLastSyncFormatted()}`;
  }
}

btnSyncCalendar?.addEventListener("click", async () => {
  const url = inputCalendarUrl?.value.trim() || "";
  if (!url) {
    if (syncFeedback) syncFeedback.textContent = "Por favor ingresa una URL válida.";
    return;
  }

  if (syncFeedback) syncFeedback.textContent = "Sincronizando con servidor universitario...";
  const res = await academicSyncService.syncFromIcs(url);

  if (res.success) {
    if (syncFeedback) {
      syncFeedback.textContent = `Sincronizado: ${res.count} entregas detectadas. (${academicSyncService.getLastSyncFormatted()})`;
    }
    await emit("calendar-synced", { count: res.count });
  } else {
    if (syncFeedback) syncFeedback.textContent = `Error: ${res.error || "No se pudo descargar el feed"}`;
  }
});

// Probar eventos
btnSemester?.addEventListener("click", async () => {
  const next = academicSyncService.getNextUrgentDeadline();
  const timeStr = next ? academicSyncService.formatRemainingTime(next.dueAt) : "1h 45m";
  const title = next ? `${next.course}: ${next.title}` : "Lab. Sistemas Operativos - Round Robin";

  await emit("set-pet-state", {
    state: "ALERT_SEMESTRE",
    notification: {
      title: `ENTREGA: ${timeStr.toUpperCase()}`,
      subtitle: title.slice(0, 36),
      urgent: next?.urgent ?? true,
    },
  });
});

btnGithub?.addEventListener("click", async () => {
  await emit("set-pet-state", {
    state: "VICTORY_GITHUB",
    notification: {
      title: "GITHUB: PR #12 MERGED",
      subtitle: "feat: integrar compañero a escritorio",
      urgent: false,
    },
  });
});

// Escuchar cambios provenientes del System Tray
listen<string>("tray-action", async (event) => {
  const action = event.payload;
  if (action.startsWith("skin_")) {
    const skinId = action.replace("skin_", "");
    await loadSkinMetadata(skinId);
  } else if (action === "toggle_audio") {
    if (btnSoundToggle) {
      const enabled = audioEngine.isEnabled();
      btnSoundToggle.textContent = enabled ? "AUDIO: ON" : "AUDIO: OFF";
      btnSoundToggle.classList.toggle("active", enabled);
    }
  } else if (action === "toggle_roam") {
    if (btnPinToggle) {
      const savedPin = localStorage.getItem("myskin_pin_mode") !== "false";
      btnPinToggle.textContent = savedPin ? "MODO: FIJO" : "MODO: LIBRE";
      btnPinToggle.classList.toggle("active", savedPin);
    }
  }
});

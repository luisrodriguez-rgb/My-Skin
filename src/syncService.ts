import { parseIcsEvents } from "./calendar";

/**
 * MySkin - Servicio de Sincronizacion Academica del Semestre (Fase 2)
 * Administra entregas pendientes, parciales, talleres y eventos universitarios.
 * Soporta suscripciones directas a feeds iCalendar (.ics / webcal://) de Canvas LMS, Moodle y Google Calendar.
 */

export interface AcademicDeadline {
  id: string;
  sourceId?: string;
  course: string;
  title: string;
  dueAt: number; // Timestamp en milisegundos
  urgent: boolean;
  completed: boolean;
  link?: string;
}

export type DeadlineListener = (deadline: AcademicDeadline, timeRemainingFormatted: string) => void;

export class AcademicSyncService {
  private deadlines: AcademicDeadline[] = [];
  private listeners: DeadlineListener[] = [];
  private checkIntervalId: number | null = null;
  private storageKey = "myskin_academic_deadlines";
  private calendarUrlKey = "myskin_calendar_ics_url";
  private lastSyncKey = "myskin_calendar_last_sync";
  private lastSyncTime: number | null = null;
  private lastSyncAttempt = 0;
  private notified = new Set<string>();
  private changeListeners: Array<() => void> = [];
  private syncInFlight = false;

  constructor() {
    this.loadFromStorage();
    const savedSync = localStorage.getItem(this.lastSyncKey);
    if (savedSync) {
      this.lastSyncTime = parseInt(savedSync, 10);
    }
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed: unknown = JSON.parse(data);
        this.deadlines = Array.isArray(parsed) ? parsed.filter((d): d is AcademicDeadline =>
          d && typeof d.id === "string" && typeof d.course === "string" &&
          typeof d.title === "string" && Number.isFinite(d.dueAt) && typeof d.completed === "boolean"
        ) : [];
      }
    } catch (_) {
      this.deadlines = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.deadlines));
      if (this.lastSyncTime) {
        localStorage.setItem(this.lastSyncKey, String(this.lastSyncTime));
      }
    } catch (_) {}
  }

  public getCalendarUrl(): string {
    return localStorage.getItem(this.calendarUrlKey) || "";
  }

  public setCalendarUrl(url: string) {
    try {
      localStorage.setItem(this.calendarUrlKey, url.trim());
    } catch (_) {}
  }

  public getLastSyncFormatted(): string {
    if (!this.lastSyncTime) return "Sin sincronizar";
    const diffMin = Math.floor((Date.now() - this.lastSyncTime) / 60000);
    if (diffMin < 1) return "Sincronizado ahora";
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    return `Hace ${diffHours} h`;
  }

  /**
   * Sincroniza las entregas descargando y parseando el feed iCal (.ics) en vivo
   */
  public async syncFromIcs(overrideUrl?: string): Promise<{ success: boolean; count: number; error?: string }> {
    let feedUrl = overrideUrl || this.getCalendarUrl();
    if (!feedUrl) {
      return { success: false, count: 0, error: "No se ha configurado ninguna URL de calendario." };
    }

    // Convertir esquema webcal:// a https://
    if (feedUrl.startsWith("webcal://")) {
      feedUrl = "https://" + feedUrl.slice(9);
    }

    if (this.syncInFlight) return { success: false, count: 0, error: "Ya hay una sincronización en curso." };
    this.syncInFlight = true;
    try {
      const url = new URL(feedUrl);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("Usa una URL HTTP, HTTPS o webcal válida.");
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        return { success: false, count: 0, error: `Error del servidor HTTP ${res.status}` };
      }

      const text = await res.text();
      const newDeadlines = parseIcsEvents(text);

      // Preservar estado completado de tareas previas
      const completedIds = new Set(this.deadlines.filter((d) => d.completed).map((d) => d.id));
      for (const d of newDeadlines) {
        if (completedIds.has(d.id) || this.deadlines.some((previous) => previous.completed && previous.id === d.sourceId && previous.dueAt === d.dueAt)) {
          d.completed = true;
        }
      }

      this.deadlines = newDeadlines;
      if (overrideUrl) this.setCalendarUrl(overrideUrl);
      this.lastSyncTime = Date.now();
      this.saveToStorage();

      this.checkDeadlines();
      this.changeListeners.forEach((listener) => listener());

      return { success: true, count: newDeadlines.length };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.debug("[AcademicSync] Error al sincronizar feed iCal:", errMsg);
      return { success: false, count: 0, error: errMsg };
    } finally {
      this.syncInFlight = false;
    }
  }

  public getDeadlines(): AcademicDeadline[] {
    return this.deadlines.map((d) => ({ ...d, urgent: d.dueAt > Date.now() && d.dueAt - Date.now() <= 7200000 })).sort((a, b) => a.dueAt - b.dueAt);
  }

  public getPendingDeadlines(): AcademicDeadline[] {
    return this.getDeadlines().filter((d) => !d.completed && d.dueAt > Date.now());
  }

  public getNextUrgentDeadline(): AcademicDeadline | null {
    return this.getPendingDeadlines().find((d) => d.urgent) ?? null;
  }

  public markCompleted(id: string): boolean {
    const item = this.deadlines.find((d) => d.id === id);
    if (item) {
      item.completed = true;
      this.saveToStorage();
      this.changeListeners.forEach((listener) => listener());
      return true;
    }
    return false;
  }

  public addDeadline(course: string, title: string, hoursFromNow: number): AcademicDeadline {
    const newDeadline: AcademicDeadline = {
      id: `dl-${crypto.randomUUID()}`,
      course,
      title,
      dueAt: Date.now() + hoursFromNow * 3600 * 1000,
      urgent: hoursFromNow <= 2,
      completed: false,
    };
    this.deadlines.push(newDeadline);
    this.saveToStorage();
    return newDeadline;
  }

  public formatRemainingTime(dueAt: number): string {
    const diffMs = dueAt - Date.now();
    if (diffMs <= 0) return "Plazo vencido";

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }

  public subscribe(listener: DeadlineListener) {
    this.listeners.push(listener);
  }

  public startPeriodicCheck(intervalSeconds = 60) {
    if (this.checkIntervalId !== null) return;

    // Verificar en el arranque
    if (this.getCalendarUrl()) {
      this.syncFromIcs();
    }

    this.checkDeadlines();
    this.lastSyncAttempt = Date.now();
    this.checkIntervalId = window.setInterval(() => {
      if (Date.now() - this.lastSyncAttempt >= 30 * 60 * 1000 && this.getCalendarUrl()) {
        this.lastSyncAttempt = Date.now();
        void this.syncFromIcs();
      }
      this.checkDeadlines();
    }, intervalSeconds * 1000);
  }

  public onChange(listener: () => void) {
    this.changeListeners.push(listener);
    return () => { this.changeListeners = this.changeListeners.filter((item) => item !== listener); };
  }

  public checkDeadlines() {
    for (const deadline of this.getPendingDeadlines().filter((d) => d.urgent)) {
      const key = `${deadline.id}:${deadline.dueAt}`;
      if (this.notified.has(key)) continue;
      this.notified.add(key);
      for (const listener of this.listeners) listener(deadline, this.formatRemainingTime(deadline.dueAt));
    }
  }

  public stopPeriodicCheck() {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
}

export const academicSyncService = new AcademicSyncService();

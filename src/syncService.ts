/**
 * MySkin - Servicio de Sincronizacion Academica del Semestre (Fase 2)
 * Administra entregas pendientes, parciales, talleres y eventos universitarios.
 * Soporta suscripciones directas a feeds iCalendar (.ics / webcal://) de Canvas LMS, Moodle y Google Calendar.
 */

export interface AcademicDeadline {
  id: string;
  course: string;
  title: string;
  dueAt: number; // Timestamp en milisegundos
  urgent: boolean;
  completed: boolean;
  link?: string;
}

export type DeadlineListener = (deadline: AcademicDeadline, timeRemainingFormatted: string) => void;

/**
 * Despliega lineas continuadas segun el estandar RFC 5545 iCalendar
 */
function unfoldIcsLines(raw: string): string[] {
  const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const unfolded: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else if (line.trim().length > 0) {
      unfolded.push(line);
    }
  }
  return unfolded;
}

/**
 * Parsea fechas en formatos estandar RFC 5545 (UTC 'Z', local o solo fecha)
 */
function parseIcsDate(dateStr: string): number | null {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();
  const match = cleanStr.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  const hour = match[4] ? parseInt(match[4], 10) : 23;
  const min = match[5] ? parseInt(match[5], 10) : 59;
  const sec = match[6] ? parseInt(match[6], 10) : 59;
  const isUtc = Boolean(match[7]);

  if (isUtc) {
    return Date.UTC(year, month, day, hour, min, sec);
  }
  return new Date(year, month, day, hour, min, sec).getTime();
}

/**
 * Extrae eventos VEVENT de un archivo .ics y los convierte a AcademicDeadline
 */
function parseIcsEvents(raw: string): AcademicDeadline[] {
  const lines = unfoldIcsLines(raw);
  const events: AcademicDeadline[] = [];
  let inEvent = false;
  let summary = "";
  let dtEnd = "";
  let dtStart = "";
  let uid = "";
  let description = "";

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      summary = "";
      dtEnd = "";
      dtStart = "";
      uid = "";
      description = "";
    } else if (line === "END:VEVENT") {
      inEvent = false;
      const targetDateStr = dtEnd || dtStart;
      const dueTimestamp = parseIcsDate(targetDateStr);
      if (dueTimestamp && summary) {
        let course = "Universidad";
        let title = summary;

        // Formatos comunes de Canvas y Moodle: "[Curso] Tarea" o "Curso: Tarea"
        const bracketMatch = summary.match(/^\[(.*?)\]\s*(.*)$/);
        const colonMatch = summary.match(/^(.*?):\s*(.*)$/);
        if (bracketMatch) {
          course = bracketMatch[1].trim();
          title = bracketMatch[2].trim();
        } else if (colonMatch && colonMatch[1].length < 35) {
          course = colonMatch[1].trim();
          title = colonMatch[2].trim();
        }

        const now = Date.now();
        // Filtrar eventos que no sean anteriores a 2 horas atras
        if (dueTimestamp > now - 1000 * 60 * 60 * 2) {
          events.push({
            id: uid || `dl-${dueTimestamp}-${Math.random().toString(36).slice(2, 7)}`,
            course,
            title,
            dueAt: dueTimestamp,
            urgent: dueTimestamp - now <= 1000 * 60 * 60 * 2,
            completed: false,
            link: description.startsWith("http") ? description : undefined,
          });
        }
      }
    } else if (inEvent) {
      if (line.startsWith("SUMMARY:")) {
        summary = line.slice(8).replace(/\\,/g, ",").replace(/\\;/g, ";").trim();
      } else if (line.startsWith("DTEND")) {
        const val = line.split(":").slice(1).join(":");
        dtEnd = val.trim();
      } else if (line.startsWith("DTSTART")) {
        const val = line.split(":").slice(1).join(":");
        dtStart = val.trim();
      } else if (line.startsWith("UID:")) {
        uid = line.slice(4).trim();
      } else if (line.startsWith("DESCRIPTION:")) {
        description = line.slice(12).trim();
      }
    }
  }

  return events;
}

class AcademicSyncService {
  private deadlines: AcademicDeadline[] = [];
  private listeners: DeadlineListener[] = [];
  private checkIntervalId: number | null = null;
  private storageKey = "myskin_academic_deadlines";
  private calendarUrlKey = "myskin_calendar_ics_url";
  private lastSyncKey = "myskin_calendar_last_sync";
  private lastSyncTime: number | null = null;
  private syncCount = 0;

  constructor() {
    this.loadFromStorage();
    if (this.deadlines.length === 0) {
      this.seedDefaultDeadlines();
    }
    const savedSync = localStorage.getItem(this.lastSyncKey);
    if (savedSync) {
      this.lastSyncTime = parseInt(savedSync, 10);
    }
  }

  private loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        this.deadlines = JSON.parse(data);
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

  private seedDefaultDeadlines() {
    const now = Date.now();
    this.deadlines = [
      {
        id: "dl-1",
        course: "Sistemas Operativos",
        title: "Lab 3: Planificador de Procesos Round Robin",
        dueAt: now + 1000 * 60 * 85,
        urgent: true,
        completed: false,
      },
      {
        id: "dl-2",
        course: "Bases de Datos II",
        title: "Taller: Optimización de Índices B-Tree",
        dueAt: now + 1000 * 60 * 60 * 6,
        urgent: false,
        completed: false,
      },
      {
        id: "dl-3",
        course: "Arquitectura de Software",
        title: "Entrega Parcial 2: Patrones Microkernel",
        dueAt: now + 1000 * 60 * 60 * 28,
        urgent: false,
        completed: false,
      },
      {
        id: "dl-4",
        course: "Compiladores",
        title: "Analizador Sintáctico AST en Rust",
        dueAt: now + 1000 * 60 * 60 * 72,
        urgent: false,
        completed: false,
      },
    ];
    this.saveToStorage();
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

    if (overrideUrl) {
      this.setCalendarUrl(overrideUrl);
    }

    // Convertir esquema webcal:// a https://
    if (feedUrl.startsWith("webcal://")) {
      feedUrl = "https://" + feedUrl.slice(9);
    }

    try {
      const res = await fetch(feedUrl);
      if (!res.ok) {
        return { success: false, count: 0, error: `Error del servidor HTTP ${res.status}` };
      }

      const text = await res.text();
      const newDeadlines = parseIcsEvents(text);

      if (newDeadlines.length === 0) {
        return { success: true, count: 0, error: "El calendario no contiene eventos futuros." };
      }

      // Preservar estado completado de tareas previas
      const completedIds = new Set(this.deadlines.filter((d) => d.completed).map((d) => d.id));
      for (const d of newDeadlines) {
        if (completedIds.has(d.id)) {
          d.completed = true;
        }
      }

      this.deadlines = newDeadlines;
      this.lastSyncTime = Date.now();
      this.saveToStorage();

      // Notificar al siguiente deadline urgente
      const urgent = this.getNextUrgentDeadline();
      if (urgent) {
        const remaining = this.formatRemainingTime(urgent.dueAt);
        for (const l of this.listeners) {
          l(urgent, remaining);
        }
      }

      return { success: true, count: newDeadlines.length };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.debug("[AcademicSync] Error al sincronizar feed iCal:", errMsg);
      return { success: false, count: 0, error: errMsg };
    }
  }

  public getDeadlines(): AcademicDeadline[] {
    return [...this.deadlines].sort((a, b) => a.dueAt - b.dueAt);
  }

  public getPendingDeadlines(): AcademicDeadline[] {
    return this.getDeadlines().filter((d) => !d.completed);
  }

  public getNextUrgentDeadline(): AcademicDeadline | null {
    const pending = this.getPendingDeadlines();
    if (pending.length === 0) return null;
    return pending[0];
  }

  public markCompleted(id: string): boolean {
    const item = this.deadlines.find((d) => d.id === id);
    if (item) {
      item.completed = true;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  public addDeadline(course: string, title: string, hoursFromNow: number): AcademicDeadline {
    const newDeadline: AcademicDeadline = {
      id: `dl-${Date.now()}`,
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

    this.checkIntervalId = window.setInterval(() => {
      this.syncCount++;
      // Auto-sincronizar el feed iCal cada 30 minutos (30 ticks de 60s)
      if (this.syncCount % 30 === 0 && this.getCalendarUrl()) {
        this.syncFromIcs();
      }

      const next = this.getNextUrgentDeadline();
      if (next) {
        const remainingStr = this.formatRemainingTime(next.dueAt);
        for (const l of this.listeners) {
          l(next, remainingStr);
        }
      }
    }, intervalSeconds * 1000);
  }

  public stopPeriodicCheck() {
    if (this.checkIntervalId !== null) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
  }
}

export const academicSyncService = new AcademicSyncService();

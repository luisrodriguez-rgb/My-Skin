/**
 * MySkin - Servicio de Sincronizacion Academica del Semestre (Fase 2)
 * Administra entregas pendientes, parciales, talleres y eventos universitarios.
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

class AcademicSyncService {
  private deadlines: AcademicDeadline[] = [];
  private listeners: DeadlineListener[] = [];
  private checkIntervalId: number | null = null;
  private storageKey = "myskin_academic_deadlines";

  constructor() {
    this.loadFromStorage();
    if (this.deadlines.length === 0) {
      this.seedDefaultDeadlines();
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
    } catch (_) {}
  }

  private seedDefaultDeadlines() {
    const now = Date.now();
    this.deadlines = [
      {
        id: "dl-1",
        course: "Sistemas Operativos",
        title: "Lab 3: Planificador de Procesos Round Robin",
        dueAt: now + 1000 * 60 * 85, // En 1 hora y 25 minutos
        urgent: true,
        completed: false,
      },
      {
        id: "dl-2",
        course: "Bases de Datos II",
        title: "Taller: Optimización de Índices B-Tree",
        dueAt: now + 1000 * 60 * 60 * 6, // En 6 horas
        urgent: false,
        completed: false,
      },
      {
        id: "dl-3",
        course: "Arquitectura de Software",
        title: "Entrega Parcial 2: Patrones Microkernel",
        dueAt: now + 1000 * 60 * 60 * 28, // En 28 horas
        urgent: false,
        completed: false,
      },
      {
        id: "dl-4",
        course: "Compiladores",
        title: "Analizador Sintáctico AST en Rust",
        dueAt: now + 1000 * 60 * 60 * 72, // En 3 días
        urgent: false,
        completed: false,
      },
    ];
    this.saveToStorage();
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
    if (diffMs <= 0) return "¡Plazo vencido!";

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h restantes`;
    }
    if (hours > 0) {
      return `${hours}h ${mins}m restantes`;
    }
    return `${mins} minutos restantes`;
  }

  public subscribe(listener: DeadlineListener) {
    this.listeners.push(listener);
  }

  public startPeriodicCheck(intervalSeconds = 60) {
    if (this.checkIntervalId !== null) return;

    this.checkIntervalId = window.setInterval(() => {
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

/**
 * MySkin - Gestor de Concentracion Pomodoro (Fase 3: Inteligencia Contextual)
 * Ciclos de 25 minutos de Foco y 5 minutos de Descanso con sincronizacion a la FSM.
 */

export type PomodoroPhase = "idle" | "focus" | "break";

export interface PomodoroListener {
  onTick: (remainingSeconds: number, phase: PomodoroPhase) => void;
  onPhaseChange: (newPhase: PomodoroPhase) => void;
}

class PomodoroEngine {
  private phase: PomodoroPhase = "idle";
  private durationSeconds: number = 25 * 60; // 25 min foco por defecto
  private remainingSeconds: number = 25 * 60;
  private timerId: number | null = null;
  private listeners: PomodoroListener[] = [];

  public getPhase(): PomodoroPhase {
    return this.phase;
  }

  public getRemainingSeconds(): number {
    return this.remainingSeconds;
  }

  public formatTime(): string {
    const mins = Math.floor(this.remainingSeconds / 60);
    const secs = this.remainingSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  public subscribe(listener: PomodoroListener) {
    this.listeners.push(listener);
  }

  public startFocus() {
    this.stopTimer();
    this.phase = "focus";
    this.durationSeconds = 25 * 60;
    this.remainingSeconds = this.durationSeconds;
    this.notifyPhaseChange();
    this.runTimer();
  }

  public startBreak() {
    this.stopTimer();
    this.phase = "break";
    this.durationSeconds = 5 * 60;
    this.remainingSeconds = this.durationSeconds;
    this.notifyPhaseChange();
    this.runTimer();
  }

  public pause() {
    this.stopTimer();
  }

  public isRunning(): boolean {
    return this.timerId !== null;
  }

  public toggle() {
    if (this.isRunning()) {
      this.pause();
    } else {
      if (this.phase === "idle") {
        this.startFocus();
      } else {
        this.resume();
      }
    }
  }

  public resume() {
    if (this.phase !== "idle" && !this.timerId) {
      this.runTimer();
    }
  }

  public reset() {
    this.stopTimer();
    this.phase = "idle";
    this.remainingSeconds = 25 * 60;
    this.notifyPhaseChange();
    this.notifyTick();
  }

  private runTimer() {
    this.timerId = window.setInterval(() => {
      this.remainingSeconds--;
      this.notifyTick();

      if (this.remainingSeconds <= 0) {
        if (this.phase === "focus") {
          this.startBreak();
        } else if (this.phase === "break") {
          this.startFocus();
        }
      }
    }, 1000);
  }

  private stopTimer() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private notifyTick() {
    for (const l of this.listeners) {
      l.onTick(this.remainingSeconds, this.phase);
    }
  }

  private notifyPhaseChange() {
    for (const l of this.listeners) {
      l.onPhaseChange(this.phase);
    }
  }
}

export const pomodoroEngine = new PomodoroEngine();

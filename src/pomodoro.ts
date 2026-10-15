export type PomodoroPhase = "idle" | "focus" | "break";

export interface PomodoroSnapshot {
  phase: PomodoroPhase;
  remainingSeconds: number;
  running: boolean;
}

export interface PomodoroListener {
  onTick: (remainingSeconds: number, phase: PomodoroPhase) => void;
  onPhaseChange: (newPhase: PomodoroPhase) => void;
}

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

export class PomodoroEngine {
  private phase: PomodoroPhase = "idle";
  private remainingSeconds = FOCUS_SECONDS;
  private deadline: number | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private listeners: PomodoroListener[] = [];

  public getPhase() { return this.phase; }
  public getRemainingSeconds() { return this.remainingSeconds; }
  public isRunning() { return this.deadline !== null; }
  public snapshot(): PomodoroSnapshot {
    return { phase: this.phase, remainingSeconds: this.remainingSeconds, running: this.isRunning() };
  }

  public formatTime(): string {
    return `${String(Math.floor(this.remainingSeconds / 60)).padStart(2, "0")}:${String(this.remainingSeconds % 60).padStart(2, "0")}`;
  }

  public subscribe(listener: PomodoroListener) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter((item) => item !== listener); };
  }

  public startFocus() { this.startPhase("focus", FOCUS_SECONDS); }
  public startBreak() { this.startPhase("break", BREAK_SECONDS); }

  private startPhase(phase: PomodoroPhase, seconds: number) {
    this.stopTimer();
    this.phase = phase;
    this.remainingSeconds = seconds;
    this.deadline = Date.now() + seconds * 1000;
    this.runTimer();
    this.notifyPhaseChange();
    this.notifyTick();
  }

  public toggle() {
    if (this.isRunning()) this.pause();
    else if (this.phase === "idle") this.startFocus();
    else this.resume();
  }

  public pause() {
    this.updateRemaining();
    this.stopTimer();
    this.notifyTick();
  }

  public resume() {
    if (this.phase === "idle" || this.isRunning()) return;
    this.deadline = Date.now() + this.remainingSeconds * 1000;
    this.runTimer();
    this.notifyTick();
  }

  public reset() {
    this.stopTimer();
    this.phase = "idle";
    this.remainingSeconds = FOCUS_SECONDS;
    this.notifyPhaseChange();
    this.notifyTick();
  }

  private updateRemaining() {
    if (this.deadline === null) return;
    const now = Date.now();
    if (now >= this.deadline) {
      // Resolve suspension/throttling with wall time, without replaying every missed tick.
      let elapsed = (now - this.deadline) / 1000;
      this.phase = this.phase === "focus" ? "break" : "focus";
      elapsed %= FOCUS_SECONDS + BREAK_SECONDS;
      let duration = this.phase === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
      if (elapsed >= duration) {
        elapsed -= duration;
        this.phase = this.phase === "focus" ? "break" : "focus";
        duration = this.phase === "focus" ? FOCUS_SECONDS : BREAK_SECONDS;
      }
      this.deadline = now + (duration - elapsed) * 1000;
      this.remainingSeconds = Math.ceil((this.deadline - now) / 1000);
      this.notifyPhaseChange();
    }
    this.remainingSeconds = Math.max(0, Math.ceil((this.deadline - now) / 1000));
  }

  private runTimer() {
    this.timerId = setInterval(() => { this.updateRemaining(); this.notifyTick(); }, 1000);
  }

  private stopTimer() {
    if (this.timerId !== null) clearInterval(this.timerId);
    this.timerId = null;
    this.deadline = null;
  }

  private notifyTick() {
    for (const listener of this.listeners) listener.onTick(this.remainingSeconds, this.phase);
  }

  private notifyPhaseChange() {
    for (const listener of this.listeners) listener.onPhaseChange(this.phase);
  }
}

export const pomodoroEngine = new PomodoroEngine();

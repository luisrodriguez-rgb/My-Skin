import type { PetStateName } from "./appState";
import type { PomodoroSnapshot } from "./pomodoro";

export type NotificationKind = "academic" | "pomodoro" | "github" | "ambient" | "demo";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  state: PetStateName;
  title: string;
  subtitle: string;
  urgent?: boolean;
  deadlineId?: string;
  dueAt?: number;
  durationMs?: number;
}

const priority: Record<NotificationKind, number> = {
  academic: 400, pomodoro: 300, github: 200, demo: 100, ambient: 0,
};

export function contextualPetState(pomodoro: PomodoroSnapshot, ambient: PetStateName): PetStateName {
  if (pomodoro.phase === "idle") return ambient;
  if (!pomodoro.running) return "IDLE";
  return pomodoro.phase === "focus" ? "FOCUS" : "WALK";
}

/** Only the main window owns this queue. Transient time counts while visible. */
export class NotificationQueue {
  private entries = new Map<string, { item: AppNotification; remaining: number | null; order: number }>();
  private activeId: string | null = null;
  private lastTick: number;
  private sequence = 0;

  constructor(private now: () => number = Date.now) { this.lastTick = now(); }

  public push(item: AppNotification) {
    this.update();
    const existing = this.entries.get(item.id);
    this.entries.set(item.id, {
      item: { ...item },
      remaining: existing ? existing.remaining : item.durationMs ?? null,
      order: existing?.order ?? this.sequence++,
    });
    this.update();
  }

  public current(): AppNotification | null {
    this.update();
    const entry = this.activeId ? this.entries.get(this.activeId) : undefined;
    return entry ? { ...entry.item } : null;
  }

  public snapshot(): AppNotification[] {
    this.update();
    return this.sorted().map((entry) => ({ ...entry.item }));
  }

  public dismiss(id: string) {
    this.update();
    this.entries.delete(id);
    this.update();
  }

  public removeWhere(predicate: (item: AppNotification) => boolean) {
    this.update();
    for (const [id, { item }] of this.entries) if (predicate(item)) this.entries.delete(id);
    this.update();
  }

  private sorted() {
    return [...this.entries.values()].sort((a, b) =>
      priority[b.item.kind] - priority[a.item.kind]
      || (a.item.dueAt ?? Infinity) - (b.item.dueAt ?? Infinity)
      || a.order - b.order);
  }

  private update() {
    const now = this.now();
    const active = this.activeId ? this.entries.get(this.activeId) : undefined;
    if (active && active.remaining !== null) {
      active.remaining -= Math.max(0, now - this.lastTick);
      if (active.remaining <= 0) this.entries.delete(this.activeId!);
    }
    for (const [id, { item }] of this.entries) {
      if (item.kind === "academic" && item.dueAt !== undefined && item.dueAt <= now) this.entries.delete(id);
    }
    this.lastTick = now;
    this.activeId = this.sorted()[0]?.item.id ?? null;
  }
}

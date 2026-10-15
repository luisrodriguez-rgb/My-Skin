import type { PomodoroSnapshot } from "./pomodoro";

export type PetStateName = "IDLE" | "WALK" | "ALERT_SEMESTRE" | "VICTORY_GITHUB" | "FOCUS" | "SLEEP";
export interface Notification {
  title: string;
  subtitle: string;
  urgent?: boolean;
}

/** Published by the sprite window; controllers never own timers or services. */
export interface AppState {
  skin: string;
  petState: PetStateName;
  pinned: boolean;
  audio: boolean;
  pomodoro: PomodoroSnapshot;
  calendar: {
    url: string;
    count: number;
    lastSync: string;
    syncing: boolean;
    error?: string;
  };
}

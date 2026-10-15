import type { PomodoroSnapshot } from "./pomodoro";
import type { AcademicDeadline } from "./syncService";
import type { AppNotification } from "./notifications";

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
  notifications: AppNotification[];
  activeNotificationId: string | null;
  skinError?: string;
  skinLoading?: string;
  actionError?: string;
  github: { repository: string; error?: string };
  calendar: {
    url: string;
    count: number;
    deadlines: AcademicDeadline[];
    lastSync: string;
    syncing: boolean;
    error?: string;
  };
}

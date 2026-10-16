/**
 * MySkin - Proveedor de Sincronizacion Universitaria con MiSemestre (Horario)
 * Permite conectar con el servidor local de MiSemestre para obtener clases del dia,
 * materias en curso, entregas pendientes y registrar sesiones de concentracion.
 */

export interface MiSemestreClass {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  color: string;
  startTime: string;
  endTime: string;
  location: string;
  professor: string;
  isCurrent: boolean;
  isPast: boolean;
  isUpcoming: boolean;
  startsInMinutes: number;
}

export interface MiSemestreAssignment {
  id: string;
  subjectId: string;
  course: string;
  title: string;
  dueAt: number;
  dueDate: string;
  urgent: boolean;
  completed: boolean;
  weight: number;
}

export interface MiSemestreExam {
  id: string;
  subjectId: string;
  course: string;
  title: string;
  date: string;
  timestamp: number;
  weight: number;
}

export interface MiSemestreFeed {
  connected: boolean;
  provider: string;
  timestamp: number;
  semester: string;
  student: string;
  today: {
    dayOfWeek: number;
    classes: MiSemestreClass[];
    currentClass: MiSemestreClass | null;
    nextClass: MiSemestreClass | null;
  };
  assignments: MiSemestreAssignment[];
  exams: MiSemestreExam[];
}

export interface MiSemestreConfig {
  url: string;
  enabled: boolean;
  autoLogSessions: boolean;
}

const STORAGE_CONFIG_KEY = "myskin_misemestre_config";
const DEFAULT_URL = "http://127.0.0.1:3000";

export function getMiSemestreConfig(): MiSemestreConfig {
  try {
    const raw = localStorage.getItem(STORAGE_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        url: typeof parsed.url === "string" && parsed.url ? parsed.url.trim() : DEFAULT_URL,
        enabled: parsed.enabled !== false,
        autoLogSessions: parsed.autoLogSessions !== false,
      };
    }
  } catch (_) {}

  return {
    url: DEFAULT_URL,
    enabled: true,
    autoLogSessions: true,
  };
}

export function saveMiSemestreConfig(partial: Partial<MiSemestreConfig>): MiSemestreConfig {
  const current = getMiSemestreConfig();
  const updated: MiSemestreConfig = {
    ...current,
    ...partial,
  };
  try {
    localStorage.setItem(STORAGE_CONFIG_KEY, JSON.stringify(updated));
  } catch (_) {}
  return updated;
}

export function sanitizeMiSemestreUrl(urlStr: string): string {
  const trimmed = urlStr.trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_URL;
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return `http://${trimmed}`;
  }
  return trimmed;
}

/**
 * Consulta el endpoint /api/myskin/feed de MiSemestre
 */
export async function fetchMiSemestreFeed(baseUrlOverride?: string): Promise<{
  success: boolean;
  feed?: MiSemestreFeed;
  error?: string;
}> {
  const base = sanitizeMiSemestreUrl(baseUrlOverride || getMiSemestreConfig().url);
  const endpoint = `${base}/api/myskin/feed`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(6000),
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Servidor respondio con codigo ${res.status}: ${res.statusText}`,
      };
    }

    const data: MiSemestreFeed = await res.json();
    if (!data || typeof data !== "object") {
      return {
        success: false,
        error: "Respuesta no valida del servidor de MiSemestre",
      };
    }

    return {
      success: true,
      feed: data,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: msg.includes("AbortError") || msg.includes("timeout")
        ? "Tiempo de espera agotado al conectar con MiSemestre"
        : `No se pudo conectar a ${base}: ${msg}`,
    };
  }
}

/**
 * Registra una sesion de foco Pomodoro completada en MiSemestre
 */
export async function sendMiSemestreFocusSession(
  session: { durationMinutes: number; title: string; subjectId?: string },
  baseUrlOverride?: string
): Promise<{ success: boolean; error?: string }> {
  const base = sanitizeMiSemestreUrl(baseUrlOverride || getMiSemestreConfig().url);
  const endpoint = `${base}/api/myskin/session`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(6000),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(session),
    });

    if (!res.ok) {
      return {
        success: false,
        error: `Error al registrar sesion: HTTP ${res.status}`,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: `Error de conexion con MiSemestre: ${msg}`,
    };
  }
}

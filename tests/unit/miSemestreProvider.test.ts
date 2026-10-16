import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  sanitizeMiSemestreUrl,
  getMiSemestreConfig,
  saveMiSemestreConfig,
  fetchMiSemestreFeed,
  sendMiSemestreFocusSession,
  type MiSemestreFeed,
} from "../../src/miSemestreProvider";
import { AcademicSyncService } from "../../src/syncService";

describe("MiSemestre Provider & Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("sanitizeMiSemestreUrl", () => {
    it("returns default URL when input is empty", () => {
      expect(sanitizeMiSemestreUrl("")).toBe("http://127.0.0.1:3000");
      expect(sanitizeMiSemestreUrl("   ")).toBe("http://127.0.0.1:3000");
    });

    it("strips trailing slashes", () => {
      expect(sanitizeMiSemestreUrl("http://localhost:3000/")).toBe("http://localhost:3000");
      expect(sanitizeMiSemestreUrl("http://localhost:3000///")).toBe("http://localhost:3000");
    });

    it("prepends http:// if scheme is missing", () => {
      expect(sanitizeMiSemestreUrl("localhost:3000")).toBe("http://localhost:3000");
      expect(sanitizeMiSemestreUrl("127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    });

    it("preserves https scheme", () => {
      expect(sanitizeMiSemestreUrl("https://misemestre.app")).toBe("https://misemestre.app");
    });
  });

  describe("Config storage", () => {
    it("returns default configuration initially", () => {
      const config = getMiSemestreConfig();
      expect(config.url).toBe("http://127.0.0.1:3000");
      expect(config.enabled).toBe(true);
      expect(config.autoLogSessions).toBe(true);
    });

    it("saves and loads updated configuration", () => {
      saveMiSemestreConfig({ url: "http://localhost:4000", enabled: false });
      const loaded = getMiSemestreConfig();
      expect(loaded.url).toBe("http://localhost:4000");
      expect(loaded.enabled).toBe(false);
      expect(loaded.autoLogSessions).toBe(true);
    });
  });

  describe("fetchMiSemestreFeed", () => {
    it("fetches feed successfully when server responds ok", async () => {
      const mockFeed: MiSemestreFeed = {
        connected: true,
        provider: "MiSemestre",
        timestamp: Date.now(),
        semester: "2026-2",
        student: "Luis Rodriguez",
        today: {
          dayOfWeek: 1,
          classes: [
            {
              id: "b-1",
              subjectId: "sub-1",
              subjectName: "Optimización",
              subjectCode: "05359",
              color: "#0d9488",
              startTime: "10:00",
              endTime: "13:00",
              location: "Salón 201",
              professor: "Dr. Gomez",
              isCurrent: false,
              isPast: false,
              isUpcoming: true,
              startsInMinutes: 45,
            },
          ],
          currentClass: null,
          nextClass: null,
        },
        assignments: [],
        exams: [],
      };

      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => mockFeed,
      } as Response);

      const result = await fetchMiSemestreFeed("http://127.0.0.1:3000");
      expect(result.success).toBe(true);
      expect(result.feed?.semester).toBe("2026-2");
      expect(result.feed?.today.classes.length).toBe(1);
    });

    it("handles network failure gracefully", async () => {
      vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Connection refused"));

      const result = await fetchMiSemestreFeed("http://127.0.0.1:3000");
      expect(result.success).toBe(false);
      expect(result.error).toContain("No se pudo conectar");
    });
  });

  describe("sendMiSemestreFocusSession", () => {
    it("posts session data to endpoint", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response);

      const result = await sendMiSemestreFocusSession(
        { durationMinutes: 25, title: "Taller 2", subjectId: "sub-1" },
        "http://127.0.0.1:3000"
      );

      expect(result.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://127.0.0.1:3000/api/myskin/session",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ durationMinutes: 25, title: "Taller 2", subjectId: "sub-1" }),
        })
      );
    });
  });

  describe("AcademicSyncService.syncFromMiSemestre", () => {
    it("imports assignments and exams into deadlines while keeping existing ics items", () => {
      const service = new AcademicSyncService();
      // Add manual deadline
      service.addDeadline("Canvas LMS", "Entrega Previa", 10);

      const now = Date.now();
      const mockFeed: MiSemestreFeed = {
        connected: true,
        provider: "MiSemestre",
        timestamp: now,
        semester: "2026-2",
        student: "Luis Rodriguez",
        today: {
          dayOfWeek: 1,
          classes: [],
          currentClass: null,
          nextClass: null,
        },
        assignments: [
          {
            id: "asg-1",
            subjectId: "sub-1",
            course: "Optimización",
            title: "Taller Simplex",
            dueAt: now + 5 * 3600 * 1000,
            dueDate: new Date(now + 5 * 3600 * 1000).toISOString(),
            urgent: false,
            completed: false,
            weight: 20,
          },
        ],
        exams: [
          {
            id: "exam-1",
            subjectId: "sub-2",
            course: "Estadística II",
            title: "Parcial 1",
            date: new Date(now + 24 * 3600 * 1000).toISOString(),
            timestamp: now + 24 * 3600 * 1000,
            weight: 30,
          },
        ],
      };

      const result = service.syncFromMiSemestre(mockFeed);
      expect(result.count).toBe(2);

      const deadlines = service.getDeadlines();
      expect(deadlines.length).toBe(3); // 1 manual + 1 assignment + 1 exam
      expect(deadlines.some((d) => d.course === "Canvas LMS")).toBe(true);
      expect(deadlines.some((d) => d.title === "Taller Simplex")).toBe(true);
      expect(deadlines.some((d) => d.title === "[PARCIAL] Parcial 1")).toBe(true);
    });
  });
});

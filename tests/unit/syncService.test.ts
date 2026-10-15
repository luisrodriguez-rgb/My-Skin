import { beforeEach, expect, it, vi } from "vitest";
import { AcademicSyncService } from "../../src/syncService";
const empty = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-15T00:00:00Z")); });
it("starts empty rather than creating fictitious assignments", () => {
  expect(new AcademicSyncService().getDeadlines()).toEqual([]);
});
it("keeps partial minutes consistent with the controller and rejects unrenderable stored dates", () => {
  localStorage.setItem("myskin_academic_deadlines", JSON.stringify([
    { id: "bad", course: "Curso", title: "Fecha inválida", dueAt: 1e20, completed: false },
  ]));
  const service = new AcademicSyncService();
  expect(service.getDeadlines()).toEqual([]);
  expect(service.formatRemainingTime(Date.now() + 899000)).toBe("15m");
  expect(service.formatRemainingTime(Date.now() + 1000)).toBe("1m");
});
it("only alerts for pending future deadlines inside two hours", () => {
  const service = new AcademicSyncService();
  service.addDeadline("Curso", "Vencida", -1);
  service.addDeadline("Curso", "Lejana", 24);
  const complete = service.addDeadline("Curso", "Terminada", 0.25); service.markCompleted(complete.id);
  expect(service.getNextUrgentDeadline()).toBeNull();
  const urgent = service.addDeadline("Curso", "Próxima", 1);
  expect(service.getNextUrgentDeadline()?.id).toBe(urgent.id);
});
it("notifies each deadline once, and picks up new ones as they become urgent", () => {
  const service = new AcademicSyncService(); const alert = vi.fn(); service.subscribe(alert);
  service.addDeadline("Curso", "Ahora", 1);
  service.addDeadline("Curso", "Después", 3);
  service.checkDeadlines(); service.checkDeadlines();
  expect(alert).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(2 * 3600000);
  service.checkDeadlines();
  expect(alert).toHaveBeenCalledTimes(2);
});
it("replaces old tasks on a valid empty feed and updates sync metadata", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(empty)));
  const service = new AcademicSyncService(); service.addDeadline("Curso", "Antigua", 1);
  const changed = vi.fn(); service.onChange(changed);
  expect(await service.syncFromIcs("webcal://example.org/feed.ics")).toEqual({ success: true, count: 0 });
  expect(service.getDeadlines()).toEqual([]);
  expect(service.getLastSyncFormatted()).toBe("Sincronizado ahora");
  expect(changed).toHaveBeenCalledOnce();
  expect(String(vi.mocked(fetch).mock.calls[0][0])).toBe("https://example.org/feed.ics");
});
it("preserves data and the last good URL on failed or invalid feeds", async () => {
  const service = new AcademicSyncService(); service.setCalendarUrl("https://example.org/good.ics");
  service.addDeadline("Curso", "Conservar", 1);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>not a calendar</html>")));
  expect((await service.syncFromIcs("https://example.org/bad.ics")).success).toBe(false);
  expect(service.getDeadlines()).toHaveLength(1);
  expect(service.getCalendarUrl()).toBe("https://example.org/good.ics");
});
it("preserves completion when syncing the same event again", async () => {
  const feed = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:stable\r\nSUMMARY:Entrega\r\nDTSTART:20261015T010000Z\r\nEND:VEVENT\r\nEND:VCALENDAR";
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(feed))));
  const service = new AcademicSyncService();
  await service.syncFromIcs("https://example.org/feed.ics");
  service.markCompleted(service.getDeadlines()[0].id);
  await service.syncFromIcs();
  expect(service.getDeadlines()[0].completed).toBe(true);
});

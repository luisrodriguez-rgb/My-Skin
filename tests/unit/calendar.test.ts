import { expect, it } from "vitest";
import { parseIcsEvents } from "../../src/calendar";
const now = Date.parse("2026-10-15T00:00:00Z");
const calendar = (events: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${events}\r\nEND:VCALENDAR`;
const event = (properties: string) => `BEGIN:VEVENT\r\nUID:test\r\nSUMMARY:[Curso] Entrega\r\n${properties}\r\nEND:VEVENT`;
it("parses UTC, course names and folded text", () => {
  const results = parseIcsEvents(calendar(event("DTSTART:20261015T010000Z\r\nDESCRIPTION:https://example.org/\r\n task")), now);
  expect(results[0]).toMatchObject({ course: "Curso", title: "Entrega", dueAt: now + 3600000, urgent: true, link: "https://example.org/task" });
});
it("uses the exclusive end of all-day events", () => {
  const items = parseIcsEvents(calendar(event("DTSTART;VALUE=DATE:20261015\r\nDTEND;VALUE=DATE:20261016")), now);
  const expected = new Date(2026, 9, 16).getTime() - 1;
  expect(items[0].dueAt).toBe(expected);
});
it("expands recurrence and excludes EXDATE", () => {
  const raw = calendar(event("DTSTART:20261015T010000Z\r\nRRULE:FREQ=DAILY;COUNT=3\r\nEXDATE:20261016T010000Z"));
  const items = parseIcsEvents(raw, now);
  expect(items.map((item) => new Date(item.dueAt).toISOString())).toEqual(["2026-10-15T01:00:00.000Z", "2026-10-17T01:00:00.000Z"]);
  expect(new Set(items.map((item) => item.id)).size).toBe(2);
});
it("handles a moved recurrence exception", () => {
  const raw = calendar(event("DTSTART:20261015T010000Z\r\nRRULE:FREQ=DAILY;COUNT=2") + "\r\n" + event("RECURRENCE-ID:20261016T010000Z\r\nDTSTART:20261016T030000Z"));
  expect(parseIcsEvents(raw, now)[1].dueAt).toBe(Date.parse("2026-10-16T03:00:00Z"));
});
it("rejects unknown timezone definitions instead of assuming local time", () => {
  expect(() => parseIcsEvents(calendar(event("DTSTART;TZID=Unknown/Zone:20261015T010000")), now)).toThrow("VTIMEZONE");
});
it("uses an embedded VTIMEZONE", () => {
  const zone = "BEGIN:VTIMEZONE\r\nTZID:Test/Bogota\r\nBEGIN:STANDARD\r\nDTSTART:19700101T000000\r\nTZOFFSETFROM:-0500\r\nTZOFFSETTO:-0500\r\nEND:STANDARD\r\nEND:VTIMEZONE";
  expect(parseIcsEvents(calendar(zone + "\r\n" + event("DTSTART;TZID=Test/Bogota:20261015T010000")), now)[0].dueAt).toBe(Date.parse("2026-10-15T06:00:00Z"));
});
it("does not import expired or cancelled events", () => {
  expect(parseIcsEvents(calendar(event("DTSTART:20261014T010000Z")), now)).toEqual([]);
  expect(parseIcsEvents(calendar(event("DTSTART:20261015T010000Z\r\nSTATUS:CANCELLED")), now)).toEqual([]);
});
it("accepts an empty calendar and rejects non-calendar responses", () => {
  expect(parseIcsEvents(calendar(""), now)).toEqual([]);
  expect(() => parseIcsEvents("<html>login required</html>", now)).toThrow();
});

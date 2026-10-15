import ICAL from "ical.js";
import type { AcademicDeadline } from "./syncService";

const DAY = 86400000;
const MAX_OCCURRENCES = 10000;
type CalendarEvent = InstanceType<typeof ICAL.Event>;
type CalendarTime = InstanceType<typeof ICAL.Time>;

/** Expand recurring events for the next 90 days; reject unsupported dates rather than shift them silently. */
export function parseIcsEvents(raw: string, now = Date.now()): AcademicDeadline[] {
  const component = new ICAL.Component(ICAL.parse(raw));
  if (component.name !== "vcalendar") throw new Error("La respuesta no es un calendario iCalendar válido.");
  const timezones = new Set(component.getAllSubcomponents("vtimezone")
    .map((zone) => String(zone.getFirstPropertyValue("tzid") ?? "")));
  const components = component.getAllSubcomponents("vevent");
  for (const item of components) {
    for (const property of item.getAllProperties()) {
      const zone = property.getParameter("tzid");
      if (typeof zone === "string" && !timezones.has(zone) && !["UTC", "GMT", "Z"].includes(zone)) {
        throw new Error(`El calendario debe incluir VTIMEZONE para la zona ${zone}.`);
      }
    }
  }
  const exceptions = components.filter((item) => item.hasProperty("recurrence-id"));
  const deadlines = new Map<string, AcademicDeadline>();
  function append(event: CalendarEvent, start: CalendarTime, end: CalendarTime, recurrenceId?: CalendarTime) {
    if (event.component.getFirstPropertyValue("status") === "CANCELLED") return;
    const endTime = end.toJSDate().getTime();
    // RFC 5545: DTEND of an all-day event is exclusive.
    const dueAt = start.isDate ? endTime - 1 : endTime;
    if (!Number.isFinite(dueAt)) throw new Error("El calendario contiene una fecha inválida.");
    if (dueAt <= now) return;
    const summary = event.summary?.trim();
    if (!summary) return;
    const bracket = summary.match(/^\[(.*?)\]\s*(.*)$/);
    const colon = summary.match(/^(.*?):\s*(.*)$/);
    const parts = bracket ?? (colon && colon[1].length < 35 ? colon : null);
    const id = `${event.uid || summary}:${recurrenceId?.toString() ?? start.toString()}`;
    deadlines.set(id, {
      id,
      sourceId: event.uid || undefined,
      course: parts?.[1].trim() || "Universidad",
      title: parts?.[2].trim() || summary,
      dueAt,
      urgent: dueAt - now <= 2 * 3600000,
      completed: false,
      link: /^https?:\/\//.test(event.description ?? "") ? event.description : undefined,
    });
  }
  for (const item of components.filter((entry) => !entry.hasProperty("recurrence-id"))) {
    if (item.getFirstPropertyValue("status") === "CANCELLED") continue;
    if (!item.hasProperty("dtstart")) throw new Error("Hay un evento sin fecha de inicio.");
    const uid = item.getFirstPropertyValue("uid");
    const event = new ICAL.Event(item, { exceptions: exceptions.filter((entry) => entry.getFirstPropertyValue("uid") === uid) });
    if (!event.isRecurring()) {
      append(event, event.startDate, event.endDate);
      continue;
    }
    const iterator = event.iterator();
    let finished = false;
    for (let count = 0; count < MAX_OCCURRENCES; count++) {
      const occurrence = iterator.next();
      if (!occurrence || occurrence.toJSDate().getTime() > now + 90 * DAY) { finished = true; break; }
      const details = event.getOccurrenceDetails(occurrence);
      append(details.item, details.startDate, details.endDate, occurrence);
    }
    if (!finished) throw new Error("El calendario supera el límite de recurrencias; los datos anteriores se conservaron.");
  }
  return [...deadlines.values()].sort((a, b) => a.dueAt - b.dueAt);
}

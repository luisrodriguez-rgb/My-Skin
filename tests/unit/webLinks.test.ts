import { expect, it } from "vitest";
import { calendarFeedUrl, safeTaskUrl } from "../../src/webLinks";
it("normalizes task and calendar links", () => {
  expect(safeTaskUrl(" https://campus.example.org/tasks/1 ")).toBe("https://campus.example.org/tasks/1");
  expect(calendarFeedUrl("WEBCAL://campus.example.org/feed.ics")).toBe("https://campus.example.org/feed.ics");
});
it("rejects executable, local, malformed and credential-bearing links", () => {
  for (const value of ["javascript:alert(1)", "file:///etc/passwd", "data:text/html,test", "not a url", "https://user:password@example.org"]) {
    expect(safeTaskUrl(value)).toBeUndefined();
    expect(calendarFeedUrl(value)).toBeUndefined();
  }
});

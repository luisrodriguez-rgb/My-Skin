# MySkin architecture decisions

## Runtime authority

The main sprite window is the only owner of PomodoroEngine, AcademicSyncService,
GitHubMonitorService, audio state and pin state. Controller windows send commands
and render AppState snapshots. They never construct service timers. Reopening a
controller requests a snapshot instead of reconstructing state from localStorage.

## Transport

src/platform.ts uses Tauri emit/listen on desktop and BroadcastChannel between
same-origin simulation tabs. Use one main tab per origin in web simulation.
Native cursor polling is never started in a normal browser. Controller capabilities
permit events, while movement capabilities belong to main. Native execution is
still subject to the checklist in docs/NATIVE_VALIDATION.md.

## Time and calendars

Pomodoro counts toward a wall-clock deadline, not callback count. Main owns the
clock; full process restart currently resets it. A successful empty iCalendar
feed replaces old tasks; a failed/invalid feed preserves them. ical.js handles
recurrences and embedded VTIMEZONE, bounded to 90 future days and 10000 steps per
series. Missing timezone definitions fail explicitly. Deadline urgency means
future, incomplete and within two hours; notifications deduplicate within a session.

## GitHub and credentials

PR monitoring uses updated-order pagination, a per-repository persisted cursor,
and merge deduplication. Requests honor rate limits. Public monitoring needs no
token. New tokens live only in memory; old localStorage tokens migrate into the
current process. OS credential storage and real provider validation remain pending.

## Validation and limits

24 unit tests and 5 Chromium multi-window tests passed on 2026-10-15, along with
TypeScript/Vite build and frozen pnpm installation. Network tests use controlled
fixtures. Native macOS/Windows builds and UI tests, installer signing/notarization,
RAM/CPU/energy measurements and real calendar CORS behavior are not validated.
The roadmap and remaining acceptance criteria are in docs/AUDIT_AND_ROADMAP.md.

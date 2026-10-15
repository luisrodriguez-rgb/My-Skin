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

## Notification policy and controller actions

Main also owns NotificationQueue. Academic deadlines outrank Pomodoro completion,
GitHub activity, demos and ambient messages. Academic entries retain their actual
course/title/dueAt; earlier deadlines win. Transient lifetime counts only while
visible. Completion or removal prunes academic entries; dismissal does not complete
a task. Queue state and dismissal history are session-only. The normal sprite
state comes from the running/paused timer after a notification ends.

AppState publishes full deadlines, the queue, active notification ID and errors.
The controller sends deadline-complete, deadline-open and notification-dismiss
commands. Local form validation persists independently from owner snapshots.
HTTP(S) links open only on explicit user action; native code validates the URL
and runs a fixed OS launcher off the UI thread. Task completion is local to MySkin,
not a submission to the LMS.

## Controller views

Hoy, Companeros and Ajustes are local tab views. Roving keyboard focus supports
arrows/Home/End. Tabs remain usable when the owner is offline; only data-command
controls are disabled. Hidden panels retain DOM drafts and validation; the first owner snapshot also
preserves drafts entered offline. Tab changes
never restart owner services. Hoy uses actual pending/completed/due-today calendar
counts, not fabricated focus history. The hero previews the confirmed owner skin
and pet state; the gallery lazily caches previews of all ten skins.

GitHub repository configuration is validated in both controller and owner. The
owner persists it through GitHubMonitorService, clears queued activity for the
old repository and restarts polling. No token entry or credential persistence was
added. Skin loading state is published so the gallery marks the confirmed skin
while a replacement loads or fails. The controller has its own stylesheet;
the sprite overlay styling stays unchanged.

## GitHub and credentials

PR monitoring uses updated-order pagination, a per-repository persisted cursor,
and merge deduplication. Requests honor rate limits. Public monitoring needs no
token. New tokens live only in memory; old localStorage tokens migrate into the
current process. OS credential storage and real provider validation remain pending.

## Validation and limits

34 unit tests and 14 Chromium multi-window tests passed on 2026-10-15, along with
TypeScript/Vite build and frozen pnpm installation. Network tests use controlled
fixtures. Native compilation is checked by GitHub Actions; interactive macOS/Windows UI
tests, installer signing/notarization,
RAM/CPU/energy measurements and real calendar CORS behavior are not validated.
The roadmap and remaining acceptance criteria are in docs/AUDIT_AND_ROADMAP.md.

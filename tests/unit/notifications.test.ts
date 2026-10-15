import { expect, it } from "vitest";
import { NotificationQueue, contextualPetState, type AppNotification } from "../../src/notifications";
const github = (id = "github"): AppNotification => ({ id, kind: "github", state: "VICTORY_GITHUB", title: "PR fusionada", subtitle: "Integración terminada", durationMs: 4000 });
const academic = (id: string, dueAt: number): AppNotification => ({ id, kind: "academic", state: "ALERT_SEMESTRE", title: "Entrega", subtitle: id, deadlineId: id, dueAt, urgent: true });
it("preserves urgent deadlines when GitHub and Pomodoro arrive", () => {
  let now = 1000; const queue = new NotificationQueue(() => now);
  queue.push(academic("inminente", now + 900000));
  queue.push(github());
  queue.push({ id: "pomo", kind: "pomodoro", state: "WALK", title: "Sesión completada", subtitle: "Descansa", durationMs: 8000 });
  expect(queue.current()?.id).toBe("inminente");
  now += 30000;
  expect(queue.snapshot().map((item) => item.id)).toEqual(["inminente", "pomo", "github"]);
  queue.dismiss("inminente"); expect(queue.current()?.id).toBe("pomo");
  queue.dismiss("pomo"); expect(queue.current()?.id).toBe("github");
});
it("keeps both urgent tasks and presents the earliest deadline first", () => {
  const queue = new NotificationQueue(() => 1000);
  queue.push(academic("después", 100000)); queue.push(academic("primero", 10000));
  expect(queue.current()?.id).toBe("primero");
  queue.dismiss("primero"); expect(queue.current()?.id).toBe("después");
});
it("pauses a celebration's visible lifetime when a deadline interrupts it", () => {
  let now = 1000; const queue = new NotificationQueue(() => now);
  queue.push(github()); now += 1000;
  queue.push(academic("urgente", now + 900000));
  now += 30000; queue.dismiss("urgente");
  expect(queue.current()?.id).toBe("github");
  now += 2999; expect(queue.current()?.id).toBe("github");
  now++; expect(queue.current()).toBeNull();
});
it("does not duplicate an updated deadline and removes completed or expired entries", () => {
  let now = 1000; const queue = new NotificationQueue(() => now);
  queue.push(academic("primera", 10000)); queue.push({ ...academic("primera", 10000), subtitle: "Título actualizado" });
  queue.push(academic("segunda", 20000));
  expect(queue.snapshot()).toHaveLength(2);
  expect(queue.current()?.subtitle).toBe("Título actualizado");
  queue.removeWhere((item) => item.deadlineId === "primera");
  expect(queue.current()?.id).toBe("segunda");
  now = 20000; expect(queue.current()).toBeNull();
});
it("uses stable arrival order for equally urgent notifications", () => {
  const queue = new NotificationQueue(() => 1000);
  queue.push(github("first")); queue.push(github("second"));
  expect(queue.current()?.id).toBe("first");
  queue.dismiss("first"); expect(queue.current()?.id).toBe("second");
});
it("returns to focus after a celebration and to idle when focus is paused", () => {
  let now = 1000; const queue = new NotificationQueue(() => now);
  const focus = { phase: "focus" as const, remainingSeconds: 1200, running: true };
  queue.push(github());
  expect(queue.current()?.state ?? contextualPetState(focus, "IDLE")).toBe("VICTORY_GITHUB");
  now += 4000;
  expect(queue.current()?.state ?? contextualPetState(focus, "IDLE")).toBe("FOCUS");
  expect(contextualPetState({ ...focus, running: false }, "WALK")).toBe("IDLE");
  expect(contextualPetState({ ...focus, phase: "idle", running: false }, "IDLE")).toBe("IDLE");
});

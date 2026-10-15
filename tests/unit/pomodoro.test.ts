import { beforeEach, expect, it, vi } from "vitest";
import { PomodoroEngine } from "../../src/pomodoro";
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-15T12:00:00Z")); });
it("starts, pauses and resumes without losing remaining time", () => {
  const timer = new PomodoroEngine();
  timer.toggle();
  vi.advanceTimersByTime(10000);
  timer.toggle();
  expect(timer.snapshot()).toEqual({ phase: "focus", running: false, remainingSeconds: 1490 });
  vi.advanceTimersByTime(60000);
  expect(timer.getRemainingSeconds()).toBe(1490);
  timer.toggle();
  vi.advanceTimersByTime(1000);
  expect(timer.getRemainingSeconds()).toBe(1489);
  timer.reset();
  expect(timer.snapshot()).toEqual({ phase: "idle", running: false, remainingSeconds: 1500 });
});
it("reports the running state immediately to subscribers", () => {
  const timer = new PomodoroEngine();
  const states: boolean[] = [];
  timer.subscribe({ onPhaseChange: () => states.push(timer.isRunning()), onTick: () => states.push(timer.isRunning()) });
  timer.startFocus(); timer.pause();
  expect(states).toEqual([true, true, false]);
});
it("moves to break and then focus", () => {
  const timer = new PomodoroEngine(); timer.startFocus();
  vi.advanceTimersByTime(25 * 60000);
  expect(timer.snapshot()).toEqual({ phase: "break", running: true, remainingSeconds: 300 });
  vi.advanceTimersByTime(5 * 60000);
  expect(timer.snapshot()).toEqual({ phase: "focus", running: true, remainingSeconds: 1500 });
  timer.reset();
});
it("catches up after suspension across multiple phases", () => {
  const timer = new PomodoroEngine(); timer.startFocus();
  vi.setSystemTime(Date.now() + 31 * 60000 - 1000);
  vi.advanceTimersByTime(1000);
  expect(timer.snapshot()).toEqual({ phase: "focus", running: true, remainingSeconds: 1440 });
  timer.reset();
});

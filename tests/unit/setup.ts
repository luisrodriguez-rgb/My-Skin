import { beforeEach, afterEach, vi } from "vitest";
class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}
vi.stubGlobal("localStorage", new MemoryStorage());
vi.stubGlobal("window", globalThis);
beforeEach(() => { localStorage.clear(); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

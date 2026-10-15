import { emit as nativeEmit, listen as nativeListen } from "@tauri-apps/api/event";

export const isTauri = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
type Handler = (event: { payload: unknown }) => void;
let closed = false;
const handlers = new Map<string, Set<Handler>>();
const channel = !isTauri && typeof BroadcastChannel !== "undefined"
  ? new BroadcastChannel("myskin-events-v1") : null;

function dispatch(name: string, payload: unknown) {
  handlers.get(name)?.forEach((handler) => handler({ payload }));
}

if (channel) {
  channel.onmessage = ({ data }) => {
    if (data && typeof data.name === "string") dispatch(data.name, data.payload);
  };
  window.addEventListener("pagehide", () => { closed = true; channel.close(); }, { once: true });
}

/** Same event contract in Tauri and in same-origin simulation tabs. */
export async function emit<T>(name: string, payload?: T): Promise<void> {
  if (isTauri) return nativeEmit(name, payload);
  if (closed) return;
  dispatch(name, payload);
  channel?.postMessage({ name, payload });
}

export async function listen<T>(name: string, handler: (event: { payload: T }) => void): Promise<() => void> {
  if (isTauri) return nativeListen<T>(name, handler);
  const listener = handler as Handler;
  const listeners = handlers.get(name) ?? new Set<Handler>();
  handlers.set(name, listeners);
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

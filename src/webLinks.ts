export function safeTaskUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : undefined;
  } catch { return undefined; }
}

export function calendarFeedUrl(value: string): string | undefined {
  return safeTaskUrl(value.trim().replace(/^webcal:\/\//i, "https://"));
}

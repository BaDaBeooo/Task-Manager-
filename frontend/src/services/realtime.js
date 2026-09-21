// Convert backend timestamps (stored as UTC without an offset) into Date objects.
export function parseApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return new Date(value);

  // Backend currently returns naive UTC ISO strings such as 2026-09-16T07:35:00.
  // Treat them as UTC so the browser renders them in the user's local timezone.
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

export function subscribeRealtime(handler) {
  const listener = (event) => handler(event.detail);
  window.addEventListener("taskmanager:realtime", listener);
  return () => window.removeEventListener("taskmanager:realtime", listener);
}

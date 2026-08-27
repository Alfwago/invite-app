/** "2026-09-04" -> "Thu, Sep 4". Parsed as a local date (no TZ shift). */
export function formatEventDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** "20:00:00" -> "8:00 PM". Returns "" for null. */
export function formatTime(hms: string | null): string {
  if (!hms) return "";
  const [h, min] = hms.split(":").map(Number);
  const dt = new Date();
  dt.setHours(h, min, 0, 0);
  return dt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "4 / 12 skaters" style capacity label. */
export function rosterLabel(skaters: number, capacity: number | null): string {
  return capacity != null ? `${skaters} / ${capacity} skaters` : `${skaters} skaters`;
}

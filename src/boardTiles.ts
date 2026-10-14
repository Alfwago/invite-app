// Pure logic for the Messages tab's skate-group tiles — no React Native
// imports, so it runs under `npm test`.
//
// Server 0.35.1+ sends, on each board row, `tile_image_url` (the logo on a
// transparent background with a grey edge, made for the dark tile) and
// `short_label` ("Mon", "Sundae"). Older servers send neither: fall back to
// `image_url` (the white-background art) and derive the label here with the
// same rule as the server's Night.short_label.

import type { Night } from "./api/types.ts";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * A few letters for under a board tile: "Mon" for "Monday Mules" (first
 * word is a weekday, "Mondays" too), "Sundae" for "Sundae Morning" (a short
 * first word that isn't a day), else the night's weekday ("Thu").
 */
export function nightShortLabel(night: Pick<Night, "name" | "weekday" | "short_label">): string {
  if (night.short_label) return night.short_label;
  const first = (night.name ?? "").trim().split(/\s+/)[0] ?? "";
  const key = first.toLowerCase().replace(/[s']+$/, "");
  for (const day of DAYS) {
    if (key === day.toLowerCase() || key === day.slice(0, 3).toLowerCase()) return day.slice(0, 3);
  }
  if (first && first.length <= 7) return first;
  return DAYS[(night.weekday ?? 1) - 1]?.slice(0, 3) ?? "";
}

/** The image for a board tile: the dark tile art, else the original, else none. */
export function boardTileImage(night: Pick<Night, "image_url" | "tile_image_url">): string | null {
  return night.tile_image_url || night.image_url || null;
}

/** "Monday board, 3 unread" / "Main board" — the tile's screen-reader label. */
export function boardA11yLabel(name: string, unread: number): string {
  const base = `${name} board`;
  return unread > 0 ? `${base}, ${unread} unread` : base;
}

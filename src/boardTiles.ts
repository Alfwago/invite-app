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

/** Board tiles: never under a 44pt tap target, never over this. */
export const TILE_MIN = 44;
export const TILE_MAX = 68;
/** Most tiles in one row on a phone (the website uses the same 6). */
const MAX_COLUMNS = 6;
/** Smallest space between tiles and at the row ends. */
const MIN_GAP = 8;

export type BoardTileLayout = {
  /** Tile width = height, in points. */
  size: number;
  /** Tiles per row; the last row may be short, left-aligned to the grid. */
  columns: number;
  /** Space between tiles and at both row ends (spread evenly). */
  gap: number;
};

/**
 * The skate groups as equal tiles spread evenly across `width` (`count` =
 * night tiles only — in the app Main is the full-width bar above them,
 * owner 2026-10-15; the website's Main is a tile and counts there). As few rows as fit (up to 6 a row, fewer
 * when a narrow screen can't fit 6 at 44pt), the tiles shared out evenly
 * over them (7 = 4 + 3, 8 = 4 + 4), as big as the row allows up to
 * TILE_MAX, and the leftover space shared out as equal gaps.
 */
export function boardTileLayout(width: number, count: number): BoardTileLayout {
  const n = Math.max(1, count);
  const fit = Math.floor((width - MIN_GAP) / (TILE_MIN + MIN_GAP));
  const most = Math.max(1, Math.min(MAX_COLUMNS, fit));
  const rows = Math.ceil(n / most);
  const columns = Math.ceil(n / rows);
  const size = Math.max(
    TILE_MIN,
    Math.min(TILE_MAX, Math.floor((width - MIN_GAP * (columns + 1)) / columns)),
  );
  const gap = Math.max(0, Math.floor((width - size * columns) / (columns + 1)));
  return { size, columns, gap };
}

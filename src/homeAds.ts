import type { HomeAdItem } from "./api/types.ts";

/** Home page ads in the app (server 0.38.1+, owner 2026-10-21): the same
 *  Admin rules as the website. The x hides an ad for its hide time
 *  (0 = this app session); "Show again to everyone" changes the ad's key, so
 *  an old hide stops counting. Pure parts here; storage in HomeAdBanner. */

/** A stored hide: until when (ms). 0 → this session only (kept in memory). */
export function hiddenUntil(ad: HomeAdItem, now: number): number {
  return ad.hide_seconds > 0 ? now + ad.hide_seconds * 1000 : 0;
}

export function isHidden(
  ad: HomeAdItem,
  stored: Record<string, number>,
  session: Set<string>,
  now: number,
): boolean {
  if (session.has(ad.key)) return true;
  return now < (stored[ad.key] ?? 0);
}

/** One ad at random from those not hidden, or null. */
export function pickAd(
  ads: HomeAdItem[],
  stored: Record<string, number>,
  session: Set<string>,
  now: number,
  random: () => number = Math.random,
): HomeAdItem | null {
  const open = ads.filter((a) => !isHidden(a, stored, session, now));
  if (open.length === 0) return null;
  return open[Math.floor(random() * open.length)] ?? open[0];
}

/** SecureStore keys allow letters, digits, ".", "-" and "_" only. */
export function storeKey(adKey: string): string {
  return adKey.replace(/[^A-Za-z0-9._-]/g, "_");
}

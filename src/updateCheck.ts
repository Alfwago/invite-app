// Pure logic for the Home "App Update ↑ Available" pill (UpdatePill) — no
// React Native imports, so it runs under `npm test`. The check itself is
// useAppVersion (src/hooks/queries.ts): /api/app-version/ on app open and on
// return to the foreground, at most every APP_VERSION_CHECK_MS.

import type { AppVersions } from "./api/types.ts";
import { isNewerVersion } from "./version.ts";

/** How long a successful check counts as fresh. Foregrounding the app
 *  within this window doesn't hit the server again. */
export const APP_VERSION_CHECK_MS = 3 * 60 * 60 * 1000;

/**
 * The newest version for this platform, or "" for "don't nudge".
 *  - `versions` is the /api/app-version/ result: an object on a current
 *    server, `null` when the server is too old to have the endpoint (404),
 *    `undefined` while it's loading or after a network error.
 *  - Current server: iOS → "Latest app version", Android → "Android app
 *    version" (each "" when not configured).
 *  - Older server only: fall back to Home's `latest_app_version`, which was
 *    the one version both platforms used before.
 */
export function latestForPlatform(
  platform: string,
  versions: AppVersions | null | undefined,
  homeLatest: string | undefined,
): string {
  if (versions === null) return homeLatest ?? "";
  if (!versions) return "";
  if (platform === "ios") return versions.ios ?? "";
  if (platform === "android") return versions.android ?? "";
  return "";
}

/** Show the pill when `latest` is strictly newer than the installed build
 *  and the player hasn't dismissed that version in this session. */
export function shouldShowUpdate(
  latest: string,
  installed: string,
  dismissedThisSession: string | null,
): boolean {
  return isNewerVersion(latest, installed) && latest !== dismissedThisSession;
}

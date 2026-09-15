/** Compares two dot-separated version strings ("1.2.0" vs "1.10.0") —
 *  numeric per segment, not lexicographic, so "1.10.0" > "1.2.0". Missing
 *  segments count as 0 ("1.2" == "1.2.0"). Returns >0 if a > b, <0 if a < b,
 *  0 if equal or either string doesn't parse as a version. */
export function compareVersions(a: string, b: string): number {
  const partsA = String(a || "").split(".");
  const partsB = String(b || "").split(".");
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const na = Number(partsA[i] ?? 0);
    const nb = Number(partsB[i] ?? 0);
    if (!Number.isFinite(na) || !Number.isFinite(nb)) return 0;
    if (na !== nb) return na - nb;
  }
  return 0;
}

/** True when `latest` (from the server) is strictly newer than `installed`
 *  (this build). Blank/unparseable input never triggers a nudge. */
export function isNewerVersion(latest: string, installed: string): boolean {
  if (!latest || !installed) return false;
  return compareVersions(latest, installed) > 0;
}

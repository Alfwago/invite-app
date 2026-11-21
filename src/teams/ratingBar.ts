// The bar behind each name on the Team Generator (server 0.42.0, owner
// 2026-11-19): one bar whose length is the player's rating out of 5, split
// into each skill's weighted share of it. Same maths as the website.

export interface Skills {
  hockey_sense: number;
  skating: number;
  defense: number;
  offense: number;
}

export type SkillKey = keyof Skills;

/** In PPV order, with the weight each skill carries. */
/** Gold shades, deep to pale (owner 2026-11-19). `color` is the bar slice
 *  (see-through, behind text); `swatch` the key. */
export const SKILL_PARTS: { key: SkillKey; weight: number; label: string; color: string; swatch: string }[] = [
  { key: "hockey_sense", weight: 0.4, label: "Hockey Sense", color: "rgba(95, 70, 10, 0.92)", swatch: "#5f460a" },
  { key: "skating", weight: 0.25, label: "Skating", color: "rgba(160, 118, 24, 0.80)", swatch: "#a07618" },
  { key: "defense", weight: 0.2, label: "Defense", color: "rgba(212, 175, 55, 0.62)", swatch: "#d4af37" },
  { key: "offense", weight: 0.15, label: "Offense", color: "rgba(240, 220, 150, 0.50)", swatch: "#f0dc96" },
];

export const GOALIE_BAR_COLOR = "rgba(170, 170, 180, 0.32)";

const clamp = (v: number, max: number) => Math.max(0, Math.min(max, Number.isFinite(v) ? v : 0));

/** Each slice's width as a percent of the row. They add up to rating / 5. */
export function ratingBarParts(skills: Skills): { key: SkillKey; pct: number; color: string }[] {
  return SKILL_PARTS.map(({ key, weight, color }) => ({
    key,
    color,
    pct: ((clamp(skills[key], 5) * weight) / 5) * 100,
  }));
}

/** A goalie slot: one bar, rating out of 3. */
export function goalieBarPct(rating: number): number {
  return (clamp(rating, 3) / 3) * 100;
}

/** For screen readers: "Hockey Sense 4.0, Skating 3.5, …". */
export function skillsLabel(skills: Skills): string {
  return SKILL_PARTS.map(({ key, label }) => `${label} ${clamp(skills[key], 5).toFixed(1)}`).join(", ");
}

/** A team's average skills (skaters with scores; the goalie slot isn't
 *  in the list) and its average rating, for the team bar (owner
 *  2026-11-20). Averages, not totals: teams can differ in size. Null when
 *  nobody has scores. */
export function teamSkillAverages(
  players: { skills?: Skills | null }[],
): { skills: Skills; ppv: number; pct: number; count: number } | null {
  const rated = players.map((p) => p.skills).filter((s): s is Skills => !!s);
  if (rated.length === 0) return null;
  const avg = (key: SkillKey) => rated.reduce((sum, s) => sum + clamp(s[key], 5), 0) / rated.length;
  const skills: Skills = {
    hockey_sense: avg("hockey_sense"),
    skating: avg("skating"),
    defense: avg("defense"),
    offense: avg("offense"),
  };
  const ppv = SKILL_PARTS.reduce((sum, { key, weight }) => sum + skills[key] * weight, 0);
  return { skills, ppv, pct: (ppv / 5) * 100, count: rated.length };
}

/** What share of a rating each skill makes up — the four slices of its bar
 *  as whole percents that always add up to 100 (owner 2026-11-20). */
export function skillShares(skills: Skills): Record<SkillKey, number> {
  const parts = SKILL_PARTS.map(({ key, weight }) => ({ key, value: clamp(skills[key], 5) * weight }));
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const out = { hockey_sense: 0, skating: 0, defense: 0, offense: 0 } as Record<SkillKey, number>;
  if (total <= 0) return out;
  // Largest remainder, so rounding never makes 99% or 101%.
  const raw = parts.map((p) => ({ key: p.key, exact: (p.value / total) * 100 }));
  for (const r of raw) out[r.key] = Math.floor(r.exact);
  let left = 100 - raw.reduce((sum, r) => sum + Math.floor(r.exact), 0);
  for (const r of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (left <= 0) break;
    out[r.key] += 1;
    left -= 1;
  }
  return out;
}

/** Team health (owner 2026-11-20): is the team well-rounded, or heavy or
 *  light on one skill? Each skill counts the same here (not the PPV
 *  weights), so a well-rounded team splits ~25/25/25/25. A share at least
 *  HEALTH_MARGIN points over 25 is "heavy", that far under is "light". */
export const HEALTH_MARGIN = 4;

const SHORT: Record<SkillKey, string> = {
  hockey_sense: "Hockey Sense",
  skating: "Skating",
  defense: "Defense",
  offense: "Offense",
};

export function teamHealth(skills: Skills): {
  shares: Record<SkillKey, number>;
  heavy: SkillKey | null;
  light: SkillKey | null;
  label: string;
} {
  const raw = SKILL_PARTS.map(({ key }) => ({ key, value: clamp(skills[key], 5) }));
  const total = raw.reduce((sum, r) => sum + r.value, 0);
  const shares = { hockey_sense: 0, skating: 0, defense: 0, offense: 0 } as Record<SkillKey, number>;
  if (total <= 0) return { shares, heavy: null, light: null, label: "" };
  const exact = raw.map((r) => ({ key: r.key, pct: (r.value / total) * 100 }));
  for (const e of exact) shares[e.key] = Math.floor(e.pct);
  let left = 100 - exact.reduce((sum, e) => sum + Math.floor(e.pct), 0);
  for (const e of [...exact].sort((a, b) => (b.pct % 1) - (a.pct % 1))) {
    if (left <= 0) break;
    shares[e.key] += 1;
    left -= 1;
  }
  // Judge on the exact shares so rounding never flips the verdict.
  const top = exact.reduce((a, b) => (b.pct > a.pct ? b : a));
  const low = exact.reduce((a, b) => (b.pct < a.pct ? b : a));
  const heavy = top.pct >= 25 + HEALTH_MARGIN ? top.key : null;
  const light = low.pct <= 25 - HEALTH_MARGIN ? low.key : null;
  const parts = [heavy && `Heavy on ${SHORT[heavy]}`, light && `Light on ${SHORT[light]}`].filter(Boolean);
  return { shares, heavy, light, label: parts.length ? parts.join(" · ") : "Balanced" };
}

/** Bar slices for team health: each skill's equal-weight share (0-100). */
export function healthBarParts(skills: Skills): { key: SkillKey; pct: number; color: string }[] {
  const total = SKILL_PARTS.reduce((sum, { key }) => sum + clamp(skills[key], 5), 0);
  return SKILL_PARTS.map(({ key, color }) => ({ key, color, pct: total > 0 ? (clamp(skills[key], 5) / total) * 100 : 0 }));
}

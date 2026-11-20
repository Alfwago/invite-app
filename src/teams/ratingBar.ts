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

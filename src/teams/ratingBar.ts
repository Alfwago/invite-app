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
/** `color` is the bar slice (see-through, behind text); `swatch` the key. */
export const SKILL_PARTS: { key: SkillKey; weight: number; label: string; color: string; swatch: string }[] = [
  { key: "hockey_sense", weight: 0.4, label: "Hockey Sense", color: "rgba(255, 213, 74, 0.38)", swatch: "rgba(255, 213, 74, 0.7)" },
  { key: "skating", weight: 0.25, label: "Skating", color: "rgba(74, 163, 255, 0.38)", swatch: "rgba(74, 163, 255, 0.7)" },
  { key: "defense", weight: 0.2, label: "Defense", color: "rgba(61, 220, 132, 0.34)", swatch: "rgba(61, 220, 132, 0.7)" },
  { key: "offense", weight: 0.15, label: "Offense", color: "rgba(255, 107, 90, 0.38)", swatch: "rgba(255, 107, 90, 0.7)" },
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

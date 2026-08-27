// Minimal shared style tokens. The website's palette is gold-on-dark; this is a
// pragmatic first pass, not a full design system.

export const colors = {
  bg: "#0f1115",
  card: "#1a1d23",
  border: "#2a2e37",
  text: "#f2f3f5",
  textMuted: "#9aa0aa",
  gold: "#e5b100",
  goldText: "#1a1400",
  green: "#2e9e5b",
  red: "#d1483f",
  amber: "#c98a1a",
  blue: "#3b82f6",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export const radius = { sm: 6, md: 10, lg: 14 };

export const rsvpColor: Record<string, string> = {
  YES: colors.green,
  NO: colors.red,
  MAYBE: colors.amber,
  WAITLIST: colors.blue,
  NO_RESPONSE: colors.textMuted,
};

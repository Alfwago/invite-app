// Palette lifted straight from the website's theme.css (invites.falcon83.com)
// so the app reads as the same product: black-and-gold, one --gold token that
// everything gold inherits. Status colors follow one rule — green = good,
// amber = caution, red = bad — and "needs goalies" is ALWAYS red.

export const colors = {
  bg: "#000000",
  card: "#0a0a0a",
  cardRaised: "#101010", // stat tiles, inputs, secondary buttons
  border: "#1a1a1a",
  text: "#ffffff",
  textMuted: "#9aa0a6",

  gold: "#d4af37",
  goldText: "#111111",
  goldDim: "#141000", // gold badge / league-notice background

  green: "#33d17a",
  greenDim: "#00140a",
  amber: "#f0a63a",
  amberDim: "#2a1a05",
  red: "#ff5a5f",
  redDim: "#1a0000",
  blue: "#5aa9e6",
  blueDim: "#05141f",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

// btn 10 · small card / tile 12 · card 16 · pill
export const radius = { sm: 8, md: 10, lg: 16, pill: 999 };

// One type scale, matching theme.css --text-*
export const font = { xs: 11, sm: 13, base: 16, md: 18, lg: 22, xl: 28 };

// RSVP status -> color. Attendance is a separate axis from roster health:
// going is good, maybe/waitlist are caution, everything else is neutral.
export const rsvpColor: Record<string, string> = {
  YES: colors.green,
  NO: colors.textMuted,
  MAYBE: colors.amber,
  WAITLIST: colors.amber,
  NO_RESPONSE: colors.textMuted,
};

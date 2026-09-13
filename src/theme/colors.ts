import { vars } from 'nativewind';

/**
 * Cellar's slice of the Ping token set (PING.md §4.1). Nineteen shadcn-shaped
 * variables, identical to Radar, Lidar, Sonar and Pulsar except `--primary`
 * and `--ring`.
 *
 * The accent is slate-500. It is the quietest accent in the family on purpose:
 * the other four sit on artwork — posters, covers, sleeves — and have to hold
 * their own against it. Cellar has no artwork at all. Every screen is text on
 * the scope, so a loud hue would end up marking half of it. Slate marks the one
 * live thing and otherwise disappears, which is what the accent rule asks for
 * (§1.2) and what a wall of one-line entries actually needs.
 *
 * #64748B against #0A0A0A measures 4.2:1, so it clears the ~3:1 the accent needs
 * as an icon and hairline colour on near-black (§4.2), and white on it measures
 * 4.8:1 — the house rule holds here, unlike Pulsar's amber.
 */
const dark = {
  '--background': '0 0% 3.9%',
  '--foreground': '0 0% 98%',
  '--card': '0 0% 3.9%',
  '--card-foreground': '0 0% 98%',
  '--popover': '0 0% 3.9%',
  '--popover-foreground': '0 0% 98%',
  '--primary': '215 16% 47%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 14.9%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '0 0% 14.9%',
  '--muted-foreground': '0 0% 63.9%',
  '--accent': '0 0% 14.9%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 62.8% 30.6%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 14.9%',
  '--input': '0 0% 14.9%',
  '--ring': '215 16% 47%',
};

// slate-600 — the 500 is too close to `--muted-foreground` once the ground goes
// light, and an accent that reads as secondary text is not an accent.
const light = {
  '--background': '0 0% 98%',
  '--foreground': '0 0% 9%',
  '--card': '0 0% 100%',
  '--card-foreground': '0 0% 9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '0 0% 9%',
  '--primary': '215 19% 35%',
  '--primary-foreground': '0 0% 98%',
  '--secondary': '0 0% 96%',
  '--secondary-foreground': '0 0% 9%',
  '--muted': '0 0% 96%',
  '--muted-foreground': '0 0% 45%',
  '--accent': '0 0% 96%',
  '--accent-foreground': '0 0% 9%',
  '--destructive': '0 62.8% 40%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '0 0% 90%',
  '--input': '0 0% 90%',
  '--ring': '215 19% 35%',
};

export const themeVars = {
  dark: vars(dark),
  light: vars(light),
};

/** Unwrapped, for mirroring onto document.documentElement on web. */
export const rawThemeVars = { dark, light };

export type ResolvedTheme = keyof typeof themeVars;

/**
 * The handful of colours that cannot come from a NativeWind class: SVG strokes,
 * chart fills, the nav islands' glass. Nothing else in the app may hold a hex.
 */
export const COLORS = {
  accent: 'hsl(215 16% 47%)',
  accentSoft: 'hsla(215,16%,47%,0.16)',
  accentInk: 'hsl(0 0% 98%)',
  foreground: 'hsl(0 0% 98%)',
  muted: 'hsl(0 0% 63.9%)',
  mutedDeep: 'hsl(0 0% 45%)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239,68,68,0.12)',
  islandFill: 'rgba(22,22,22,0.72)',
  islandEdge: 'rgba(255,255,255,0.09)',
  islandPlate: 'rgba(255,255,255,0.12)',
  /** An unselected chip's ground — the one surface that is not a token (§4.5). */
  chipGround: 'rgba(255,255,255,0.06)',
} as const;

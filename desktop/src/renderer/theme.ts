import { dark, light, COLORS } from "@/lib/designTokens";
import { stateMeta } from "@/lib/entryState";
import { desktopPreferenceStorage } from "@/lib/deskStorage";
import type { ThemePref } from "@/lib/userSettings";

const storage = desktopPreferenceStorage(localStorage, "cellar-theme");
export function cachedTheme(): ThemePref {
  const value = storage.getItem("theme_preference");
  return value === "light" || value === "system" ? value : "dark";
}
export function applyTheme(theme: ThemePref) {
  const resolved =
    theme === "system"
      ? matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark"
      : theme;
  const style = document.documentElement.style;
  for (const [key, value] of Object.entries(
    resolved === "light" ? light : dark,
  ))
    style.setProperty(key, value);
  for (const [key, value] of Object.entries(COLORS))
    style.setProperty(`--ink-${key}`, value);
  style.setProperty(
    "--desktop-sidebar",
    resolved === "light" ? "hsl(var(--secondary))" : COLORS.sidebar,
  );
  for (const [name, value] of Object.entries({
    working: stateMeta("doing").color,
    workingSoft: stateMeta("doing").tint,
    doneSoft: stateMeta("done").tint,
  }))
    style.setProperty(`--status-${name}`, value);
  document.documentElement.dataset.theme = resolved;
}
export function cacheTheme(theme: ThemePref) {
  storage.setItem("theme_preference", theme);
}

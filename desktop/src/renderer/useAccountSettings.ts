import { useCallback, useEffect, useState } from "react";
import {
  CELLAR_SETTINGS_COLUMNS,
  DEFAULT_CELLAR_SETTINGS,
  cellarSettingsToRow,
  normalizeCellarSettings,
  type CellarSettings,
  type CellarSettingsRow,
} from "@/lib/cellarSettings";
import type { ThemePref } from "@/lib/userSettings";
import { supabase } from "./auth";
import { applyTheme, cachedTheme, cacheTheme } from "./theme";

export function useAccountSettings(ownerId: string) {
  const [settings, setSettings] = useState(DEFAULT_CELLAR_SETTINGS);
  const [theme, setThemeState] = useState(cachedTheme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const [cellar, shared] = await Promise.all([
      supabase
        .from("cellar_settings")
        .select(CELLAR_SETTINGS_COLUMNS)
        .eq("user_id", ownerId)
        .maybeSingle(),
      supabase
        .from("user_settings")
        .select("theme")
        .eq("user_id", ownerId)
        .maybeSingle(),
    ]);
    if (cellar.error || shared.error) throw cellar.error ?? shared.error;
    setSettings(
      normalizeCellarSettings(cellar.data as CellarSettingsRow | null),
    );
    const value = shared.data?.theme;
    const next: ThemePref =
      value === "light" || value === "system" ? value : "dark";
    setThemeState(next);
    cacheTheme(next);
    setLoading(false);
    setError(null);
  }, [ownerId]);
  useEffect(() => {
    const load = () => {
      void refresh().catch((error) => {
        setLoading(false);
        setError(String(error));
      });
    };
    load();
    const channel = supabase.channel(`desktop-settings:${ownerId}`);
    for (const table of ["cellar_settings", "user_settings"])
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${ownerId}`,
        },
        load,
      );
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh, ownerId]);
  useEffect(() => {
    applyTheme(theme);
    const media = matchMedia("(prefers-color-scheme: light)");
    const changed = () => applyTheme(theme);
    media.addEventListener("change", changed);
    return () => media.removeEventListener("change", changed);
  }, [theme]);
  async function update(patch: Partial<CellarSettings>) {
    const previous = settings;
    setSettings((value) => ({ ...value, ...patch }));
    const result = await supabase
      .from("cellar_settings")
      .upsert(
        { user_id: ownerId, ...cellarSettingsToRow(patch) },
        { onConflict: "user_id" },
      );
    if (result.error) {
      setSettings(previous);
      setError(result.error.message);
    } else setError(null);
  }
  async function setTheme(next: ThemePref) {
    const previous = theme;
    setThemeState(next);
    cacheTheme(next);
    const result = await supabase
      .from("user_settings")
      .upsert({ user_id: ownerId, theme: next }, { onConflict: "user_id" });
    if (result.error) {
      setThemeState(previous);
      cacheTheme(previous);
      setError(result.error.message);
    } else setError(null);
  }
  return { settings, theme, loading, error, update, setTheme };
}

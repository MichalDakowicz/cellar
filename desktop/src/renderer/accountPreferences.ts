import { createContext, useContext } from "react";
import {
  DEFAULT_CELLAR_SETTINGS,
  type CellarSettings,
} from "@/lib/cellarSettings";
import type { ThemePref } from "@/lib/userSettings";
import { cachedTheme } from "./theme";

export type AccountPreferences = {
  settings: CellarSettings;
  theme: ThemePref;
  error: string | null;
  loading: boolean;
  update: (patch: Partial<CellarSettings>) => Promise<void>;
  setTheme: (theme: ThemePref) => Promise<void>;
};
export const AccountPreferencesContext = createContext<AccountPreferences>({
  settings: DEFAULT_CELLAR_SETTINGS,
  theme: cachedTheme(),
  error: null,
  loading: true,
  update: async () => {},
  setTheme: async () => {},
});
export const useAccountPreferences = () =>
  useContext(AccountPreferencesContext);

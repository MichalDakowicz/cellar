import type { ReactNode } from "react";
import { AccountPreferencesContext } from "./accountPreferences";
import { useAccountSettings } from "./useAccountSettings";

export function PreferencesProvider({
  ownerId,
  children,
}: {
  ownerId: string;
  children: ReactNode;
}) {
  const prefs = useAccountSettings(ownerId);
  return (
    <AccountPreferencesContext.Provider value={prefs}>
      {children}
    </AccountPreferencesContext.Provider>
  );
}

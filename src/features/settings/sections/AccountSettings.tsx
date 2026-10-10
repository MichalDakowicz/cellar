import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Segmented, SwitchRow } from '@/components/ui/controls';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import type { ThemePref } from '@/lib/userSettings';
import { useTheme } from '@/theme/ThemeProvider';

import { AccountSection } from '../AccountSection';
import { AppUpdateControl } from '../AppUpdateControl';
import { DisplaySettings } from '../DisplaySettings';
import { SettingsGroup } from '../SettingsGroup';
import { SettingsPage } from '../SettingsPage';
import { SignOutSheet } from '../SignOutSheet';

/**
 * Settings › account (Map › settings): the profile page's leftovers — one ping
 * account, how cellar looks, the theme it shares with the siblings — and sign
 * out. There is no privacy row: the cellar is owner-only at the database.
 */
export function AccountSettings() {
  const { settings, updateSettings } = useCellarSettings();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  return (
    <SettingsPage title="account" sub="your ping account, how cellar looks, and signing out">
      <AccountSection gutter="" />

      <SettingsGroup title="display">
        <SwitchRow
          label="kind glyphs in the gutter"
          sub="the column of marks that makes a list scan like a ledger"
          value={settings.showCodes}
          onChange={(value) => void updateSettings({ showCodes: value })}
        />
      </SettingsGroup>
      <DisplaySettings gutter="" />

      <SettingsGroup title="theme">
        <Segmented<ThemePref>
          label="theme"
          value={theme}
          onChange={setTheme}
          options={[
            { value: 'dark', label: 'dark' },
            { value: 'light', label: 'light' },
            { value: 'system', label: 'system' },
          ]}
        />
        <Text className="font-sans text-xs text-muted-foreground">
          shared with radar, lidar, sonar and pulsar — picking light here picks light there.
        </Text>
      </SettingsGroup>

      <SettingsGroup title="about">
        <AppUpdateControl />
        <Text className="font-sans text-xs text-muted-foreground">
          one account across radar, lidar, sonar, pulsar and cellar. your cellar itself is private — nobody else can
          read it, and there is no switch that changes that. signing out here asks whether to leave just cellar or
          every ping app.
        </Text>
      </SettingsGroup>

      <View className="py-7">
        <Pressable accessibilityRole="button" accessibilityLabel="sign out" hitSlop={8} onPress={() => setSigningOut(true)}>
          <Text className="font-sans text-sm font-semibold text-destructive-foreground">sign out</Text>
        </Pressable>
      </View>
      <SignOutSheet open={signingOut} onClose={() => setSigningOut(false)} />
    </SettingsPage>
  );
}

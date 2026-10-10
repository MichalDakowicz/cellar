import { Redirect, useLocalSearchParams, type Href } from 'expo-router';
import type { ComponentType } from 'react';

import { AccountSettings } from '@/features/settings/sections/AccountSettings';
import { AgentsSettings } from '@/features/settings/sections/AgentsSettings';
import { HostsSettings, KeysSettings, RecipesSettings, UsageSettings } from '@/features/settings/sections/DeskBlockPages';
import { DevicesSettings } from '@/features/settings/sections/DevicesSettings';
import { DumpSettings } from '@/features/settings/sections/DumpSettings';
import { NightSettings } from '@/features/settings/sections/NightSettings';
import { NotificationsSettings } from '@/features/settings/sections/NotificationsSettings';
import { settingsSection, type SettingsSectionId } from '@/lib/settingsSections';

const PAGES: Record<SettingsSectionId, ComponentType> = {
  dump: DumpSettings,
  agents: AgentsSettings,
  hosts: HostsSettings,
  recipes: RecipesSettings,
  keys: KeysSettings,
  devices: DevicesSettings,
  notifications: NotificationsSettings,
  night: NightSettings,
  usage: UsageSettings,
  account: AccountSettings,
};

/** One settings section (`lib/settingsSections`); an unknown one goes back to the list. */
export default function SettingsSectionScreen() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const found = settingsSection(section);
  if (!found) return <Redirect href={'/settings' as Href} />;
  const Page = PAGES[found.id];
  return <Page />;
}

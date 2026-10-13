import { Stack } from 'expo-router';
import { View } from 'react-native';

import { AppChrome } from '@/components/layout/AppChrome';
import { SettingsNav } from '@/features/settings/SettingsNav';
import { useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';

/**
 * Settings (Map › settings): on the desktop the app's sidebar, the settings
 * column, then the page; on the phone the list, and each section pushed from
 * it. One frame for every section, so the chrome is mounted once.
 */
export default function SettingsLayout() {
  const isDesktop = useIsDesktop();
  const sidebar = useSidebarSpace();

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 flex-row" style={{ marginLeft: sidebar }}>
        {isDesktop && <SettingsNav />}
        <View className="flex-1">
          {/* A stack, so a section pushed from the phone's list goes back to it. */}
          <Stack screenOptions={{ headerShown: false, animation: isDesktop ? 'none' : 'default' }} />
        </View>
      </View>
      <AppChrome />
    </View>
  );
}

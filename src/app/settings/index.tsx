import { Redirect, useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SettingsPage } from '@/features/settings/SettingsPage';
import { useIsDesktop } from '@/hooks/useResponsive';
import { SETTINGS_SECTIONS, settingsHref } from '@/lib/settingsSections';
import { COLORS } from '@/theme/colors';

/**
 * Settings, the way in. On the phone, the sections as a list, each opening its
 * page; on the desktop the column beside the page is that list, so this opens
 * the first section instead.
 */
export default function SettingsIndex() {
  const router = useRouter();
  const isDesktop = useIsDesktop();

  if (isDesktop) return <Redirect href={settingsHref(SETTINGS_SECTIONS[0].id) as Href} />;

  return (
    <SettingsPage title="settings" sub="cellar, your desk, and your account">
      <View className="pt-5">
        {SETTINGS_SECTIONS.map((section) => (
          <Pressable
            key={section.id}
            accessibilityRole="button"
            accessibilityLabel={section.label}
            onPress={() => router.push(settingsHref(section.id) as Href)}
            className="flex-row items-center gap-3 py-3 active:opacity-70"
          >
            <View className="min-w-0 flex-1">
              <Text className="text-base text-foreground">{section.label}</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">{section.sub}</Text>
            </View>
            <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />
          </Pressable>
        ))}
      </View>
    </SettingsPage>
  );
}

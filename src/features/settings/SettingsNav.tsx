import { usePathname, useRouter, type Href } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import { SETTINGS_SECTIONS, settingsHref, type SettingsSection } from '@/lib/settingsSections';
import { COLORS } from '@/theme/colors';

/**
 * The settings column on the desktop (`DeskUsage.dc.html`): "settings", then
 * one row per section, the open one lit. The phone has the same list as a
 * page of its own.
 */
export function SettingsNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View className="w-[210px] gap-0.5 border-r border-border/50 px-3 pt-6">
      <Text className="font-sans px-3 pb-3 text-xl font-bold text-foreground">settings</Text>
      {SETTINGS_SECTIONS.map((section) => (
        <NavRow
          key={section.id}
          section={section}
          on={pathname === settingsHref(section.id)}
          onPress={() => router.replace(settingsHref(section.id) as Href)}
        />
      ))}
    </View>
  );
}

function NavRow({ section, on, onPress }: { section: SettingsSection; on: boolean; onPress: () => void }) {
  const { hovered, bind } = useHover();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityState={{ selected: on }}
      accessibilityLabel={section.label}
      onPress={onPress}
      {...bind}
      className={`h-[34px] justify-center rounded-lg px-3 ${on ? 'bg-secondary' : ''}`}
      style={[webTransition('background-color'), hovered && !on ? { backgroundColor: COLORS.rowHover } : null]}
    >
      <Text className={`font-sans text-sm ${on || hovered ? 'text-foreground' : 'text-muted-foreground'} ${on ? 'font-semibold' : ''}`}>
        {section.label}
      </Text>
    </Pressable>
  );
}

import { useRouter, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PreviewPage } from '@/components/desk/PreviewPage';
import { SampleDesktopScreen } from '@/components/desk/SampleDesktopScreen';
import { Glass, ScreenIslands } from '@/components/desk/ScreenIslands';
import { useDeskScreenView } from '@/features/desk/useDeskScreenView';
import { COLORS } from '@/theme/colors';

/**
 * The live pc screen (docs/desk/screens.md, `Screen.dc.html`): landscape, the
 * picture edge to edge, who and how it is doing top left, the mode's hint top
 * right, and the screen's own islands at the bottom. Its own channel — nothing
 * from a run is mixed in — and it ends when you leave.
 */
export default function ScreenView() {
  const router = useRouter();
  const screen = useDeskScreenView();
  const insets = useSafeAreaInsets();
  const top = Math.max(insets.top, 12);

  return (
    <View className="flex-1 bg-background">
      <StatusBar hidden />
      <View style={{ flex: 1 }} pointerEvents="none">
        {screen.sample ? <SampleDesktopScreen /> : screen.url && !screen.unreachable ? (
          <PreviewPage url={screen.url} reloads={0} {...screen.page} />
        ) : (
          <View className="flex-1 items-center justify-center px-10">
            <Text className="font-sans text-center text-sm text-muted-foreground">{screen.unreachable ?? 'asking the pc for its screen…'}</Text>
          </View>
        )}
      </View>

      <View
        style={{ position: 'absolute', top, left: Math.max(insets.left, 24), right: Math.max(insets.right, 24) }}
        className="flex-row items-start justify-between gap-3"
        pointerEvents="none"
      >
        <Glass style={{ height: 32, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: screen.status.live ? COLORS.ok : COLORS.muted }} />
          <Text className="font-sans text-xs font-semibold text-foreground">{screen.name}</Text>
          <Text className="font-sans text-xs text-muted-foreground">{screen.status.text}</Text>
        </Glass>
        <Glass style={{ height: 32, paddingHorizontal: 12, justifyContent: 'center', flexShrink: 1 }}>
          <Text className="font-sans text-xs" style={{ color: COLORS.foregroundSoft }} numberOfLines={1}>
            {screen.hint}
          </Text>
        </Glass>
      </View>

      <ScreenIslands
        mode={screen.mode}
        onMode={screen.onMode}
        onLeave={() => (router.canGoBack() ? router.back() : router.replace('/desk' as Href))}
        bottom={insets.bottom + 10}
      />
    </View>
  );
}

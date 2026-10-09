import { useRouter, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { deskBridge } from '@/features/desk/bridge';
import { useDeskPair } from '@/store/deskPair';
import { COLORS } from '@/theme/colors';

/**
 * The way to the pc screen from settings — where you pair a phone, and where
 * the pc lives when it is not in front of you. One row: the screen behind it
 * is the setting.
 */
export function DeskSettings({ gutter }: { gutter: string }) {
  const router = useRouter();
  const pair = useDeskPair((state) => state.pair);
  const here = deskBridge() !== null;

  const sub = here
    ? 'pair a phone with this pc, so it can start agents here'
    : pair
      ? `paired with ${pair.name} — start agents on it, open its pages and screen, install its builds`
      : 'pair with cellar on your pc to start agents on it from here';

  return (
    <View className={`gap-2 pt-7 ${gutter}`}>
      <Overline>{here ? 'this pc' : 'your pc'}</Overline>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={here ? 'this pc' : 'your pc'}
        onPress={() => router.push('/desk' as Href)}
        className="flex-row items-center gap-3 py-2 active:opacity-70"
      >
        <View className="min-w-0 flex-1">
          <Text className="text-sm text-foreground">{here ? 'phones and runs' : (pair?.name ?? 'pair with your pc')}</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">{sub}</Text>
        </View>
        <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

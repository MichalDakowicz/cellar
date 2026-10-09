import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import type { DeskFigure } from '@/lib/deskHome';

/** "today" on the wide desk: big numbers, small words (`DeskHome.dc.html`). */
export function DeskTodayFigures({ figures }: { figures: DeskFigure[] }) {
  return (
    <View className="gap-3">
      <Overline>today</Overline>
      <View className="flex-row flex-wrap gap-x-8 gap-y-4">
        {figures.map((figure) => (
          <View key={figure.label} className="gap-0.5">
            <Text className="text-3xl font-bold tracking-tight text-foreground">{figure.value}</Text>
            <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{figure.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

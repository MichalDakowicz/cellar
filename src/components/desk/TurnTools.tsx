import { useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Pencil, SquareTerminal, Wrench } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import type { TurnItem } from '@/lib/deskEvents';
import { visibleToolRows } from '@/lib/deskTurnGroups';
import { COLORS } from '@/theme/colors';

export function TurnTools({ items, historical }: { items: TurnItem[]; historical: boolean }) {
  const [open, setOpen] = useState<string[]>([]);
  return <View className="rounded-xl bg-row px-3 py-1">{visibleToolRows(items).map((item) => {
    const expanded = open.includes(item.id);
    const Icon = item.kind === 'command_execution' ? SquareTerminal : item.kind === 'file_change' ? Pencil : item.kind === 'file_search' ? FileText : Wrench;
    const Chevron = expanded ? ChevronDown : ChevronRight;
    return <View key={item.id}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`${item.text}, ${historical ? 'saved' : item.status}`} className="min-h-11 flex-row items-center gap-2 active:opacity-70" onPress={() => setOpen(expanded ? open.filter((id) => id !== item.id) : [...open, item.id])}>
        <Icon size={15} color={COLORS.foregroundSoft} strokeWidth={2} />
        <Text numberOfLines={1} className={`min-w-0 flex-1 text-[13px] text-foreground ${item.kind === 'command_execution' ? 'font-mono' : 'font-sans'}`}>{item.text}</Text>
        <Text className="font-sans text-xs text-muted-foreground">{historical ? 'saved' : item.status === 'running' ? 'working' : item.status}</Text>
        <Chevron size={16} color={COLORS.muted} />
      </Pressable>
      {expanded && <View className="gap-1 pb-2 pl-6"><Text selectable className="font-mono text-xs text-foreground">{item.text}</Text>{!!item.detail && <Text selectable className="font-mono text-xs text-muted-foreground">{item.detail}</Text>}</View>}
    </View>;
  })}</View>;
}

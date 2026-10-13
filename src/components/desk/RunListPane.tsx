import { Plus } from 'lucide-react-native';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/controls';
import type { RunFilter } from '@/lib/deskRunList';
import { runChip, type DeskRunCard } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

const FILTERS: { id: RunFilter; label: string }[] = [
  { id: 'all', label: 'all' },
  { id: 'waiting', label: 'waiting' },
  { id: 'running', label: 'running' },
];

/**
 * The desktop chat's left pane (`DeskChat.dc.html`): runs grouped by project,
 * what needs you first, with a search and all · waiting · running.
 */
export function RunListPane({
  groups,
  counts,
  filter,
  onFilter,
  query,
  onQuery,
  currentId,
  onOpen,
  onNew,
}: {
  groups: { project: string; runs: DeskRunCard[] }[];
  counts: Record<RunFilter, number>;
  filter: RunFilter;
  onFilter: (filter: RunFilter) => void;
  query: string;
  onQuery: (query: string) => void;
  currentId: string;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <View className="w-[300px] gap-3 border-r border-border/50 px-4 pt-8">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans text-xl font-bold tracking-tight text-foreground">chat</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="new run"
          onPress={onNew}
          className="h-9 w-9 items-center justify-center rounded-full bg-secondary active:opacity-70"
        >
          <Plus size={18} color={COLORS.foreground} strokeWidth={2} />
        </Pressable>
      </View>
      <TextInput
        className="font-sans h-10 rounded-xl bg-secondary px-3 text-sm text-foreground"
        value={query}
        onChangeText={onQuery}
        placeholder="search runs — try $app or claude"
        placeholderTextColor={COLORS.muted}
        accessibilityLabel="search runs"
      />
      <View className="flex-row gap-1.5">
        {FILTERS.map((option) => (
          <Chip
            key={option.id}
            label={option.id === 'all' ? option.label : `${option.label} ${counts[option.id]}`}
            selected={filter === option.id}
            onPress={() => onFilter(option.id)}
          />
        ))}
      </View>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {groups.length === 0 && <Text className="font-sans pt-2 text-xs text-muted-foreground">no runs like that</Text>}
        {groups.map((group) => (
          <View key={group.project} className="gap-0.5 pt-3">
            <Text className="px-2.5 pb-1 font-mono text-xs font-semibold text-muted-foreground">{`$${group.project}`}</Text>
            {group.runs.map((run) => {
              const chip = runChip(run.state);
              const on = run.id === currentId;
              return (
                <Pressable
                  key={run.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={run.title}
                  onPress={() => onOpen(run.id)}
                  className={`gap-0.5 rounded-xl px-2.5 py-2 active:opacity-70 ${on ? 'bg-secondary' : ''}`}
                >
                  <Text className="font-sans text-sm font-semibold text-foreground" numberOfLines={1}>
                    {run.title}
                  </Text>
                  <View className="flex-row items-center gap-1.5">
                    <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: chip.color }} />
                    <Text className="font-sans min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
                      {run.detail ?? run.meta}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

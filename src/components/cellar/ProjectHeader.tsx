import { Funnel, List, Rows3 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';
import type { ProjectView } from '@/store/cellarPrefs';

type ProjectHeaderProps = {
  name: string;
  meta: string;
  /** Two letters, the same mark the tile wears on the shelf. */
  initials: string;
  view: ProjectView;
  onView: (view: ProjectView) => void;
  filtered: boolean;
  /** Phone only — on desktop the filter is open in the rail beside the list. */
  onFilter?: () => void;
  /** Desktop wears the mark and a bigger title; phone keeps the line it had. */
  large?: boolean;
};

/**
 * A project's heading: the mark, the name, what is in it, and the two readings.
 *
 * The mark is the shelf tile's own two letters, at size. A project has no
 * artwork and never will (components/cellar/ProjectCard), so those letters are
 * the only thing that makes one project's page recognisably not another's —
 * which on a wide screen, where the page is otherwise a column of text, is the
 * difference between arriving somewhere and arriving at a list.
 */
export function ProjectHeader({
  name,
  meta,
  initials,
  view,
  onView,
  filtered,
  onFilter,
  large,
}: ProjectHeaderProps) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="min-w-0 flex-1 flex-row items-center gap-3.5">
        {large && (
          <View className="h-14 w-14 items-center justify-center rounded-xl bg-neutral-900">
            <Text className="text-xl font-bold lowercase tracking-tight text-muted-foreground opacity-60">
              {initials}
            </Text>
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text
            className={[
              'font-bold leading-tight tracking-tight text-foreground',
              large ? 'text-3xl' : 'text-2xl',
            ].join(' ')}
            numberOfLines={2}
          >
            {name}
          </Text>
          <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-1 rounded-lg bg-secondary p-[3px]">
        <Segment label="grouped by kind" active={view === 'grouped'} onPress={() => onView('grouped')}>
          <Rows3 size={16} color={view === 'grouped' ? COLORS.foreground : COLORS.muted} strokeWidth={2} />
        </Segment>
        <Segment label="one stream" active={view === 'stream'} onPress={() => onView('stream')}>
          <List size={16} color={view === 'stream' ? COLORS.foreground : COLORS.muted} strokeWidth={2} />
        </Segment>
        {onFilter && (
          <Segment label="filter" active={filtered} onPress={onFilter}>
            <Funnel size={16} color={filtered ? COLORS.accent : COLORS.muted} strokeWidth={2} />
          </Segment>
        )}
      </View>
    </View>
  );
}

function Segment({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      {...bind}
      style={[webTransition('background-color'), hovered && !active ? { backgroundColor: COLORS.chipGround } : null]}
      className={['h-[30px] w-[34px] items-center justify-center rounded-md', active ? 'bg-white/10' : ''].join(' ')}
    >
      {children}
    </Pressable>
  );
}

import { Funnel, List, Rows3 } from 'lucide-react-native';
import type { ReactNode } from 'react';
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
  /**
   * A control that holds the left of the row on its own — back, on a pushed
   * desktop screen. Giving it one also moves everything about the project to
   * the other end, so see the note in the body.
   */
  lead?: ReactNode;
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
  lead,
}: ProjectHeaderProps) {
  // The project itself: mark, name, and what is in it. One block, so it can be
  // put at either end of the row without the three coming apart.
  const identity = (
    <View className={['min-w-0 flex-row items-center gap-3.5', lead ? 'shrink' : 'flex-1'].join(' ')}>
      {large && (
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-neutral-900">
          <Text className="text-xl font-bold lowercase tracking-tight text-muted-foreground opacity-60">
            {initials}
          </Text>
        </View>
      )}
      <View className={['min-w-0', lead ? 'shrink' : 'flex-1'].join(' ')}>
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
  );

  const readings = (
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
  );

  // Back holds the left on its own, and everything about the project moves
  // across to join the toggle. Stacking a control, a 56px mark, a 30px name
  // and a line of counts into the same corner is the cramming this avoids —
  // the row has a whole window of width and was using one end of it.
  if (lead) {
    return (
      <View className="flex-row items-end justify-between gap-6">
        {lead}
        <View className="min-w-0 flex-row items-end justify-end gap-5">
          {identity}
          {readings}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-row items-end justify-between gap-3">
      {identity}
      {readings}
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

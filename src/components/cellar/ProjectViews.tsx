import { Columns3, Funnel, List, Rows3 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import type { KanbanAxis } from '@/lib/kanban';
import { COLORS } from '@/theme/colors';
import type { ProjectView } from '@/store/cellarPrefs';

/**
 * The three readings of a project's list, as one segmented control.
 *
 * Its own component rather than a part of `ProjectHeader` because the two do
 * not always sit together: on a phone it rides the heading, and on desktop it
 * stacks under back in the chrome column at the left, where the heading is at
 * the other end of the row entirely.
 *
 * The board's axis rides under it rather than beside it, and only while the
 * board is the view. It is a second question — *what are the columns* — and
 * folding it into the same row as *which reading* would ask both at once on a
 * control that is mostly answering neither.
 */
export function ProjectViews({
  view,
  onView,
  axis = 'state',
  onAxis,
  filtered = false,
  onFilter,
}: {
  view: ProjectView;
  onView: (view: ProjectView) => void;
  axis?: KanbanAxis;
  /** Leave it out and the board's axis toggle stays off. */
  onAxis?: (axis: KanbanAxis) => void;
  filtered?: boolean;
  /** Phone only — on desktop the filter is open in the rail beside the list. */
  onFilter?: () => void;
}) {
  return (
    <View className="items-start gap-1.5">
      <View className="flex-row items-center gap-1 rounded-lg bg-secondary p-[3px]">
        <Segment label="grouped by kind" active={view === 'grouped'} onPress={() => onView('grouped')}>
          <Rows3 size={16} color={view === 'grouped' ? COLORS.foreground : COLORS.muted} strokeWidth={2} />
        </Segment>
        <Segment label="one stream" active={view === 'stream'} onPress={() => onView('stream')}>
          <List size={16} color={view === 'stream' ? COLORS.foreground : COLORS.muted} strokeWidth={2} />
        </Segment>
        <Segment label="a board" active={view === 'kanban'} onPress={() => onView('kanban')}>
          <Columns3 size={16} color={view === 'kanban' ? COLORS.foreground : COLORS.muted} strokeWidth={2} />
        </Segment>
        {onFilter && (
          <Segment label="filter" active={filtered} onPress={onFilter}>
            <Funnel size={16} color={filtered ? COLORS.accent : COLORS.muted} strokeWidth={2} />
          </Segment>
        )}
      </View>

      {view === 'kanban' && onAxis && (
        <View className="flex-row items-center gap-1 rounded-lg bg-secondary p-[3px]">
          <WordSegment label="states" active={axis === 'state'} onPress={() => onAxis('state')} />
          <WordSegment label="kinds" active={axis === 'kind'} onPress={() => onAxis('kind')} />
        </View>
      )}
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
  children: ReactNode;
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

/**
 * The axis toggle reads as words rather than glyphs. "Columns by state" and
 * "columns by kind" have no icon that tells them apart, and a pair of guesses
 * is worse than two short words on a control this small.
 */
function WordSegment({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`columns by ${label === 'states' ? 'state' : 'kind'}`}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      {...bind}
      style={[webTransition('background-color'), hovered && !active ? { backgroundColor: COLORS.chipGround } : null]}
      className={['h-[26px] justify-center rounded-md px-2.5', active ? 'bg-white/10' : ''].join(' ')}
    >
      <Text className={['text-[11px] font-semibold', active ? 'text-foreground' : 'text-muted-foreground'].join(' ')}>
        {label}
      </Text>
    </Pressable>
  );
}

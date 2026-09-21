import { Funnel, List, Rows3 } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { useHover, webTransition } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';
import type { ProjectView } from '@/store/cellarPrefs';

/**
 * The two readings of a project's list, as one segmented control.
 *
 * Its own component rather than a part of `ProjectHeader` because the two do
 * not always sit together: on a phone it rides the heading, and on desktop it
 * stacks under back in the chrome column at the left, where the heading is at
 * the other end of the row entirely.
 */
export function ProjectViews({
  view,
  onView,
  filtered = false,
  onFilter,
}: {
  view: ProjectView;
  onView: (view: ProjectView) => void;
  filtered?: boolean;
  /** Phone only — on desktop the filter is open in the rail beside the list. */
  onFilter?: () => void;
}) {
  return (
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

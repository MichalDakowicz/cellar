import { Copy } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { ProjectMark } from '@/components/cellar/ProjectMark';
import { ProjectViews } from '@/components/cellar/ProjectViews';
import { COLORS } from '@/theme/colors';
import type { KanbanAxis } from '@/lib/kanban';
import type { ProjectView } from '@/store/cellarPrefs';

type ProjectHeaderProps = {
  name: string;
  meta: string;
  /** Two letters, the same mark the tile wears on the shelf. */
  initials: string;
  icon?: string | null;
  /** Desktop wears the mark and a bigger title; phone keeps the line it had. */
  large?: boolean;
  /**
   * The view toggle, when it belongs to this row. Leaving `onView` out is how
   * the desktop screen says it has put the control somewhere else — under
   * back, in the chrome column — and that this is the heading alone.
   */
  view?: ProjectView;
  onView?: (view: ProjectView) => void;
  /** The board's column axis, passed straight through to the view control. */
  axis?: KanbanAxis;
  onAxis?: (axis: KanbanAxis) => void;
  filtered?: boolean;
  /** Phone only — on desktop the filter is open in the rail beside the list. */
  onFilter?: () => void;
  onArrange?: () => void;
  /** Copies the line that starts this project in an agent. Rides the name, not a row of its own. */
  onCopy?: () => void;
};

/**
 * A project's heading: the name, what is in it, and the mark.
 *
 * The mark is the shelf tile's own two letters, at size. A project has no
 * artwork and never will (components/cellar/ProjectCard), so those letters are
 * the only thing that makes one project's page recognisably not another's —
 * which on a wide screen, where the page is otherwise a column of text, is the
 * difference between arriving somewhere and arriving at a list.
 *
 * The name leads and the mark closes the line. On desktop the whole block sits
 * at the right end of its row, so the mark lands on the outside edge of the
 * page and the words stay next to the text they head.
 */
export function ProjectHeader({
  name,
  meta,
  initials,
  icon,
  large,
  view,
  onView,
  axis,
  onAxis,
  filtered = false,
  onFilter,
  onArrange,
  onCopy,
}: ProjectHeaderProps) {
  const alone = !onView || !view;

  const identity = (
    <View className={['min-w-0 flex-row items-center gap-3.5', alone ? 'shrink' : 'flex-1'].join(' ')}>
      <View className={['min-w-0', alone ? 'shrink' : 'flex-1'].join(' ')}>
        <View className={['flex-row items-center gap-2', large ? 'justify-end' : ''].join(' ')}>
          <Text
            className={[
              'min-w-0 shrink font-bold leading-tight tracking-tight text-foreground',
              large ? 'text-3xl text-right' : 'text-2xl',
            ].join(' ')}
            numberOfLines={2}
          >
            {name}
          </Text>
          {onCopy && (
            // Beside the name rather than a row under the repo line: it is a
            // handle on this project, and a whole row for one small icon pushed
            // the list a line further down for nothing.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="copy a prompt for this project"
              hitSlop={10}
              onPress={onCopy}
              className="h-7 w-7 items-center justify-center rounded-md active:opacity-60"
            >
              <Copy size={large ? 16 : 14} color={COLORS.muted} strokeWidth={2} />
            </Pressable>
          )}
        </View>
        <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {large && <ProjectMark icon={icon} initials={initials} size={56} />}
    </View>
  );

  if (alone) return identity;

  return (
    <View className="flex-row items-end justify-between gap-3">
      {identity}
      <ProjectViews
        view={view}
        onView={onView}
        axis={axis}
        onAxis={onAxis}
        filtered={filtered}
        onFilter={onFilter}
        onArrange={onArrange}
      />
    </View>
  );
}

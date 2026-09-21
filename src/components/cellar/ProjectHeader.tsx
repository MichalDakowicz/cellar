import { Text, View } from 'react-native';

import { ProjectViews } from '@/components/cellar/ProjectViews';
import type { ProjectView } from '@/store/cellarPrefs';

type ProjectHeaderProps = {
  name: string;
  meta: string;
  /** Two letters, the same mark the tile wears on the shelf. */
  initials: string;
  /** Desktop wears the mark and a bigger title; phone keeps the line it had. */
  large?: boolean;
  /**
   * The view toggle, when it belongs to this row. Leaving `onView` out is how
   * the desktop screen says it has put the control somewhere else — under
   * back, in the chrome column — and that this is the heading alone.
   */
  view?: ProjectView;
  onView?: (view: ProjectView) => void;
  filtered?: boolean;
  /** Phone only — on desktop the filter is open in the rail beside the list. */
  onFilter?: () => void;
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
  large,
  view,
  onView,
  filtered = false,
  onFilter,
}: ProjectHeaderProps) {
  const alone = !onView || !view;

  const identity = (
    <View className={['min-w-0 flex-row items-center gap-3.5', alone ? 'shrink' : 'flex-1'].join(' ')}>
      <View className={['min-w-0', alone ? 'shrink' : 'flex-1'].join(' ')}>
        <Text
          className={[
            'font-bold leading-tight tracking-tight text-foreground',
            large ? 'text-3xl text-right' : 'text-2xl',
          ].join(' ')}
          numberOfLines={2}
        >
          {name}
        </Text>
        <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {large && (
        <View className="h-14 w-14 items-center justify-center rounded-xl bg-neutral-900">
          <Text className="text-xl font-bold lowercase tracking-tight text-muted-foreground opacity-60">
            {initials}
          </Text>
        </View>
      )}
    </View>
  );

  if (alone) return identity;

  return (
    <View className="flex-row items-end justify-between gap-3">
      {identity}
      <ProjectViews view={view} onView={onView} filtered={filtered} onFilter={onFilter} />
    </View>
  );
}

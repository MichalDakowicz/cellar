import { useLocalSearchParams, useRouter } from 'expo-router';
import { Funnel, List, Rows3 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { EntryList } from '@/components/cellar/EntryList';
import { ContentShell } from '@/components/layout/ContentShell';
import { NavIslands } from '@/components/layout/NavIslands';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useProjectScreen } from '@/features/cellar/useProjectScreen';
import { MAX_W, useGutter } from '@/hooks/useResponsive';
import { readError } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * One project, in whichever of the two readings you left it in.
 *
 * This is a pushed route, so the nav island's left plate is Back and the
 * screen's own controls live top right: the view toggle, and the filter. The
 * filter belongs here rather than on the bar because it narrows *this* project
 * and nothing else — a filter on a global control that only affects one screen
 * is a filter you forget is on.
 */
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProjectScreen(id);
  const router = useRouter();
  const openFilter = useCellarSheets((state) => state.filter);
  const gutter = useGutter();

  if (project.error) return <ErrorState message={readError(project.error)} onRetry={project.refetch} />;
  if (project.loading) return <LoadingState label="opening the project" />;

  return (
    <View className="flex-1 bg-background">
      <ContentShell maxWidth={MAX_W.text} fill>
        <EntryList
          items={project.items}
          showCode={project.showCodes}
          onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
          header={
            <View>
              <ScreenTop />
              <View className={`flex-row items-end justify-between gap-3 pb-2 ${gutter}`}>
                <View className="min-w-0 flex-1">
                  <Text className="text-2xl font-bold leading-tight tracking-tight text-foreground" numberOfLines={2}>
                    {project.name}
                  </Text>
                  <Text className="mt-1 text-xs text-muted-foreground" numberOfLines={1}>
                    {project.meta}
                  </Text>
                </View>

                <View className="flex-row items-center gap-1 rounded-lg bg-secondary p-[3px]">
                  <Segment
                    label="grouped by kind"
                    active={project.view === 'grouped'}
                    onPress={() => project.setView('grouped')}
                  >
                    <Rows3
                      size={16}
                      color={project.view === 'grouped' ? COLORS.foreground : COLORS.muted}
                      strokeWidth={2}
                    />
                  </Segment>
                  <Segment
                    label="one stream"
                    active={project.view === 'stream'}
                    onPress={() => project.setView('stream')}
                  >
                    <List
                      size={16}
                      color={project.view === 'stream' ? COLORS.foreground : COLORS.muted}
                      strokeWidth={2}
                    />
                  </Segment>
                  <Segment label="filter" active={project.filtered} onPress={() => openFilter?.()}>
                    <Funnel size={16} color={project.filtered ? COLORS.accent : COLORS.muted} strokeWidth={2} />
                  </Segment>
                </View>
              </View>

              {project.archivedCount > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${project.showArchived ? 'hide' : 'show'} archived`}
                  onPress={project.toggleArchived}
                  className={`pb-1 pt-2 active:opacity-80 ${gutter}`}
                >
                  <Text className="text-xs font-semibold text-muted-foreground">
                    {project.showArchived ? 'hide' : 'show'} {project.archivedCount} archived
                  </Text>
                </Pressable>
              )}
            </View>
          }
          empty={
            project.emptyKind === 'filtered'
              ? {
                  title: 'nothing matches',
                  body: 'loosen a kind or clear the state to see the rest of this project.',
                  action: { label: 'open the filter', onPress: () => openFilter?.() },
                }
              : {
                  title: 'nothing in here yet',
                  body: 'tap + in the nav bar and pick this project on the capture screen.',
                }
          }
        />
      </ContentShell>

      {/* Pushed out of the tabs, so the navigator's own bar is gone — the screen
          mounts it itself, which is also where the left island turns into Back
          (components/layout/navActions). */}
      <NavIslands />
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      onPress={onPress}
      className={['h-[30px] w-[34px] items-center justify-center rounded-md', active ? 'bg-white/10' : ''].join(' ')}
    >
      {children}
    </Pressable>
  );
}

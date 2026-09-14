import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { EntryList } from '@/components/cellar/EntryList';
import { ProjectAside } from '@/components/cellar/ProjectAside';
import { ProjectHeader } from '@/components/cellar/ProjectHeader';
import { RepoLink } from '@/components/cellar/RepoLink';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useProjectScreen } from '@/features/cellar/useProjectScreen';
import { MAX_W, useGutter, useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';
import { readError } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';

/**
 * One project, in whichever of the two readings you left it in.
 *
 * Two shapes. On a phone the whole screen is the list, and the things that act
 * on it — the filter, the archived toggle, Back — are a sheet, a line of text
 * and the nav island, because that is all the room there is.
 *
 * On desktop the list is a column and a rail beside it carries what the phone
 * has to hide: where the project stands by state, what it is made of by kind,
 * the filter *open* rather than behind a funnel, and the rename/move/delete the
 * phone reaches through the shelf. The heading grows the tile's own mark so the
 * page is recognisably this project rather than a list of sentences.
 */
export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const project = useProjectScreen(id);
  const router = useRouter();
  const openFilter = useCellarSheets((state) => state.filter);
  const openEditProject = useCellarSheets((state) => state.editProject);
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const isDesktop = useIsDesktop();

  if (project.error) return <ErrorState message={readError(project.error)} onRetry={project.refetch} />;
  if (project.loading) return <LoadingState label="opening the project" />;

  const list = (
    <EntryList
      items={project.items}
      showCode={project.showCodes}
      onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
      header={isDesktop ? undefined : <PhoneHeader project={project} gutter={gutter} onFilter={() => openFilter?.()} />}
      empty={
        project.emptyKind === 'filtered'
          ? {
              title: 'nothing matches',
              body: 'loosen a kind or clear the state to see the rest of this project.',
              action: isDesktop ? undefined : { label: 'open the filter', onPress: () => openFilter?.() },
            }
          : {
              title: 'nothing in here yet',
              body: isDesktop
                ? 'press n and pick this project on the capture screen.'
                : 'tap + in the nav bar and pick this project on the capture screen.',
            }
      }
    />
  );

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1" style={{ marginLeft: sidebar }}>
        <ContentShell maxWidth={MAX_W.grid} fill>
          {isDesktop ? (
            <View className="flex-1">
              <ScreenTop />
              {/* Back sits above the title, where a browser user looks for it,
                  rather than in the sidebar a screen-width away. */}
              <View className={`flex-row pb-3 ${gutter}`}>
                <ScreenAction />
              </View>
              <View className={`pb-5 ${gutter}`}>
                <ProjectHeader
                  name={project.name}
                  meta={project.meta}
                  initials={project.initials}
                  view={project.view}
                  onView={project.setView}
                  filtered={project.filtered}
                  large
                />
                {project.repo && (
                  <RepoLink label={project.repo.label} url={project.repo.url} path={project.repo.path} />
                )}
              </View>

              <View className="flex-1 flex-row">
                <View className="min-w-0 flex-1">{list}</View>
                <View className={`w-[300px] border-l border-border/60 pl-6 pr-8 pt-1`}>
                  <ProjectAside
                    stateCounts={project.stateCounts}
                    kindBars={project.kindBars}
                    archivedCount={project.archivedCount}
                    showArchived={project.showArchived}
                    onToggleArchived={project.toggleArchived}
                    onEdit={() => project.project && openEditProject?.(project.project.id)}
                  />
                </View>
              </View>
            </View>
          ) : (
            list
          )}
        </ContentShell>
      </View>

      {/* Pushed out of the tabs, so the navigator's own chrome is gone — the
          screen mounts it itself, which is also where the phone build's left
          island turns into Back (components/layout/navActions). */}
      <AppChrome />
    </View>
  );
}

/** The phone's list header: heading, the two readings, the funnel, archived. */
function PhoneHeader({
  project,
  gutter,
  onFilter,
}: {
  project: ReturnType<typeof useProjectScreen>;
  gutter: string;
  onFilter: () => void;
}) {
  return (
    <View>
      <ScreenTop />
      <View className={`pb-2 ${gutter}`}>
        <ProjectHeader
          name={project.name}
          meta={project.meta}
          initials={project.initials}
          view={project.view}
          onView={project.setView}
          filtered={project.filtered}
          onFilter={onFilter}
        />
        {project.repo && <RepoLink label={project.repo.label} url={project.repo.url} path={project.repo.path} />}
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
  );
}

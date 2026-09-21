import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { EntryList, type EntryListItem } from '@/components/cellar/EntryList';
import { ProjectAside } from '@/components/cellar/ProjectAside';
import { ProjectHeader } from '@/components/cellar/ProjectHeader';
import { RepoLink } from '@/components/cellar/RepoLink';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useCopyPrompt } from '@/features/cellar/useCopyPrompt';
import { useProjectScreen } from '@/features/cellar/useProjectScreen';
import { MAX_W, useGutter, useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';
import { useWheelToList } from '@/hooks/useWheelToList';
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
  const copyPrompt = useCopyPrompt();
  const router = useRouter();
  const openFilter = useCellarSheets((state) => state.filter);
  const openEditProject = useCellarSheets((state) => state.editProject);
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const isDesktop = useIsDesktop();
  // The list is a column with a rail beside it and a lot of page around both,
  // and a wheel only moves what it is over. This hands the whole page's wheel
  // to the list, except over something that scrolls itself (hooks/useWheelToList).
  const { listRef, attachPage } = useWheelToList<EntryListItem>();

  if (project.error) return <ErrorState message={readError(project.error)} onRetry={project.refetch} />;
  if (project.loading) return <LoadingState label="opening the project" />;

  const list = (
    <EntryList
      listRef={listRef}
      items={project.items}
      showCode={project.showCodes}
      onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
      onCopy={copyPrompt}
      header={isDesktop ? undefined : <PhoneHeader project={project} gutter={gutter} onFilter={() => openFilter?.()} />}
      empty={emptyFor(project, isDesktop, () => openFilter?.())}
    />
  );

  return (
    <View className="flex-1 bg-background" ref={attachPage}>
      <View className="flex-1" style={{ marginLeft: sidebar }}>
        <ContentShell maxWidth={MAX_W.grid} fill>
          {isDesktop ? (
            <View className="flex-1">
              <ScreenTop />
              <View className={`pb-5 ${gutter}`}>
                {/* Back rides the heading rather than a row of its own above
                    it: on a window this wide that row was a pill adrift in the
                    content column, a browser's own back sits level with the
                    page title, and beside the mark this one does too. The
                    header takes it as a slot rather than being wrapped in
                    another row, because where it goes also decides where the
                    counts go. */}
                <ProjectHeader
                  name={project.name}
                  meta={project.meta}
                  initials={project.initials}
                  view={project.view}
                  onView={project.setView}
                  filtered={project.filtered}
                  large
                  lead={<ScreenAction />}
                />
                {project.repo && (
                  <RepoLink label={project.repo.label} url={project.repo.url} path={project.repo.path} />
                )}
              </View>

              {/* The gap does the separating, the way the dump screen's aside
                  does it — a hairline edges a surface, and a rail of figures on
                  the page ground is not one (PING.md §6). The rule that used to
                  be here also landed 3px from the list's scrollbar gutter, so it
                  read as a stray line stuck to the scrollbar rather than as the
                  edge of a column. */}
              <View className="flex-1 flex-row gap-10">
                <View className="min-w-0 flex-1">{list}</View>
                <View className="w-[300px] pr-8 pt-1">
                  <ProjectAside
                    stateSpread={project.stateSpread}
                    kindBars={project.kindBars}
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
    </View>
  );
}

/**
 * Nothing matches, versus nothing here yet — two different empties, with two
 * different ways out (PING.md §9.9).
 */
function emptyFor(
  project: ReturnType<typeof useProjectScreen>,
  isDesktop: boolean,
  onFilter: () => void,
): { title: string; body: string; action?: { label: string; onPress: () => void } } {
  if (project.emptyKind === 'filtered') {
    return {
      title: 'nothing matches',
      body: 'loosen a kind or clear the state to see the rest of this project.',
      action: isDesktop ? undefined : { label: 'open the filter', onPress: onFilter },
    };
  }

  return {
    title: 'nothing in here yet',
    body: isDesktop
      ? 'press n and pick this project on the capture screen.'
      : 'tap + in the nav bar and pick this project on the capture screen.',
  };
}

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EntryList, type EntryListItem } from '@/components/cellar/EntryList';
import { KanbanBoard } from '@/components/cellar/KanbanBoard';
import { CopyPrompt } from '@/components/cellar/CopyPrompt';
import { ProjectAside } from '@/components/cellar/ProjectAside';
import { ProjectHeader } from '@/components/cellar/ProjectHeader';
import { ProjectViews } from '@/components/cellar/ProjectViews';
import { RepoLink } from '@/components/cellar/RepoLink';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useCopyPrompt, useCopyProjectPrompt } from '@/features/cellar/useCopyPrompt';
import { useProjectScreen } from '@/features/cellar/useProjectScreen';
import { MAX_W, useGutter, useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';
import { useWheelToList } from '@/hooks/useWheelToList';
import { readError } from '@/lib/utils';
import type { Project } from '@/types/cellar';
import { useCellarSheets } from '@/store/cellarPrefs';

/** Breathing room between the chrome column and the heading it stands beside. */
const CHROME_GAP = 24;

/**
 * One project, in whichever of the three readings you left it in.
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
  const copyProjectPrompt = useCopyProjectPrompt();
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
  // Measured rather than assumed: back's pill is as wide as the word on it and
  // the toggle grows a segment on a narrower window, so a constant here would
  // be wrong the first time either changes.
  const [chrome, setChrome] = useState(0);

  if (project.error) return <ErrorState message={readError(project.error)} onRetry={project.refetch} />;
  if (project.loading) return <LoadingState label="opening the project" />;

  const list = (
    <EntryList
      listRef={listRef}
      items={project.items}
      showCode={project.showCodes}
      collapsed={project.collapsed}
      onToggleSection={project.toggleSection}
      onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
      onCopy={copyPrompt}
      header={
        isDesktop ? undefined : (
          <PhoneHeader
            project={project}
            gutter={gutter}
            onFilter={() => openFilter?.()}
            onCopyProject={copyProjectPrompt}
          />
        )
      }
      empty={emptyFor(project, isDesktop, () => openFilter?.())}
    />
  );

  // The board carries no list header, so on a phone the heading the list was
  // drawing has to be drawn above it instead.
  const board = (
    <View className="flex-1">
      {!isDesktop && (
        <PhoneHeader
          project={project}
          gutter={gutter}
          onFilter={() => openFilter?.()}
          onCopyProject={copyProjectPrompt}
        />
      )}
      <KanbanBoard
        columns={project.columns}
        showCode={project.showCodes}
        onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
        onCopy={copyPrompt}
      />
    </View>
  );

  const reading = project.view === 'kanban' ? board : list;

  return (
    <View className="flex-1 bg-background" ref={attachPage}>
      <View className="flex-1" style={{ marginLeft: sidebar }}>
        <ContentShell maxWidth={MAX_W.grid} fill>
          {isDesktop ? (
            <View className="flex-1">
              <ScreenTop />
              <View className={`pb-5 ${gutter}`}>
                {/* Back and the view toggle stack at the left, out of flow on
                    purpose: they are chrome, and chrome should not decide how
                    tall a heading is. Left in the row they made it the height
                    of a pill plus a segmented control, which is taller than
                    the project block it was supposed to be framing.
                    The measured padding is what keeps the name — and the repo
                    line under it — clear of the column rather than a constant
                    that goes stale the first time either control changes. */}
                <View style={{ paddingLeft: chrome ? chrome + CHROME_GAP : 0 }}>
                  <View
                    className="absolute left-0 top-0 items-start gap-1.5"
                    onLayout={(event) => setChrome(event.nativeEvent.layout.width)}
                  >
                    <ScreenAction />
                    <ProjectViews
                      view={project.view}
                      onView={project.setView}
                      axis={project.kanbanAxis}
                      onAxis={project.setKanbanAxis}
                      filtered={project.filtered}
                    />
                  </View>
                  <View className="flex-row justify-end">
                    <ProjectHeader
                      name={project.name}
                      meta={project.meta}
                      initials={project.initials}
                      large
                    />
                  </View>
                  {project.repo && (
                    <RepoLink
                      label={project.repo.label}
                      url={project.repo.url}
                      path={project.repo.path}
                      align="end"
                    />
                  )}
                  {!!project.project && (
                    <View className="mt-1.5">
                      <CopyPrompt
                        onPress={() => project.project && copyProjectPrompt(project.project)}
                        what="this project"
                        align="end"
                      />
                    </View>
                  )}
                </View>
              </View>

              {/* The gap does the separating, the way the dump screen's aside
                  does it — a hairline edges a surface, and a rail of figures on
                  the page ground is not one (PING.md §6). The rule that used to
                  be here also landed 3px from the list's scrollbar gutter, so it
                  read as a stray line stuck to the scrollbar rather than as the
                  edge of a column. */}
              <View className="flex-1 flex-row gap-10">
                <View className="min-w-0 flex-1">{reading}</View>
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
            reading
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

/** The phone's list header: heading, the three readings, the funnel, archived. */
function PhoneHeader({
  project,
  gutter,
  onFilter,
  onCopyProject,
}: {
  project: ReturnType<typeof useProjectScreen>;
  gutter: string;
  onFilter: () => void;
  onCopyProject: (project: Project) => void;
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
          axis={project.kanbanAxis}
          onAxis={project.setKanbanAxis}
          filtered={project.filtered}
          onFilter={onFilter}
        />
        {project.repo && <RepoLink label={project.repo.label} url={project.repo.url} path={project.repo.path} />}
        {!!project.project && (
          <View className="mt-1.5">
            <CopyPrompt onPress={() => project.project && onCopyProject(project.project)} what="this project" />
          </View>
        )}
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

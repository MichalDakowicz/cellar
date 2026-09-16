import { useRouter } from 'expo-router';
import { ChevronDown, Search } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ProjectGrid } from '@/components/cellar/ProjectGrid';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useShelfScreen } from '@/features/cellar/useShelfScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';
import { readError } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * The shelf: the projects on the shelf you are standing in front of.
 *
 * The shelf name is the heading *and* the switch, because the layer above
 * projects is the thing this app has that a notes app does not, and burying it
 * in settings would be burying the point. New project is the left island.
 */
export default function ShelfScreen() {
  const shelf = useShelfScreen();
  const router = useRouter();
  const openShelfPicker = useCellarSheets((state) => state.shelfPicker);
  const openNewProject = useCellarSheets((state) => state.newProject);
  const openEditProject = useCellarSheets((state) => state.editProject);
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const isDesktop = useIsDesktop();

  if (shelf.error) return <ErrorState message={readError(shelf.error)} onRetry={shelf.refetch} />;

  return (
    <ScrollView
      className="flex-1 bg-background"
      style={{ marginLeft: sidebar }}
      // `flexGrow` rather than a height: the content still grows past the
      // viewport once there is a grid, but a shelf with nothing on it fills it
      // instead of collapsing to the height of two lines of text.
      contentContainerStyle={{ paddingBottom: navBarSpace + 8, flexGrow: 1 }}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.grid} fill>
        <View className={`flex-1 ${gutter}`}>
          <View className="flex-row items-baseline justify-between gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="switch shelf"
              onPress={() => openShelfPicker?.()}
              className="min-w-0 flex-row items-center gap-2 active:opacity-80"
            >
              <Text className="text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
                {shelf.shelfName}
              </Text>
              <ChevronDown size={18} color={COLORS.muted} strokeWidth={2.2} />
            </Pressable>
            <View className="flex-row items-center gap-3">
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {shelf.meta}
              </Text>
              <ScreenAction />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="search every entry"
            onPress={() => router.navigate('/search')}
            className="mt-3.5 h-[42px] flex-row items-center gap-2.5 rounded-lg bg-secondary px-3.5 active:opacity-80"
          >
            <Search size={16} color={COLORS.muted} strokeWidth={2} />
            <Text className="text-sm text-muted-foreground">search every entry</Text>
          </Pressable>

          {/*
            Only the empty state takes the leftover height and centres in it. A
            grid that did the same would float its first row down the page the
            moment a shelf held two projects, which is a different bug.
          */}
          <View className={shelf.isEmpty ? 'mt-4 flex-1 justify-center' : 'mt-4'}>
            {shelf.loading ? (
              <LoadingState label="opening the cellar" />
            ) : shelf.tiles.length === 0 ? (
              <EmptyState
                title="no projects on this shelf"
                body={
                  isDesktop
                    ? 'use new project in the sidebar to start one, or switch shelves at the top of it.'
                    : 'tap the folder on the left of the nav bar to start one, or tap the shelf name to switch shelves.'
                }
                action={{ label: 'new project', onPress: () => openNewProject?.(null) }}
              />
            ) : (
              <ProjectGrid
                projects={shelf.tiles}
                onPress={(id) => router.navigate(`/project/${id}`)}
                onEdit={(id) => openEditProject?.(id)}
              />
            )}
          </View>
        </View>
      </ContentShell>
    </ScrollView>
  );
}

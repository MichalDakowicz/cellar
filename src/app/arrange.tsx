import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

import { ContentShell } from '@/components/layout/ContentShell';
import { AppChrome } from '@/components/layout/AppChrome';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { SortableList } from '@/components/ui/SortableList';
import { EmptyState } from '@/components/ui/states';
import { useArrangeScreen, type ArrangeWhat } from '@/features/cellar/useArrangeScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';

const WHATS: ArrangeWhat[] = ['shelves', 'projects', 'entries'];

/**
 * Putting a list in your own order: every shelf, the projects on one shelf,
 * or the thoughts in one project. Its own screen rather than a sheet, because
 * a drag needs the whole height and a sheet's scroll view fights the finger.
 */
export default function ArrangeScreen() {
  const params = useLocalSearchParams<{ what?: string; id?: string }>();
  const what = WHATS.includes(params.what as ArrangeWhat) ? (params.what as ArrangeWhat) : 'shelves';
  const arrange = useArrangeScreen(what, params.id);
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1" style={{ marginLeft: sidebar, paddingBottom: navBarSpace }}>
        <ContentShell maxWidth={MAX_W.text} fill>
          <ScreenTop />
          <View className={`pb-3 ${gutter}`}>
            <View className="flex-row items-center gap-3">
              <ScreenAction />
              <Text className="min-w-0 flex-1 text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
                {arrange.title}
              </Text>
            </View>
            <Text className="mt-2 text-xs text-muted-foreground">{arrange.hint}</Text>
            {!!arrange.error && <Text className="mt-2 text-xs text-destructive">{arrange.error}</Text>}
          </View>
          {arrange.empty ? (
            <EmptyState title="nothing to arrange" body="there is nothing in this list yet." />
          ) : (
            <View className={`flex-1 ${gutter}`}>
              <SortableList items={arrange.items} onMove={arrange.move} />
            </View>
          )}
        </ContentShell>
      </View>
      <AppChrome />
    </View>
  );
}

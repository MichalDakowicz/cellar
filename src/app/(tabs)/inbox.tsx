import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { EntryList } from '@/components/cellar/EntryList';
import { SelectionBar } from '@/components/cellar/SelectionBar';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useCopyPrompt } from '@/features/cellar/useCopyPrompt';
import { useEntrySelection } from '@/features/cellar/useEntrySelection';
import { useInboxScreen } from '@/features/cellar/useInboxScreen';
import { MAX_W, useGutter, useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';
import { readError } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';

/**
 * Everything dumped without picking a project.
 *
 * The left island sorts it and never filters it — the badge on this tab is the
 * count of what is actually left, and a list that hides rows while the badge
 * still says fourteen is how a user stops trusting the number.
 */
export default function InboxScreen() {
  const inbox = useInboxScreen();
  const copyPrompt = useCopyPrompt();
  const router = useRouter();
  const fileUnder = useCellarSheets((state) => state.fileUnder);
  const selection = useEntrySelection(inbox.onScreen, (entry) => router.navigate(`/entry/${entry.id}`));
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const isDesktop = useIsDesktop();

  if (inbox.error) return <ErrorState message={readError(inbox.error)} onRetry={inbox.refetch} />;
  if (inbox.loading) return <LoadingState label="opening the inbox" />;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1" style={{ marginLeft: sidebar }}>
        <ContentShell maxWidth={MAX_W.detail} fill>
          <EntryList
            items={inbox.items}
            variant="inbox"
            showCode={inbox.showCodes}
            whereFor={inbox.whereFor}
            onPress={selection.onPress}
            onLongPress={selection.onLongPress}
            selectedIds={selection.selectedIds}
            onFile={selection.selecting ? undefined : (entry) => fileUnder?.(entry.id)}
            onCopy={selection.selecting ? undefined : copyPrompt}
            header={
              <View>
                <ScreenTop />
                <View className={`pb-4 ${gutter}`}>
                  <View className="flex-row items-center justify-between gap-3">
                    <Text className="text-2xl font-bold tracking-tight text-foreground">inbox</Text>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-xs text-muted-foreground">{inbox.meta}</Text>
                      <ScreenAction />
                    </View>
                  </View>
                  <Text className="mt-2 text-sm text-muted-foreground">
                    everything you dumped without picking a project, and anything an agent stopped to ask you about
                    — {inbox.sortLabel}.
                  </Text>
                </View>
              </View>
            }
            empty={{
              title: 'inbox clear',
              body: isDesktop
              ? 'every thought has a project. press n when the next one lands.'
              : 'every thought has a project. tap + in the nav bar when the next one lands.',
            }}
          />
        </ContentShell>
      </View>
      <SelectionBar
        count={selection.count}
        onFile={selection.file}
        onCopy={selection.copy}
        onClear={selection.clear}
      />
    </View>
  );
}

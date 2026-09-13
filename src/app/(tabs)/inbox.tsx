import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { EntryList } from '@/components/cellar/EntryList';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ErrorState, LoadingState } from '@/components/ui/states';
import { useInboxScreen } from '@/features/cellar/useInboxScreen';
import { MAX_W, useGutter } from '@/hooks/useResponsive';
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
  const router = useRouter();
  const fileUnder = useCellarSheets((state) => state.fileUnder);
  const gutter = useGutter();

  if (inbox.error) return <ErrorState message={readError(inbox.error)} onRetry={inbox.refetch} />;
  if (inbox.loading) return <LoadingState label="opening the inbox" />;

  return (
    <View className="flex-1 bg-background">
      <ContentShell maxWidth={MAX_W.text} fill>
        <EntryList
          items={inbox.items}
          variant="inbox"
          showCode={inbox.showCodes}
          onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
          onFile={(entry) => fileUnder?.(entry.id)}
          header={
            <View>
              <ScreenTop />
              <View className={`pb-4 ${gutter}`}>
                <View className="flex-row items-baseline justify-between gap-3">
                  <Text className="text-2xl font-bold tracking-tight text-foreground">inbox</Text>
                  <Text className="text-xs text-muted-foreground">{inbox.meta}</Text>
                </View>
                <Text className="mt-2 text-sm text-muted-foreground">
                  everything you dumped without picking a project. file it or leave it — {inbox.sortLabel}.
                </Text>
              </View>
            </View>
          }
          empty={{
            title: 'inbox clear',
            body: 'every thought has a project. tap + in the nav bar when the next one lands.',
          }}
        />
      </ContentShell>
    </View>
  );
}

import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { KindGlyph } from '@/components/media/Glyphs';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline } from '@/components/ui/controls';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useStatsScreen } from '@/features/cellar/useStatsScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { readError } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';

/**
 * What you dump, and where.
 *
 * Three figures, the seven kinds as bars, and the projects you cannot stop
 * thinking about. The scope — one shelf, or every shelf — is the left island's
 * action, and it is named on the page too so the figures are never ambiguous
 * about what they are counting.
 */
export default function StatsScreen() {
  const stats = useStatsScreen();
  const router = useRouter();
  const openScope = useCellarSheets((state) => state.statsScope);
  const navBarSpace = useNavBarSpace();

  if (stats.error) return <ErrorState message={readError(stats.error)} onRetry={stats.refetch} />;
  if (stats.loading) return <LoadingState label="counting the cellar" />;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: navBarSpace + 8 }}>
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.detail}>
        <View className="px-4">
          <Text className="text-2xl font-bold tracking-tight text-foreground">what you dump</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="narrow to a shelf"
            onPress={() => openScope?.()}
            className="mt-2 self-start rounded-full bg-secondary px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-xs font-semibold text-foreground">{stats.scopeName}</Text>
          </Pressable>
        </View>

        {stats.isEmpty ? (
          <EmptyState
            title="nothing on this shelf yet"
            body="dump a thought or two, or tap the layers on the left of the nav bar to count a different shelf."
          />
        ) : (
          <>
            <View className="my-6 flex-row border-y border-border/50 px-4 py-7">
              <Figure label="total" value={stats.total} />
              <Figure label="open" value={stats.open} />
              <Figure label="projects" value={stats.projectCount} />
            </View>

            <View className="border-y border-border/50 px-4 py-4">
              <Overline>by kind</Overline>
              <View className="mt-3.5 gap-3">
                {stats.kindBars.map((bar) => (
                  <View key={bar.kind}>
                    <View className="flex-row items-center justify-between gap-2.5">
                      <View className="flex-row items-center gap-2">
                        <KindGlyph kind={bar.kind} size={13} />
                        <Text className="text-sm font-semibold text-foreground">{bar.kind}</Text>
                      </View>
                      <Text className="text-xs text-muted-foreground">{bar.count}</Text>
                    </View>
                    <View className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <View className="h-full rounded-full bg-primary" style={{ width: `${bar.pct}%` }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View className="px-4 py-4">
              <Overline>busiest projects</Overline>
              <View className="mt-2">
                {stats.busiest.map((project) => (
                  <Pressable
                    key={project.id}
                    accessibilityRole="button"
                    accessibilityLabel={project.name}
                    onPress={() => router.navigate(`/project/${project.id}`)}
                    className="flex-row items-baseline gap-2.5 rounded-lg px-2 py-2.5 active:opacity-80"
                  >
                    <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground">{project.meta}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>
        )}
      </ContentShell>
    </ScrollView>
  );
}

/** No card chrome — the block's own hairline rules frame all three (PING.md §6). */
function Figure({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1">
      <Text className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</Text>
      <Text className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</Text>
    </View>
  );
}

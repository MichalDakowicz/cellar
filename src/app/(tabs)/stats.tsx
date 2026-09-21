import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { StateSpread } from '@/components/cellar/StateSpread';
import { KindGlyph } from '@/components/media/Glyphs';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline } from '@/components/ui/controls';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import { useStatsScreen } from '@/features/cellar/useStatsScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useHover, webTransition, useSidebarSpace } from '@/hooks/useResponsive';
import { kindTallyLabel } from '@/lib/kinds';
import { readError } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * What you dump, and where.
 *
 * Three figures, the seven kinds as bars, and the projects you cannot stop
 * thinking about. The scope — one shelf, or every shelf — is the left island's
 * action, and it is named opposite the heading so the figures are never
 * ambiguous about what they are counting.
 */
export default function StatsScreen() {
  const stats = useStatsScreen();
  const router = useRouter();
  const openScope = useCellarSheets((state) => state.statsScope);
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();

  if (stats.error) return <ErrorState message={readError(stats.error)} onRetry={stats.refetch} />;
  if (stats.loading) return <LoadingState label="counting the cellar" />;

  return (
    <ScrollView
      className="flex-1 bg-background"
      style={{ marginLeft: sidebar }}
      contentContainerStyle={{ paddingBottom: navBarSpace + 8 }}
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.detail}>
        <View className={gutter}>
          {/* The scope sits opposite the heading, not under it: it is what the
              figures are counting, and hung off the title it read as a
              subtitle of the page instead of a control (shelf does the same
              with its meta). */}
          <View className="flex-row items-center justify-between gap-3">
            <Text className="min-w-0 shrink text-2xl font-bold tracking-tight text-foreground" numberOfLines={1}>
              what you dump
            </Text>
            <View className="shrink-0 flex-row items-center gap-2.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="narrow to a shelf"
                onPress={() => openScope?.()}
                className="max-w-[180px] rounded-full bg-secondary px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                  {stats.scopeName}
                </Text>
              </Pressable>
              <ScreenAction />
            </View>
          </View>
        </View>

        {stats.isEmpty ? (
          <EmptyState
            title="nothing on this shelf yet"
            body="dump a thought or two, or tap the layers on the left of the nav bar to count a different shelf."
          />
        ) : (
          <>
            <View className={`my-6 flex-row border-y border-border/50 py-7 ${gutter}`}>
              <Figure label="total" value={stats.total} />
              <Figure label="open" value={stats.open} />
              <Figure label="projects" value={stats.projectCount} />
            </View>

            <View className={`pb-5 ${gutter}`}>
              <Overline>where it stands</Overline>
              <View className="mt-3.5">
                <StateSpread rows={stats.stateSpread} />
              </View>
            </View>

            <View className={`border-y border-border/50 py-4 ${gutter}`}>
              <Overline>by kind</Overline>
              <View className="mt-3.5 gap-3">
                {stats.kindBars.map((bar) => (
                  <View key={bar.kind}>
                    <View className="flex-row items-center justify-between gap-2.5">
                      <View className="flex-row items-center gap-2">
                        <KindGlyph kind={bar.kind} size={13} />
                        <Text className="text-sm font-semibold text-foreground">{kindTallyLabel(bar.kind)}</Text>
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

            <View className={`py-4 ${gutter}`}>
              <Overline>busiest projects</Overline>
              <View className="mt-2">
                {stats.busiest.map((project) => (
                  <BusiestRow
                    key={project.id}
                    name={project.name}
                    meta={project.meta}
                    onPress={() => router.navigate(`/project/${project.id}`)}
                  />
                ))}
              </View>
            </View>
          </>
        )}
      </ContentShell>
    </ScrollView>
  );
}

/** Its own component so the row can hold the hover state a mouse expects. */
function BusiestRow({ name, meta, onPress }: { name: string; meta: string; onPress: () => void }) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      {...bind}
      style={[webTransition('background-color'), hovered ? { backgroundColor: COLORS.rowHover } : null]}
      className="flex-row items-baseline gap-2.5 rounded-lg px-2 py-2.5 active:opacity-80"
    >
      <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={1}>
        {name}
      </Text>
      <Text className="text-xs text-muted-foreground">{meta}</Text>
    </Pressable>
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

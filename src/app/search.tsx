import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { EntryList, type EntryListItem } from '@/components/cellar/EntryList';
import { ContentShell } from '@/components/layout/ContentShell';
import { AppChrome } from '@/components/layout/AppChrome';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ANDROID_METRICS } from '@/components/ui/controls';
import { useCellar } from '@/features/cellar/useCellar';
import { useCopyPrompt } from '@/features/cellar/useCopyPrompt';
import { MAX_W, useGutter, webFocusRing, useSidebarSpace } from '@/hooks/useResponsive';
import { searchEntries } from '@/lib/entryGroups';
import { plural } from '@/lib/utils';
import { COLORS } from '@/theme/colors';

/**
 * Search across every project, every shelf and the inbox — archived entries
 * included.
 *
 * That last part is the whole reason archive is safe to use: taking something
 * out of a list must not take it out of reach, or archive is just a slower
 * delete and nobody uses it.
 */
export default function SearchScreen() {
  const { entries, projects } = useCellar();
  const router = useRouter();
  const copyPrompt = useCopyPrompt();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const gutter = useGutter();
  const sidebar = useSidebarSpace();

  const hits = useMemo(() => searchEntries(entries, query), [entries, query]);

  const items = useMemo<EntryListItem[]>(() => {
    const byProject = new Map<string, typeof hits>();
    for (const entry of hits) {
      const key = entry.projectId ?? 'inbox';
      byProject.set(key, [...(byProject.get(key) ?? []), entry]);
    }
    return [...byProject.entries()].flatMap(([key, group]) => [
      {
        type: 'section' as const,
        section: {
          key,
          label: projects.find((project) => project.id === key)?.name ?? 'inbox',
          meta: String(group.length),
        },
      },
      ...group.map((entry) => ({ type: 'entry' as const, entry })),
    ]);
  }, [hits, projects]);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1" style={{ marginLeft: sidebar }}>
        <ContentShell maxWidth={MAX_W.detail} fill>
          <EntryList
            items={items}
            variant="hit"
            onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
            onCopy={copyPrompt}
            header={
              <View>
                <ScreenTop />
                <View className={`pb-2 ${gutter}`}>
                  {/* The field is this screen's heading, so back rides its row. */}
                  <View className="flex-row items-center gap-3">
                    <ScreenAction />
                    <TextInput
                      className="h-[42px] min-w-0 flex-1 rounded-lg bg-secondary px-3.5 text-foreground"
                      style={[{ fontSize: 16, lineHeight: undefined }, ANDROID_METRICS, webFocusRing(focused)]}
                      onFocus={() => setFocused(true)}
                      onBlur={() => setFocused(false)}
                      placeholder="search every entry"
                      placeholderTextColor={COLORS.muted}
                      value={query}
                      onChangeText={setQuery}
                      autoFocus
                      autoCorrect={false}
                      accessibilityLabel="search every entry"
                    />
                  </View>
                  <Text className="mt-3 text-xs text-muted-foreground">
                    {query.trim()
                      ? `${plural(hits.length, 'match', 'matches')} · archived included`
                      : 'type to search across every shelf and the inbox'}
                  </Text>
                </View>
              </View>
            }
            empty={
              query.trim()
                ? { title: 'nothing matches', body: 'try a shorter word — search looks at the entry and every line under it.' }
                : undefined
            }
          />
        </ContentShell>
      </View>

      {/* Pushed out of the tabs, so the navigator's own chrome is gone — the
          screen mounts it itself, which is also where the phone build's left
          island turns into Back (components/layout/navActions). */}
      <AppChrome />
    </View>
  );
}

import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { SwipeShelf } from '@/components/cellar/SwipeShelf';
import { DumpAside } from '@/components/cellar/DumpAside';
import { EntryCard } from '@/components/cellar/EntryCard';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ANDROID_METRICS, Overline } from '@/components/ui/controls';
import { ErrorState } from '@/components/ui/states';
import { useDumpScreen } from '@/features/cellar/useDumpScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useIsDesktop, webFocusRing, useSidebarSpace } from '@/hooks/useResponsive';
import { readError } from '@/lib/utils';
import { useCaptureFocus, useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * The capture screen, and the app's home route.
 *
 * One big field, return to drop, and the raw-dump toggle lives on the nav
 * island's left plate — the field itself stays a field. Nothing between you and
 * a thought you are about to lose.
 */
export default function DumpScreen() {
  const dump = useDumpScreen();
  const router = useRouter();
  const openShelfPicker = useCellarSheets((state) => state.shelfPicker);
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const isDesktop = useIsDesktop();
  const field = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  // The web `n` shortcut navigates here and leaves a flag rather than calling a
  // focus handle, because on every other route this screen is not mounted yet
  // (store/cellarPrefs.ts).
  const focusPending = useCaptureFocus((state) => state.pending);
  const clearFocusRequest = useCaptureFocus((state) => state.clear);
  useEffect(() => {
    if (!focusPending) return;
    field.current?.focus();
    clearFocusRequest();
  }, [focusPending, clearFocusRequest]);

  if (dump.error) return <ErrorState message={readError(dump.error)} onRetry={dump.refetch} />;

  return (
    <ScrollView
      className="flex-1 bg-background"
      style={{ marginLeft: sidebar }}
      contentContainerStyle={{
        paddingBottom: navBarSpace + 8,
        // A capture screen is short, and on a desktop window that leaves the
        // field pinned to the top edge with two thirds of the screen empty
        // beneath it. Centred, the one thing this screen is for sits at eye
        // height and next to the nav islands. It grows downward past the
        // viewport exactly as it does on a phone.
        ...(isDesktop ? { flexGrow: 1, justifyContent: 'center' as const } : null),
      }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTop />
      {/* On desktop the field and the pile sit side by side: the window is wide
          enough to show what you have been catching while you catch the next
          one, and a phone never is. */}
      <ContentShell maxWidth={isDesktop ? MAX_W.detail : MAX_W.text}>
        <View className={isDesktop ? `flex-row items-start gap-10 ${gutter}` : undefined}>
        <View className={isDesktop ? 'min-w-0 flex-1' : gutter}>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-2xl font-bold tracking-tight text-foreground">dump</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {dump.todayLine}
              </Text>
              <ScreenAction />
            </View>
          </View>

          <TextInput
            ref={field}
            className="mt-3.5 rounded-xl bg-secondary p-4 text-foreground"
            style={[{ minHeight: 118, fontSize: 17, lineHeight: 25 }, ANDROID_METRICS, webFocusRing(focused)]}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={dump.placeholder}
            placeholderTextColor={COLORS.muted}
            multiline
            value={dump.text}
            onChangeText={dump.setText}
            // Web only, and gated rather than commented: RN's onKeyPress carries
            // no modifiers on native, so shift read as false and return dropped
            // the thought on a phone — which is a soft keyboard's only way to
            // reach the next line. There, return is a newline and the drop
            // button is the drop.
            onKeyPress={
              Platform.OS === 'web'
                ? ({ nativeEvent }) => {
                    const event = nativeEvent as unknown as {
                      key: string;
                      shiftKey?: boolean;
                      metaKey?: boolean;
                      ctrlKey?: boolean;
                    };
                    if (event.key !== 'Enter') return;
                    dump.onReturn({ shift: !!event.shiftKey, meta: !!(event.metaKey || event.ctrlKey) });
                  }
                : undefined
            }
            textAlignVertical="top"
            accessibilityLabel="what just hit you"
          />

          <View className="mt-2.5 flex-row items-center justify-between gap-3">
            <Text className="text-xs font-semibold text-muted-foreground">
              {dump.raw ? 'raw dump' : 'one thought'}
            </Text>
            <Text className="text-xs text-muted-foreground">{dump.hint}</Text>
          </View>

          {/* The whole block is the shelf control, not just the pill: with two
              or three shelves the picker is a sheet and a tap to move one place
              along a line you can already see, and the chips are the widest,
              closest thing to the thumb. Tapping the pill still opens the
              picker, which is what a cellar with eight shelves wants. */}
          <SwipeShelf enabled={dump.canSwipeShelf} onSwipe={dump.swipeShelf}>
            <View className="mb-2 mt-6 flex-row items-center justify-between gap-3">
              <Overline>file it</Overline>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="switch shelf"
                onPress={() => openShelfPicker?.()}
                className="flex-row items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-xs font-semibold text-foreground">{dump.shelfName}</Text>
                <ChevronDown size={12} color={COLORS.muted} strokeWidth={2.4} />
              </Pressable>
            </View>
            <ChipWrap
              label="project"
              options={dump.projectOptions}
              selected={dump.projectId ?? ''}
              onToggle={(value) => dump.setProject(value === '' ? null : value)}
            />
          </SwipeShelf>

          <View className="mb-2 mt-5">
            <Overline>kind</Overline>
          </View>
          <ChipWrap label="kind" options={kindChips(dump.kind)} selected={dump.kind} onToggle={dump.setKind} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dump.dropLabel}
            accessibilityState={{ disabled: !dump.canDrop }}
            disabled={!dump.canDrop}
            onPress={dump.submit}
            className="mt-6 items-center rounded-full bg-primary py-3.5"
            style={{ opacity: dump.canDrop ? 1 : 0.4 }}
          >
            <Text className="text-sm font-bold text-primary-foreground">{dump.dropLabel}</Text>
          </Pressable>
          <Text className="mt-2 text-center text-xs text-muted-foreground">{dump.keyHint}</Text>
        </View>

        {isDesktop && (
          <View style={{ width: 340 }}>
            <DumpAside
              entries={dump.recent}
              showCode={dump.showCodes}
              onPress={(entry) => router.navigate(`/entry/${entry.id}`)}
            />
          </View>
        )}
        </View>

        {/* The phone's half of the desktop column. Same list, fewer rows: what
            you have been catching, not a receipt for this sitting — a band that
            is empty until you type is empty exactly when you want to know
            whether you already dumped this. */}
        {!isDesktop && dump.latest.length > 0 && (
          <View className={`mt-7 border-y border-border/50 py-4 ${gutter}`}>
            <Overline>lately</Overline>
            <View className="mt-1.5">
              {dump.latest.map((entry) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  showCode={dump.showCodes}
                  onPress={() => router.navigate(`/entry/${entry.id}`)}
                />
              ))}
            </View>
          </View>
        )}
      </ContentShell>
    </ScrollView>
  );
}

import { useRouter } from 'expo-router';
import { ChevronDown } from 'lucide-react-native';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { EntryCard } from '@/components/cellar/EntryCard';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { ANDROID_METRICS, Overline } from '@/components/ui/controls';
import { ErrorState } from '@/components/ui/states';
import { useDumpScreen } from '@/features/cellar/useDumpScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W } from '@/hooks/useResponsive';
import { readError } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';
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

  if (dump.error) return <ErrorState message={readError(dump.error)} onRetry={dump.refetch} />;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: navBarSpace + 8 }}
      keyboardShouldPersistTaps="handled"
    >
      <ScreenTop />
      <ContentShell maxWidth={MAX_W.text}>
        <View className="px-4">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="text-2xl font-bold tracking-tight text-foreground">dump</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              {dump.todayLine}
            </Text>
          </View>

          <TextInput
            className="mt-3.5 rounded-xl bg-secondary p-4 text-foreground"
            style={[{ minHeight: 118, fontSize: 17, lineHeight: 25 }, ANDROID_METRICS]}
            placeholder={dump.placeholder}
            placeholderTextColor={COLORS.muted}
            multiline
            value={dump.text}
            onChangeText={dump.setText}
            onKeyPress={({ nativeEvent }) => {
              // Web only — RN's onKeyPress carries no modifiers on native, where
              // the keyboard's own return key is the whole interaction anyway.
              const event = nativeEvent as unknown as { key: string; shiftKey?: boolean; metaKey?: boolean; ctrlKey?: boolean };
              if (event.key !== 'Enter') return;
              dump.onReturn({ shift: !!event.shiftKey, meta: !!(event.metaKey || event.ctrlKey) });
            }}
            textAlignVertical="top"
            accessibilityLabel="what just hit you"
          />

          <View className="mt-2.5 flex-row items-center justify-between gap-3">
            <Text className="text-xs font-semibold text-muted-foreground">
              {dump.raw ? 'raw dump' : 'one thought'}
            </Text>
            <Text className="text-xs text-muted-foreground">{dump.hint}</Text>
          </View>

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

        {dump.justDropped.length > 0 && (
          <View className="mt-7 border-y border-border/50 px-4 py-4">
            <Overline>just dropped</Overline>
            <View className="mt-1.5">
              {dump.justDropped.map((entry) => (
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

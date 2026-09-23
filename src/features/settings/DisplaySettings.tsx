import { Pressable, Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { Overline, Segmented, SwitchRow } from '@/components/ui/controls';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { kindToFront, type ProjectSort, type RowDensity, type StartTab, type TextSize } from '@/lib/displayPrefs';

/**
 * How the cellar reads: the rows, a project's order, where the app opens and
 * which kinds come first. Its own block so the settings screen stays a list of
 * sections rather than growing a section's worth of rows for every one of them.
 */
export function DisplaySettings({ gutter }: { gutter: string }) {
  const { settings, updateSettings } = useCellarSettings();
  const set = (patch: Parameters<typeof updateSettings>[0]) => void updateSettings(patch);

  return (
    <>
      <View className={`gap-3 pt-7 ${gutter}`}>
        <Overline>rows</Overline>
        <Segmented<RowDensity>
          label="row density"
          value={settings.rowDensity}
          onChange={(rowDensity) => set({ rowDensity })}
          options={[
            { value: 'roomy', label: 'roomy' },
            { value: 'compact', label: 'compact' },
          ]}
        />
        <Segmented<TextSize>
          label="text size"
          value={settings.textSize}
          onChange={(textSize) => set({ textSize })}
          options={[
            { value: 'small', label: 'small' },
            { value: 'normal', label: 'normal' },
            { value: 'large', label: 'large' },
          ]}
        />
        <SwitchRow
          label="haptics"
          sub="a tap under the thumb when a hold starts and when a thought lands"
          value={settings.haptics}
          onChange={(haptics) => set({ haptics })}
        />
      </View>

      <View className={`gap-3 pt-4 ${gutter}`}>
        <Overline>inside a project</Overline>
        <Segmented<ProjectSort>
          label="project order"
          value={settings.projectSort}
          onChange={(projectSort) => set({ projectSort })}
          options={[
            { value: 'newest', label: 'newest first' },
            { value: 'oldest', label: 'oldest first' },
          ]}
        />
        <SwitchRow
          label="fold done and dropped"
          sub="settled thoughts start folded under their heading, one tap from open"
          value={settings.hideSettled}
          onChange={(hideSettled) => set({ hideSettled })}
        />
      </View>

      <View className={`gap-3 pt-4 ${gutter}`}>
        <Overline>opens on</Overline>
        <Segmented<StartTab>
          label="opens on"
          value={settings.startTab}
          onChange={(startTab) => set({ startTab })}
          options={[
            { value: 'dump', label: 'dump' },
            { value: 'shelf', label: 'projects' },
            { value: 'inbox', label: 'inbox' },
            { value: 'stats', label: 'stats' },
          ]}
        />
      </View>

      <View className={`gap-2 pt-7 ${gutter}`}>
        <View className="flex-row items-center justify-between">
          <Overline>kind order</Overline>
          {settings.kindOrder && (
            <Pressable accessibilityRole="button" hitSlop={8} onPress={() => set({ kindOrder: null })}>
              <Text className="text-xs font-semibold text-muted-foreground">reset</Text>
            </Pressable>
          )}
        </View>
        <ChipWrap
          label="kind order"
          options={kindChips(null, settings.kindOrder)}
          selected={null}
          onToggle={(kind) => set({ kindOrder: kindToFront(settings.kindOrder, kind) })}
        />
        <Text className="text-xs text-muted-foreground">
          tap a kind to put it first. chips, groups, the board and stats all follow.
        </Text>
      </View>
    </>
  );
}

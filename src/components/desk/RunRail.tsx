import { Smartphone } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import { COLORS } from '@/theme/colors';
import { SamplePhoneMirror } from './SamplePhoneMirror';

/**
 * The desktop chat's right rail (`DeskChat.dc.html`): the attached phone, then
 * this run — its files, checkpoints and preview.
 */
export function RunRail({
  files,
  checkpoints,
  onPreview,
  empty,
}: {
  files: { path: string; added: number; removed: number }[];
  checkpoints: number;
  onPreview: (() => void) | null;
  /** Said when the run has nothing to show yet. */
  empty: string | null;
}) {
  return (
    <View className="w-[300px] gap-7 border-l border-border/50 px-4 pt-8">
      <View className="gap-2">
        <Overline>phone</Overline>
        {/* Drawn ahead of adb on the pc (docs/desk/TASKS.md W18). */}
        {files.length > 0 ? <SamplePhoneMirror width={150} /> : <View className="aspect-[9/16] w-[150px] items-center justify-center gap-2 self-center rounded-[22px] border border-border bg-card px-4">
          <Smartphone size={22} color={COLORS.muted} strokeWidth={2} />
          <Text className="font-sans text-center text-xs text-muted-foreground">a phone on usb shows here, live, once the pc can reach it over adb</Text>
        </View>}
      </View>

      <View className="gap-2">
        <Overline>this run</Overline>
        {empty && <Text className="font-sans text-xs text-muted-foreground">{empty}</Text>}
        {files.map((file) => (
          <View key={file.path} className="flex-row items-center gap-2">
            <Text className="min-w-0 flex-1 font-mono text-xs text-foreground" numberOfLines={1}>
              {file.path}
            </Text>
            <Text className="font-mono text-xs" style={{ color: COLORS.ok }}>
              +{file.added}
            </Text>
            <Text className="font-mono text-xs" style={{ color: COLORS.danger }}>
              −{file.removed}
            </Text>
          </View>
        ))}
        {!empty && (
          <View className="flex-row flex-wrap items-center gap-x-1.5">
            <Text className="font-sans text-xs text-muted-foreground">
              {checkpoints === 1 ? '1 checkpoint' : `${checkpoints} checkpoints`}
            </Text>
            {onPreview && (
              <>
                <Text className="font-sans text-xs text-muted-foreground">·</Text>
                <Pressable accessibilityRole="link" accessibilityLabel="open the preview" onPress={onPreview}>
                  <Text className="font-sans text-xs font-semibold text-primary">open the preview</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

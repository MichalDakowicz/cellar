import { Mic } from 'lucide-react-native';
import { Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import { COLORS } from '@/theme/colors';

/**
 * The top of the new-task screen (`NewTask.dc.html`): what you want, in your
 * words, under the mic.
 *
 * The mic is drawn and not yet live — speech arrives with docs/desk/TASKS.md
 * W12 — so it is shown quiet with a line saying so, and the field is the
 * working path. The field is the transcript either way: whatever was said
 * stays editable before it is sent. Colour codes in it reach the agent as
 * plain text.
 */
export function NewTaskVoice({ text, onText }: { text: string; onText: (text: string) => void }) {
  return (
    <View className="items-center gap-3.5 pb-2 pt-1">
      <View
        accessibilityRole="image"
        accessibilityLabel="speaking a task is coming — type it for now"
        className="h-[76px] w-[76px] items-center justify-center rounded-full bg-secondary"
      >
        <Mic size={28} color={COLORS.muted} strokeWidth={2} />
      </View>
      <Text className="text-xs text-muted-foreground">speaking it comes soon — type it for now</Text>
      <TextInput
        className="min-h-[96px] w-full rounded-xl bg-secondary px-4 py-3 text-base text-foreground"
        style={[{ textAlignVertical: 'top', lineHeight: undefined }, ANDROID_METRICS]}
        placeholder="what should it do?"
        placeholderTextColor={COLORS.muted}
        value={text}
        onChangeText={onText}
        multiline
        autoFocus
        accessibilityLabel="what the agent should do"
      />
    </View>
  );
}

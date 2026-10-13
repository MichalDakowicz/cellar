import { Keyboard, Mic, RotateCcw } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import { COLORS } from '@/theme/colors';

import { KeyList } from './KeyList';
import type { ComposerKeys } from './RunComposer';

/** The field is the sheet's whole point; a browser's focus ring around it is noise. */
const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineWidth: 0 } as const) : null;

/**
 * The top of the new-task sheet (`NewTask.dc.html`): the waveform, what you
 * said as the transcript — editable, centred, a colour code painted as it is
 * typed — and type instead · the mic · clear. Speech arrives with W12, so the
 * mic says so and typing is the working path; a key word opens its list.
 */
export function NewTaskVoice({ text, onText, keys }: { text: string; onText: (text: string) => void; keys: ComposerKeys }) {
  const field = useRef<TextInput>(null);

  return (
    <View className="items-center gap-3.5 pb-2 pt-1">
      <TextInput
        ref={field}
        className="font-sans max-h-[192px] min-h-[72px] w-full max-w-[330px] text-center text-base leading-6 text-foreground"
        style={[{ textAlignVertical: 'center', lineHeight: undefined }, ANDROID_METRICS, NO_OUTLINE]}
        placeholder="Describe a task…"
        placeholderTextColor={COLORS.muted}
        value={text}
        onChangeText={onText}
        onSelectionChange={({ nativeEvent }) => keys.onSelection(nativeEvent.selection.end)}
        multiline
        autoFocus
        accessibilityLabel="what the agent should do"
      />
      {keys.list && (
        <View className="w-full">
          <KeyList list={keys.list} />
        </View>
      )}
      <View className="flex-row items-center gap-5">
        <View
          accessibilityRole="image"
          accessibilityLabel="speaking a task comes soon — type it for now"
          className="h-12 w-12 items-center justify-center rounded-full border border-border"
        >
          <Mic size={20} color={COLORS.foreground} strokeWidth={2} />
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="type task" onPress={() => field.current?.focus()} className="h-[76px] w-[76px] items-center justify-center rounded-full bg-primary">
          <Keyboard size={28} color={COLORS.accentInk} strokeWidth={2} />
        </Pressable>
        <Round label="clear and start over" onPress={() => onText('')}>
          <RotateCcw size={20} color={COLORS.foreground} strokeWidth={2} />
        </Round>
      </View>
      <Text className="font-sans text-xs text-muted-foreground">keyboard · voice comes soon</Text>
    </View>
  );
}

function Round({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-full border border-border active:opacity-70"
    >
      {children}
    </Pressable>
  );
}

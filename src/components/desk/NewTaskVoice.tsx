import { Keyboard, Mic, RotateCcw } from 'lucide-react-native';
import { useRef, type ReactNode } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import { COLORS } from '@/theme/colors';

import { KeyList } from './KeyList';
import type { ComposerKeys } from './RunComposer';

/** The field is the sheet's whole point; a browser's focus ring around it is noise. */
const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineWidth: 0 } as const) : null;

// The waveform's resting shape (`NewTask.dc.html`); it moves once the mic listens (W12).
const BARS = [8, 14, 22, 12, 30, 18, 26, 34, 20, 10, 24, 32, 16, 28, 36, 22, 12, 26, 18, 30, 14, 24, 8, 20, 28, 16, 10, 22, 14, 8, 12, 6];

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
      <View accessibilityElementsHidden className="h-9 flex-row items-center gap-[3px]">
        {BARS.map((height, index) => (
          <View key={index} className="w-[3px] rounded-full bg-white/30" style={{ height }} />
        ))}
      </View>
      <TextInput
        ref={field}
        className="min-h-[72px] w-full max-w-[330px] text-center text-base text-foreground"
        style={[{ textAlignVertical: 'center', lineHeight: undefined }, ANDROID_METRICS, NO_OUTLINE]}
        placeholder="what should it do?"
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
        <Round label="type instead" onPress={() => field.current?.focus()}>
          <Keyboard size={20} color={COLORS.foreground} strokeWidth={2} />
        </Round>
        <View
          accessibilityRole="image"
          accessibilityLabel="speaking a task comes soon — type it for now"
          className="h-[76px] w-[76px] items-center justify-center rounded-full bg-primary"
        >
          <Mic size={28} color={COLORS.accentInk} strokeWidth={2} />
        </View>
        <Round label="clear and start over" onPress={() => onText('')}>
          <RotateCcw size={20} color={COLORS.foreground} strokeWidth={2} />
        </Round>
      </View>
      <Text className="text-xs text-muted-foreground">speaking it comes soon — type it for now</Text>
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

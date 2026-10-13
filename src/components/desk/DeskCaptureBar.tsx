import { Mic } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Text, TextInput, View } from 'react-native';

import { webFocusRing } from '@/hooks/useResponsive';
import { captureReturn } from '@/lib/deskHome';
import { COLORS } from '@/theme/colors';

/**
 * The desktop's one capture bar (`DeskHome.dc.html`): enter files the thought,
 * shift+enter hands it to an agent. The same keys as the phone work in it.
 */
export function DeskCaptureBar({
  text,
  onText,
  busy,
  onFile,
  onHandoff,
}: {
  text: string;
  onText: (text: string) => void;
  busy: boolean;
  onFile: () => void;
  onHandoff: () => void;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-2">
      <View
        className="min-h-[56px] flex-row items-center gap-2.5 rounded-full border bg-secondary pl-5 pr-2"
        style={[{ borderColor: focused ? COLORS.accent : 'transparent' }, webFocusRing(false)]}
      >
        <TextInput
          className="font-sans min-w-0 flex-1 py-3 text-base text-foreground"
          style={webFocusRing(false)}
          value={text}
          onChangeText={onText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!busy}
          placeholder="what just hit you? — @ a file, $ cellar or a command, / an agent skill"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel="dump a thought or hand off a task"
          onKeyPress={({ nativeEvent }) => {
            const event = nativeEvent as unknown as { key: string; shiftKey?: boolean; preventDefault?: () => void };
            if (event.key !== 'Enter') return;
            event.preventDefault?.();
            if (captureReturn({ shift: !!event.shiftKey }) === 'handoff') onHandoff();
            else onFile();
          }}
          onSubmitEditing={Platform.OS === 'web' ? undefined : onFile}
        />
        <Kbd>⏎ file it</Kbd>
        <Kbd>shift ⏎ hand it off</Kbd>
        <View
          accessibilityLabel="speaking comes soon"
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
        >
          <Mic size={18} color={COLORS.accentInk} strokeWidth={2} />
        </View>
      </View>
      <Text className="font-sans text-xs text-muted-foreground">
        same keys as the phone: <Text className="font-mono">@</Text> files, <Text className="font-mono">$</Text> cellar
        and its commands, <Text className="font-mono">/</Text> agent skills — and a hex code like{' '}
        <Text className="font-mono">#64748B</Text> paints itself
      </Text>
    </View>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <Text className="rounded border border-border px-1.5 font-mono text-[11px] leading-4 text-muted-foreground">
      {children}
    </Text>
  );
}

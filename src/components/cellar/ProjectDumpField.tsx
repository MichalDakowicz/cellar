import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';

import { ChipWrap, type ChipOption } from '@/components/cellar/ChipWrap';
import { ANDROID_METRICS } from '@/components/ui/controls';
import { webFocusRing } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';
import type { Kind } from '@/types/cellar';

type ProjectDumpFieldProps = {
  text: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  hint: string;
  kind: Kind;
  kindOptions: ChipOption<Kind>[];
  onKind: (kind: Kind) => void;
  dropLabel: string;
  canDrop: boolean;
  onDrop: () => void;
  /** Web only: return drops, so the field reports the modifiers it was pressed with. */
  onReturn: (modifiers: { shift: boolean; meta: boolean }) => void;
};

/**
 * One field at the top of a project, for the thought you have while you are
 * looking at it.
 *
 * It is a field until you want more: the kind row and the drop button show
 * once it has focus or words in it, so an idle project page is not a form. The
 * kind row is the whole of the options — where it files is the page you are on,
 * which is the point of having it here.
 */
export function ProjectDumpField({
  text,
  onChangeText,
  placeholder,
  hint,
  kind,
  kindOptions,
  onKind,
  dropLabel,
  canDrop,
  onDrop,
  onReturn,
}: ProjectDumpFieldProps) {
  const [focused, setFocused] = useState(false);
  const open = focused || text.length > 0;

  return (
    <View>
      <TextInput
        className="rounded-xl bg-secondary px-4 py-3 text-foreground"
        style={[{ minHeight: open ? 84 : 48, fontSize: 16, lineHeight: 23 }, ANDROID_METRICS, webFocusRing(focused)]}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        placeholderTextColor={COLORS.muted}
        multiline
        value={text}
        onChangeText={onChangeText}
        // Web only, for the reason the capture field gates it: native reports
        // no modifiers, and a soft keyboard's return has to be a newline.
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
                onReturn({ shift: !!event.shiftKey, meta: !!(event.metaKey || event.ctrlKey) });
              }
            : undefined
        }
        textAlignVertical="top"
        accessibilityLabel={placeholder}
      />

      {open && (
        <View className="mt-3">
          <ChipWrap label="kind" options={kindOptions} selected={kind} onToggle={onKind} />
          <Text className="mt-2.5 text-xs text-muted-foreground">{hint}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={dropLabel}
            accessibilityState={{ disabled: !canDrop }}
            disabled={!canDrop}
            onPress={onDrop}
            className="mt-3 items-center rounded-full bg-primary py-3"
            style={{ opacity: canDrop ? 1 : 0.4 }}
          >
            <Text className="text-sm font-bold text-primary-foreground">{dropLabel}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

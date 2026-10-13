import { useState } from 'react';
import { Platform, Pressable, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useHover, webFocusRing, webTransition } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * The small controls, in one file because they are one vocabulary: a chip, a
 * segment, a switch and a field. Everything that takes input in Cellar is one
 * of these four, so there is exactly one place where a focus ring or a press
 * state can drift.
 */

type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
};

/** A wrap-friendly toggle. Multi-select by convention; the caller owns the set. */
export function Chip({ label, selected, onPress, disabled }: ChipProps) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      {...bind}
      // The one chip (PING.md §9.6): accent soft with an accent edge when on,
      // the faint white ground and no edge when off.
      style={[
        webTransition('background-color'),
        {
          borderColor: selected ? COLORS.accent : 'transparent',
          backgroundColor: selected ? COLORS.accentSoft : hovered && !disabled ? COLORS.rowHover : COLORS.chipGround,
        },
      ]}
      className={['min-h-9 justify-center rounded-full border px-3 py-1.5', disabled ? 'opacity-40' : ''].join(' ')}
    >
      <Text className={selected ? 'font-sans text-sm' : 'font-sans text-sm text-muted-foreground'} style={selected ? { color: COLORS.accentText } : undefined}>
        {label}
      </Text>
    </Pressable>
  );
}

type SegmentedProps<T extends string> = {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
};

/** One-of-N, in a track. Three or four options; past that it becomes a chip wrap. */
export function Segmented<T extends string>({ options, value, onChange, label }: SegmentedProps<T>) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} className="flex-row gap-1 rounded-lg bg-secondary p-[3px]">
      {options.map((option) => (
        <SegmentOption
          key={option.value}
          label={option.label}
          active={option.value === value}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}

/** Its own component so each option can hold its own hover state. */
function SegmentOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { hovered, bind } = useHover();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      {...bind}
      style={[webTransition('background-color'), hovered && !active ? { backgroundColor: COLORS.chipGround } : null]}
      className={['flex-1 items-center rounded-lg py-2.5', active ? 'bg-white/10' : ''].join(' ')}
    >
      <Text
        className={['font-sans text-sm font-semibold', active ? 'text-foreground' : 'text-muted-foreground'].join(' ')}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type SwitchRowProps = {
  label: string;
  sub?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/**
 * A labelled switch. The caller is expected to *not render it at all* when the
 * setting cannot apply — a greyed-out switch with no explanation is a worse
 * answer than an absent one.
 */
export function SwitchRow({ label, sub, value, onChange, disabled }: SwitchRowProps) {
  return (
    <View className="flex-row items-center gap-3 py-4">
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-base font-semibold text-foreground">{label}</Text>
        {!!sub && (
          <Text className="font-sans text-xs text-muted-foreground" numberOfLines={2}>
            {sub}
          </Text>
        )}
      </View>
      <Toggle label={label} value={value} onChange={onChange} disabled={disabled} />
    </View>
  );
}

export function Toggle({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(!value)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 99,
        padding: 2,
        justifyContent: 'center',
        opacity: disabled ? 0.4 : 1,
        backgroundColor: value ? COLORS.accent : 'rgba(255,255,255,0.14)',
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 99,
          backgroundColor: value ? COLORS.accentInk : COLORS.muted,
          transform: [{ translateX: value ? 18 : 0 }],
        }}
      />
    </Pressable>
  );
}

// Android's EditText reserves room for ascent/descent and does not centre with
// `textAlignVertical: 'auto'`, so text visibly sits low in a fixed-height field.
// NativeWind's `text-sm` also emits a lineHeight that clips descenders once
// includeFontPadding is off, so the size lives here rather than in the caller.
export const ANDROID_METRICS =
  Platform.OS === 'android' ? ({ includeFontPadding: false, textAlignVertical: 'center' } as const) : null;

type FieldProps = TextInputProps & {
  /** Reserved space under the field, so an error does not shove the form down. */
  error?: string | null;
};

/** Every text input in the app goes through this. */
export function Field({ error, style, multiline, onFocus, onBlur, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View>
      <TextInput
        placeholderTextColor={COLORS.muted}
        multiline={multiline}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        className={[
          'font-sans rounded-lg border bg-secondary px-3.5 text-foreground',
          error ? 'border-destructive' : 'border-input',
          multiline ? 'py-3' : 'py-3.5',
        ].join(' ')}
        style={[{ fontSize: 16, lineHeight: undefined }, ANDROID_METRICS, webFocusRing(focused), style]}
        {...props}
      />
      {!!error && <Text className="font-sans mt-1.5 text-xs text-destructive-foreground">{error}</Text>}
    </View>
  );
}

/** The uppercase overline above a group of controls. */
export function Overline({ children, className = '' }: { children: string; className?: string }) {
  return (
    <Text
      className={['font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground', className].join(' ')}
    >
      {children}
    </Text>
  );
}

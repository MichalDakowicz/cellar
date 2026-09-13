import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

export type ChipOption<T extends string> = { value: T; label: string; count?: number; glyph?: ReactNode };

type ChipWrapProps<T extends string> = {
  options: ChipOption<T>[];
  /** A set for multi-select, a single value for one-of-N, `null` for none. */
  selected: T[] | T | null;
  onToggle: (value: T) => void;
  label: string;
};

/**
 * The universal selection affordance, in its wrapping form (PING.md §9.6).
 *
 * One shape for kinds, states and default-kind alike — a selected chip is the
 * accent at 0.16 with an accent edge, an unselected one is a faint white ground
 * with no edge at all. Counts ride inside the chip when the caller has them,
 * and the values are always derived from the user's own data, so there is never
 * a chip that matches nothing.
 *
 * A kind chip carries its glyph *and* its name. That pairing is the only legend
 * in the app — it is where you learn that the telescope in a list gutter means
 * research. Icon-only chips would make the gutter unlearnable.
 */
export function ChipWrap<T extends string>({ options, selected, onToggle, label }: ChipWrapProps<T>) {
  const isOn = (value: T) => (Array.isArray(selected) ? selected.includes(value) : selected === value);

  return (
    <View accessibilityLabel={label} className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const active = isOn(option.value);
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            onPress={() => onToggle(option.value)}
            className="flex-row items-center gap-1.5 rounded-full border px-3 py-1.5 active:opacity-80"
            style={{
              borderColor: active ? COLORS.accent : 'transparent',
              backgroundColor: active ? COLORS.accentSoft : COLORS.chipGround,
            }}
          >
            {option.glyph}
            <Text className={['text-sm', active ? 'text-primary' : 'text-muted-foreground'].join(' ')}>
              {option.label}
            </Text>
            {option.count != null && (
              <Text className="text-xs text-neutral-500">{option.count}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

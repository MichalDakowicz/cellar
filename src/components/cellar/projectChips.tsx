import { Pin } from 'lucide-react-native';

import type { ChipOption } from '@/components/cellar/ChipWrap';
import { COLORS } from '@/theme/colors';

export type ProjectChoice = { value: string; label: string; pinned?: boolean };

/**
 * The file it chips on the dump, with a pin on the pinned ones.
 *
 * Same split as `kindChips`: the hook hands over plain data and this adds the
 * glyph. The pinned chips already sit first — `pinnedFirst` ordered them as
 * they were read — so the mark only says why they are there.
 */
export function projectChips(options: ProjectChoice[], selected: string): ChipOption<string>[] {
  return options.map(({ value, label, pinned }) => ({
    value,
    label,
    glyph: pinned ? (
      <Pin size={12} color={value === selected ? COLORS.accent : COLORS.muted} strokeWidth={2.2} />
    ) : undefined,
  }));
}

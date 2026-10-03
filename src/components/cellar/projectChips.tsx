import { Folder, Pin } from 'lucide-react-native';

import type { ChipOption } from '@/components/cellar/ChipWrap';
import { COLORS } from '@/theme/colors';

export type ProjectChoice = { value: string; label: string; pinned?: boolean; home?: boolean };

/**
 * The file it chips on the dump, with a folder on a group's own project and a
 * pin on the pinned ones.
 *
 * Same split as `kindChips`: the hook hands over plain data and this adds the
 * glyph. The groups and the pinned chips already sit first (`groupsFirst`), so
 * the mark only says why they are there.
 */
export function projectChips(options: ProjectChoice[], selected: string[]): ChipOption<string>[] {
  return options.map(({ value, label, pinned, home }) => {
    const color = selected.includes(value) ? COLORS.accent : COLORS.muted;
    return {
      value,
      label,
      glyph: home ? (
        <Folder size={12} color={color} strokeWidth={2.2} />
      ) : pinned ? (
        <Pin size={12} color={color} strokeWidth={2.2} />
      ) : undefined,
    };
  });
}

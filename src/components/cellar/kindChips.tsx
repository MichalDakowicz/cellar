import type { ChipOption } from '@/components/cellar/ChipWrap';
import { KindGlyph } from '@/components/media/Glyphs';
import { KINDS } from '@/lib/kinds';
import { COLORS } from '@/theme/colors';
import type { Kind } from '@/types/cellar';

/**
 * The seven kind chips, glyph and name together.
 *
 * Built here rather than in each feature hook: a hook returns plain data so it
 * stays testable without a renderer (PING.md §13), and these carry JSX. Every
 * screen that offers a kind — capture, the entry, the filter, settings — uses
 * this one builder, so the glyph a chip shows can never drift from the glyph
 * the list gutter shows for the same kind.
 */
export function kindChips(selected: Kind[] | Kind | null): ChipOption<Kind>[] {
  const isOn = (kind: Kind) => (Array.isArray(selected) ? selected.includes(kind) : selected === kind);

  return KINDS.map((meta) => ({
    value: meta.value,
    label: meta.label,
    glyph: <KindGlyph kind={meta.value} size={13} color={isOn(meta.value) ? COLORS.accent : COLORS.muted} />,
  }));
}

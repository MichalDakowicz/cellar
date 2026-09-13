import { Bug, CircleQuestionMark, Lightbulb, Palette, Scissors, Telescope, Type } from 'lucide-react-native';

import { kindMeta } from '@/lib/kinds';
import { COLORS } from '@/theme/colors';
import type { Kind } from '@/types/cellar';

/**
 * One glyph per kind, for the gutter of a list.
 *
 * These replaced a mono text code (`idea` / `rm` / `bug` / `dsgn`). The column
 * was doing two jobs — naming the kind and holding every row's text to the same
 * x — and a glyph does both in less width, so the thought itself gets more of
 * the line. A wall of one-liners is the whole screen in this app; four
 * characters per row is not nothing.
 *
 * Still monochrome. Seven colours would be a legend you have to learn, and
 * would spend the accent seven times over on a screen where it marks exactly
 * one live thing (PING.md §1.2).
 *
 * Written as a component with a `switch`, not a table returning a component:
 * `const Icon = iconFor(kind)` mints a fresh component identity every render,
 * which remounts it and is what the react-hooks static-components rule is
 * about (PING.md §13).
 */
export function KindGlyph({
  kind,
  size = 14,
  color = COLORS.muted,
}: {
  kind: Kind;
  size?: number;
  color?: string;
}) {
  switch (kind) {
    case 'idea':
      return <Lightbulb size={size} color={color} strokeWidth={2} />;
    // Cut it, rather than a minus — a removal is a decision to take something
    // out that exists, not the absence of one.
    case 'removal':
      return <Scissors size={size} color={color} strokeWidth={2} />;
    case 'glitch':
      return <Bug size={size} color={color} strokeWidth={2} />;
    case 'question':
      return <CircleQuestionMark size={size} color={color} strokeWidth={2} />;
    // The family is named after sensing instruments; research is the one kind
    // that gets to be literal about it.
    case 'research':
      return <Telescope size={size} color={color} strokeWidth={2} />;
    case 'copy':
      return <Type size={size} color={color} strokeWidth={2} />;
    case 'design':
      return <Palette size={size} color={color} strokeWidth={2} />;
  }
}

/** The gutter's width. Fixed, so every row's text starts at the same x. */
export const KIND_GUTTER = 22;

/**
 * The line box of `text-sm` — 14px type on 20px leading.
 *
 * The gutter is one of these tall so the glyph centres on the *first* line of
 * an entry, whether that entry is one line or three. Padding the glyph down by
 * a guessed amount instead is what leaves it floating above a wrapped row.
 */
export const TEXT_LINE = 20;

/** What a screen reader says where a sighted reader sees the glyph. */
export function kindLabel(kind: Kind): string {
  return kindMeta(kind).label;
}

import { MoreHorizontal } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { useHover, useIsDesktop, webTransition } from '@/hooks/useResponsive';
import { showsHoverControl } from '@/lib/hoverReveal';

/**
 * The frame every tile on the shelf shares — a project's and a folder's — so the
 * two can never drift apart: the 4:3 artwork, the name and meta beneath it, the
 * hover lift, and the edit dot.
 *
 * What goes on the artwork, and what the name row holds, is the caller's; where
 * the dot sits and when it shows is not.
 */
export function TileShell({
  label,
  expanded,
  onPress,
  onEdit,
  editLabel,
  thumb,
  thumbClassName,
  thumbStyle,
  title,
  meta,
}: {
  label: string;
  /** Only a tile that opens (a folder) says whether it is. */
  expanded?: boolean;
  onPress: () => void;
  /** Presence of a handler is what shows the affordance. */
  onEdit?: () => void;
  editLabel: string;
  /** Drawn inside the artwork, over its ground. */
  thumb: ReactNode;
  thumbClassName?: string;
  thumbStyle?: ViewStyle;
  /** The row under the artwork: a name, and whatever belongs beside it. */
  title: ReactNode;
  meta: string;
}) {
  const tile = useHover();
  const edit = useHover();
  const isDesktop = useIsDesktop();
  // A mouse can reveal a control; a thumb cannot. The edit dot is permanent on
  // phone and hover-only on desktop, where five always-lit dots across a grid
  // are five things competing with the tile they sit on.
  //
  // The dot's own hover counts as the tile's, or reaching for it takes it away
  // (lib/hoverReveal) — and the lift reads the same union, so the tile does not
  // drop back down the moment the pointer lands on the control it just offered.
  const showEdit = showsHoverControl({
    hasHandler: !!onEdit,
    isDesktop,
    onSurface: tile.hovered,
    onControl: edit.hovered,
  });
  const hovered = tile.hovered || edit.hovered;

  return (
    <View
      // The lift renders over its neighbours, or the tile to its right clips it.
      style={[webTransition('transform'), hovered ? { transform: [{ scale: 1.035 }], zIndex: 10 } : null]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={expanded === undefined ? undefined : { expanded }}
        onPress={onPress}
        // react-native-web implements hover on Pressable only, so the bind can
        // never sit on the View that carries the lift.
        {...tile.bind}
        className="active:opacity-80"
      >
        <View className={`aspect-[4/3] rounded-md p-3 ${thumbClassName ?? ''}`} style={thumbStyle}>
          {thumb}
        </View>
        <View className="mt-2 flex-row items-center gap-1.5">{title}</View>
        <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
          {meta}
        </Text>
      </Pressable>

      {!!onEdit && (
        // The dot belongs to the artwork, not to the card. Offsetting it from
        // the bottom of the card meant clearing the name and the meta line by
        // hand — 46px of guessed line heights — which left it flush against the
        // artwork's bottom edge while its right inset was a clean 8px, and web
        // metrics are not native metrics, so it read as stuck to the bottom.
        // An overlay the exact shape of the artwork gives it the same inset on
        // both axes, on both platforms, with no arithmetic left to drift.
        //
        // `box-none` so the overlay itself is not a target: the tile underneath
        // has to stay clickable everywhere the dot is not.
        // The ratio is a style rather than a class: `aspect-[4/3]` did not take
        // on an absolutely positioned box, and an overlay that quietly grows to
        // the height of the whole card puts the dot back where it started.
        <View pointerEvents="box-none" className="absolute inset-x-0 top-0" style={{ aspectRatio: 4 / 3 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={editLabel}
            hitSlop={8}
            onPress={onEdit}
            {...edit.bind}
            // Faded rather than unmounted. The dot has to still be there to be
            // hovered, and unmounting it on the tile's hover-out is what made
            // it vanish from under the pointer on the way to the click; a node
            // that survives the hand-off gets its own hover and stays up.
            //
            // Out of the tab order while it is invisible, so a tab does not
            // land on something nobody can see. `focusable` alone does not do
            // it on web — react-native-web leaves the tabindex at 0 — so the
            // web side has to be said in the prop that reaches it.
            focusable={showEdit}
            tabIndex={showEdit ? 0 : -1}
            pointerEvents={showEdit ? 'auto' : 'none'}
            style={[webTransition('opacity'), { opacity: showEdit ? 1 : 0 }]}
            // Its own Pressable over the tile's, not nested inside it — a
            // nested pressable inside a pressed parent swallows the press on
            // Android.
            className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/50 active:opacity-70"
          >
            <MoreHorizontal size={16} color="#fafafa" strokeWidth={2} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

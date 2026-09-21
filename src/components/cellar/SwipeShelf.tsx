import { useMemo, type ReactNode } from 'react';
import { PanResponder, View } from 'react-native';

import { claimsHorizontalPan, swipeDirection, type SwipeDirection } from '@/lib/shelfCycle';

/**
 * The block you are filing into, draggable sideways to the next shelf.
 *
 * `PanResponder` rather than a gesture-handler detector because this has to
 * behave the same on the web build, and because the thing it competes with is
 * the screen's own vertical ScrollView — `onMoveShouldSetPanResponder` is
 * exactly the negotiation that settles which of the two owns a drag, and it
 * settles it early enough that the scroll never starts.
 *
 * It claims nothing on a tap, so the project chips underneath keep working:
 * a press that never moves 12px is never ours, and one that becomes ours
 * cancels the chip's press the way any responder takeover does.
 *
 * The rules and their numbers are `src/lib/shelfCycle.ts`, so what counts as a
 * swipe is testable without a renderer.
 */
export function SwipeShelf({
  enabled,
  onSwipe,
  children,
}: {
  /** False with one shelf: there is nowhere to go, so the drag stays the scroll's. */
  enabled: boolean;
  onSwipe: (direction: SwipeDirection) => void;
  children: ReactNode;
}) {
  // Rebuilt only when the handler or the switch changes: a responder recreated
  // every render drops the gesture it was in the middle of.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          enabled && claimsHorizontalPan(gesture.dx, gesture.dy),
        onPanResponderRelease: (_event, gesture) => {
          const direction = swipeDirection(gesture.dx, gesture.dy);
          if (direction) onSwipe(direction);
        },
      }),
    [enabled, onSwipe],
  );

  return <View {...responder.panHandlers}>{children}</View>;
}

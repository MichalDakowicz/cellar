import { useMemo, type ReactNode } from 'react';
import { PanResponder } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  claimsHorizontalPan,
  dragOffset,
  exitOffset,
  swipeDirection,
  type SwipeDirection,
} from '@/lib/shelfCycle';

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
 * The block moves while you drag it, damped and capped (`dragOffset`), because
 * a gesture with no answer until it is finished cannot be learned — you find
 * out it exists by half-doing it and seeing something give. Committing carries
 * the block the rest of the way out, swaps the shelf behind the fade, and
 * brings it back in from the other side, so the direction you dragged is the
 * direction the new shelf arrives from.
 *
 * The rules and their numbers are `src/lib/shelfCycle.ts`, so what counts as a
 * swipe and how far it travels are testable without a renderer.
 */

/** Matches the nav island's slide — the one other thing in the app that moves like this. */
const SETTLE = { duration: 260, easing: Easing.out(Easing.cubic) };

/** Leaving is quicker than arriving: the swap has to feel like a consequence. */
const LEAVE = { duration: 160, easing: Easing.out(Easing.cubic) };

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
  const shift = useSharedValue(0);
  const fade = useSharedValue(1);

  // Rebuilt only when the handler or the switch changes: a responder recreated
  // every render drops the gesture it was in the middle of. The shared values
  // are stable for the life of the component, so they are safe to close over.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_event, gesture) =>
          enabled && claimsHorizontalPan(gesture.dx, gesture.dy),
        onPanResponderMove: (_event, gesture) => {
          shift.value = dragOffset(gesture.dx);
        },
        onPanResponderRelease: (_event, gesture) => {
          const direction = swipeDirection(gesture.dx, gesture.dy);
          if (!direction) {
            shift.value = withTiming(0, SETTLE);
            return;
          }
          const exit = exitOffset(direction);
          fade.value = withTiming(0, LEAVE);
          shift.value = withTiming(exit, LEAVE, (finished) => {
            'worklet';
            // An interrupted exit means another gesture already owns these
            // values; finishing this one on top of it would fight it.
            if (!finished) return;
            runOnJS(onSwipe)(direction);
            // Jump to the far side and come back, so the new shelf enters from
            // the direction the drag was heading rather than rebounding.
            shift.value = -exit;
            shift.value = withTiming(0, SETTLE);
            fade.value = withTiming(1, SETTLE);
          });
        },
        // The scroll, a second finger or a navigation can take the gesture
        // away mid-drag, and a block left sitting 30px off is just broken.
        onPanResponderTerminate: () => {
          shift.value = withTiming(0, SETTLE);
          fade.value = withTiming(1, SETTLE);
        },
      }),
    // The shared values are stable for the life of the component and are
    // deliberately absent: naming them here would make them hook arguments,
    // and writing to one from inside is then a lint error rather than the
    // whole point of them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, onSwipe],
  );

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: shift.value }],
    opacity: fade.value,
  }));

  return (
    <Animated.View style={style} {...responder.panHandlers}>
      {children}
    </Animated.View>
  );
}

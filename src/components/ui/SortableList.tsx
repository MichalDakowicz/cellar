import { GripVertical } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { COLORS } from '@/theme/colors';

export type SortableItem = { key: string; label: string; sub?: string };

/** Every row is this tall, which is what lets a finger's y become an index with one division. */
const ROW = 56;
/** Long enough that a scroll never picks a row up by accident, short enough not to feel stuck. */
const HOLD_MS = 220;

type Slots = Record<string, number>;

function slotsOf(items: SortableItem[]): Slots {
  return Object.fromEntries(items.map((item, index) => [item.key, index]));
}

/** Every key's new slot after `key` moves to `to`. A worklet: it runs on the UI thread mid-drag. */
function moveSlot(slots: Slots, key: string, to: number): Slots {
  'worklet';
  const from = slots[key];
  const next: Slots = {};
  for (const other of Object.keys(slots)) {
    const at = slots[other];
    if (other === key) next[other] = to;
    else if (from < to && at > from && at <= to) next[other] = at - 1;
    else if (from > to && at >= to && at < from) next[other] = at + 1;
    else next[other] = at;
  }
  return next;
}

/**
 * A list you put in order by holding a row and dragging it.
 *
 * Hold, then drag: the hold is what tells a drag from a scroll, so the list
 * still scrolls under a flick and nothing moves until you mean it. The rows
 * slide out of the way as you go and the drop lands where the gap is. The
 * order is only reported once, on the drop — `onMove(from, to)` — so the
 * caller writes once per drag, not once per row crossed.
 */
export function SortableList({ items, onMove }: { items: SortableItem[]; onMove: (from: number, to: number) => void }) {
  const slots = useSharedValue<Slots>(slotsOf(items));
  const [dragging, setDragging] = useState(false);

  // A new list from the caller — after a drop lands, or a row arrives from the
  // other device — is the truth; the slots follow it.
  useEffect(() => {
    slots.set(slotsOf(items));
  }, [items, slots]);

  return (
    <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={{ height: items.length * ROW }}>
        {items.map((item, index) => (
          <SortableRow
            key={item.key}
            item={item}
            index={index}
            slots={slots}
            count={items.length}
            onDragging={setDragging}
            onDrop={onMove}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function SortableRow({
  item,
  index,
  slots,
  count,
  onDragging,
  onDrop,
}: {
  item: SortableItem;
  index: number;
  slots: SharedValue<Slots>;
  count: number;
  onDragging: (dragging: boolean) => void;
  onDrop: (from: number, to: number) => void;
}) {
  const top = useSharedValue(index * ROW);
  const active = useSharedValue(false);
  const start = useSharedValue(0);

  // Every row but the one in the hand glides to its slot as the slots change.
  useAnimatedReaction(
    () => slots.get()[item.key],
    (now, before) => {
      if (now !== before && !active.get() && now !== undefined) top.set(withTiming(now * ROW, { duration: 140 }));
    },
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(HOLD_MS)
    .onStart(() => {
      active.set(true);
      start.set(slots.get()[item.key]);
      runOnJS(onDragging)(true);
    })
    .onUpdate((event) => {
      top.set(start.get() * ROW + event.translationY);
      const to = Math.max(0, Math.min(count - 1, Math.round(top.get() / ROW)));
      if (to !== slots.get()[item.key]) slots.set(moveSlot(slots.get(), item.key, to));
    })
    .onFinalize(() => {
      if (!active.get()) return;
      const to = slots.get()[item.key];
      top.set(withTiming(to * ROW, { duration: 140 }));
      active.set(false);
      runOnJS(onDragging)(false);
      if (to !== start.get()) runOnJS(onDrop)(start.get(), to);
    });

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW,
    top: top.value,
    zIndex: active.value ? 10 : 0,
    transform: [{ scale: withTiming(active.value ? 1.02 : 1, { duration: 120 }) }],
    opacity: 1,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>
        <View
          accessibilityLabel={`${item.label}, hold and drag to move`}
          className="mx-0 my-1 flex-1 flex-row items-center gap-3 rounded-xl bg-neutral-900 px-3"
        >
          <GripVertical size={16} color={COLORS.muted} strokeWidth={2} />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {item.label}
            </Text>
            {!!item.sub && (
              <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                {item.sub}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

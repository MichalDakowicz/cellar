import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';

type Ask = { id: string; title: string; detail: string };

/**
 * Waiting on you, answered where it is (`DeskHome.dc.html`): an approval gets
 * deny and allow on its row; a thought an agent asked about opens its
 * question. Nothing here when nothing waits.
 */
export function DeskWaitingInline({
  asks,
  onDecide,
  thoughts,
  onAnswer,
}: {
  asks: Ask[];
  onDecide: (id: string, decision: 'allow' | 'deny') => void;
  thoughts: Ask[];
  onAnswer: (id: string) => void;
}) {
  const count = asks.length + thoughts.length;
  if (count === 0) return null;

  return (
    <View className="gap-2">
      <Overline>{`waiting on you · ${count}`}</Overline>
      {asks.map((ask) => (
        <Row key={ask.id} ask={ask}>
          <Button label="deny" onPress={() => onDecide(ask.id, 'deny')} />
          <Button label="allow" primary onPress={() => onDecide(ask.id, 'allow')} />
        </Row>
      ))}
      {thoughts.map((thought) => (
        <Row key={thought.id} ask={thought}>
          <Button label="answer" onPress={() => onAnswer(thought.id)} />
        </Row>
      ))}
    </View>
  );
}

function Row({ ask, children }: { ask: Ask; children: ReactNode }) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl bg-row px-3.5 py-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-sans text-base font-bold text-foreground" numberOfLines={1}>
          {ask.title}
        </Text>
        <Text className="font-sans text-xs text-muted-foreground" numberOfLines={1}>
          {ask.detail}
        </Text>
      </View>
      {children}
    </View>
  );
}

function Button({ label, primary, onPress }: { label: string; primary?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`h-9 justify-center rounded-full px-4 active:opacity-70 ${primary ? 'bg-primary' : 'border border-border'}`}
    >
      <Text className={`font-sans text-sm font-semibold ${primary ? 'text-primary-foreground' : 'text-foreground'}`}>{label}</Text>
    </Pressable>
  );
}

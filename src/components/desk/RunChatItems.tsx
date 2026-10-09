import { ChevronDown, ChevronRight, Wrench } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { LinkedText } from '@/components/cellar/LinkedText';
import { toolsSummary, type ChatItem } from '@/lib/deskChat';
import { COLORS } from '@/theme/colors';

/**
 * A run's chat (`Run.dc.html`): your messages as bubbles on the right, the
 * agent's words as text, each stretch of tool steps one tile that opens to the
 * steps. Agent text goes through `LinkedText`, so links and colour codes in a
 * reply are live too.
 */
export function RunChatItems({ items }: { items: ChatItem[] }) {
  return (
    <View className="gap-4">
      {items.map((item, index) => {
        switch (item.kind) {
          case 'you':
            return (
              <View key={index} className="items-end">
                <View className="max-w-[85%] rounded-2xl bg-secondary px-3.5 py-2.5">
                  <Text className="text-sm text-foreground">{item.text}</Text>
                </View>
              </View>
            );
          case 'agent':
            return <LinkedText key={index} text={item.text} className="text-sm leading-relaxed text-foreground" />;
          case 'tools':
            return <ToolsTile key={index} steps={item.steps} />;
          default:
            return (
              <Text key={index} className="text-xs italic text-muted-foreground">
                {item.text}
              </Text>
            );
        }
      })}
    </View>
  );
}

/** One folded stretch of tool steps. Closed it is one line; open, every step in mono. */
function ToolsTile({ steps }: { steps: string[] }) {
  const [open, setOpen] = useState(false);
  const Chevron = open ? ChevronDown : ChevronRight;

  return (
    <View className="rounded-xl bg-secondary/60 px-3">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${toolsSummary(steps)}, ${open ? 'hide' : 'show'} them`}
        onPress={() => setOpen(!open)}
        className="h-10 flex-row items-center gap-2.5 active:opacity-70"
      >
        <Wrench size={15} color={COLORS.muted} strokeWidth={2} />
        <Text className="flex-1 text-sm text-muted-foreground">{toolsSummary(steps)}</Text>
        <Chevron size={16} color={COLORS.muted} strokeWidth={2} />
      </Pressable>
      {open && (
        <View className="gap-1 pb-3">
          {steps.map((step, index) => (
            <Text key={index} className="font-mono text-xs text-muted-foreground" numberOfLines={2} selectable>
              › {step}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

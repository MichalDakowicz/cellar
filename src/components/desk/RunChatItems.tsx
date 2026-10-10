import { ChevronDown, ChevronRight, FileText, Pencil, SquareTerminal, Wrench, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Markdown } from '@/components/cellar/Markdown';
import { stepRows, type ChatItem, type StepKind, type StepRow } from '@/lib/deskChat';
import { COLORS } from '@/theme/colors';

/**
 * A run's chat (`Run.dc.html`): your messages as bubbles on the right, the
 * agent's words as text, each stretch of tool steps one tile that opens to the
 * steps. Agent text is markdown and is drawn as such (`Markdown`), with links
 * and colour codes in it live too.
 */
export function RunChatItems({ items, youCaption }: { items: ChatItem[]; youCaption: string }) {
  return (
    <View className="gap-4">
      {items.map((item, index) => {
        switch (item.kind) {
          case 'you':
            return (
              <View key={index} className="items-end gap-1">
                <View className="max-w-[300px] rounded-2xl bg-secondary px-3.5 py-2.5">
                  <Text className="font-sans text-sm text-foreground">{item.text}</Text>
                </View>
                <Text className="font-sans text-[11px] text-muted-foreground">{youCaption}</Text>
              </View>
            );
          case 'agent':
            return <Markdown key={index} text={item.text} className="font-sans text-sm leading-relaxed text-foreground" />;
          case 'tools':
            return <ToolsTile key={index} steps={item.steps} />;
          default:
            return (
              <Text key={index} className="font-sans text-xs italic text-muted-foreground">
                {item.text}
              </Text>
            );
        }
      })}
    </View>
  );
}

const STEP_ICONS: Record<StepKind, LucideIcon> = { read: FileText, command: SquareTerminal, edit: Pencil, other: Wrench };

/**
 * One stretch of tool steps (`Run.dc.html`): a row per kind of step — "read 4
 * files", each command in mono, "edited 2 files" — each opening to the raw
 * steps under it.
 */
function ToolsTile({ steps }: { steps: string[] }) {
  return (
    <View className="rounded-xl bg-row px-3 py-1">
      {stepRows(steps).map((row, index) => (
        <StepRowView key={`${index}:${row.label}`} row={row} />
      ))}
    </View>
  );
}

function StepRowView({ row }: { row: StepRow }) {
  const [open, setOpen] = useState(false);
  const Icon = STEP_ICONS[row.kind];
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${row.label}, ${open ? 'hide' : 'show'} the steps`}
        onPress={() => setOpen(!open)}
        className="min-h-11 flex-row items-center gap-2 active:opacity-70"
      >
        <Icon size={15} color={COLORS.foregroundSoft} strokeWidth={2} />
        <Text className={`min-w-0 flex-1 text-[13px] text-foreground ${row.mono ? 'font-mono' : 'font-sans'}`} numberOfLines={1}>
          {row.label}
        </Text>
        <Chevron size={16} color={COLORS.muted} strokeWidth={2} />
      </Pressable>
      {open && (
        <View className="gap-1 pb-2 pl-6">
          {row.steps.map((step, index) => (
            <Text key={index} className="font-mono text-xs text-muted-foreground" numberOfLines={2} selectable>
              {step}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

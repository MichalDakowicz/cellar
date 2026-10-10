import { Mic } from 'lucide-react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import type { DeskKey, KeyPlanLine } from '@/lib/deskKeys';
import { COLORS } from '@/theme/colors';

import { KeyList, type KeyListView } from './KeyList';
import { KeyPlan } from './KeyPlan';
import { KeyStrip } from './KeyStrip';

type Dispatch = 'steer' | 'queue';

const DISPATCH: { id: Dispatch; label: string }[] = [
  { id: 'steer', label: 'steer it now' },
  { id: 'queue', label: 'queue after this turn' },
];

/** The keys behind a composer, from `features/desk/useDeskKeys`. */
export type ComposerKeys = {
  list: KeyListView | null;
  plan: KeyPlanLine[];
  onKey: (key: DeskKey) => void;
  onSelection: (end: number) => void;
  onCopy: (code: string) => void;
  onNudge: (code: string, lighter: boolean) => void;
};

/**
 * Talking to a run (`Run.dc.html`): steer it now or queue after this turn, the
 * field, the mic, and the `@ $ /` key strip so the symbols are never dug for
 * (docs/desk/keys.md). Drawn ahead of the pc taking messages for a live run
 * (docs/desk/TASKS.md W9) — until then send is off and the line says why.
 */
export function RunComposer({
  draft,
  onDraft,
  dispatch,
  onDispatch,
  disabledReason,
  keys,
}: {
  draft: string;
  onDraft: (text: string) => void;
  dispatch: Dispatch;
  onDispatch: (dispatch: Dispatch) => void;
  disabledReason: string | null;
  keys: ComposerKeys;
}) {
  return (
    <View className="gap-2.5">
      <View className="flex-row gap-2">
        {DISPATCH.map((option) => {
          const on = option.id === dispatch;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => onDispatch(option.id)}
              className={`min-h-8 justify-center rounded-full border px-3 ${on ? 'border-primary' : 'border-transparent'}`}
              style={{ backgroundColor: on ? COLORS.accentSoft : COLORS.chipGround }}
            >
              <Text className={`text-xs font-semibold ${on ? 'text-foreground' : 'text-muted-foreground'}`}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {keys.list && <KeyList list={keys.list} />}
      <View className="flex-row items-center gap-2">
        <TextInput
          className="h-[52px] min-w-0 flex-1 rounded-full border border-border bg-secondary px-[18px] text-foreground"
          style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS]}
          placeholder="say or type — @ file, $ cellar or command, / skill"
          placeholderTextColor={COLORS.muted}
          value={draft}
          onChangeText={onDraft}
          onSelectionChange={({ nativeEvent }) => keys.onSelection(nativeEvent.selection.end)}
          accessibilityLabel="message for the agent"
        />
        <View
          accessibilityLabel="speaking comes soon"
          className="h-[52px] w-[52px] items-center justify-center rounded-full bg-primary"
        >
          <Mic size={22} color={COLORS.accentInk} strokeWidth={2} />
        </View>
      </View>
      <KeyStrip active={keys.list?.key ?? null} onKey={keys.onKey} />
      <KeyPlan lines={keys.plan} onCopy={keys.onCopy} onNudge={keys.onNudge} />
      {!!disabledReason && <Text className="text-xs text-muted-foreground">{disabledReason}</Text>}
    </View>
  );
}

import { ArrowUp, ChevronDown, FilePlus, ImagePlus, Mic, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS } from '@/components/ui/controls';
import type { DeskKey, KeyPlanLine } from '@/lib/deskKeys';
import { COLORS } from '@/theme/colors';

import { ComposerTray } from './ComposerTray';
import { ComposerModelPicker } from './ComposerModelPicker';
import { ComposerQueue, type QueuedPreview } from './ComposerQueue';
import { KeyList, type KeyListView } from './KeyList';
import { KeyPlan } from './KeyPlan';

export type ComposerKeys = {
  list: KeyListView | null;
  plan: KeyPlanLine[];
  onKey: (key: DeskKey) => void;
  onSelection: (end: number) => void;
  onCopy: (code: string) => void;
  onNudge: (code: string, lighter: boolean) => void;
};

/** RUN-R1b/R1c: text above one toolbar; popouts open upward. Host actions wait for W9/W12. */
export function RunComposer({ draft, onDraft, disabledReason, keys, modelLabel = 'model', finished = false, sampleModels, queued = [] }: {
  draft: string;
  onDraft: (text: string) => void;
  dispatch: 'steer' | 'queue';
  onDispatch: (dispatch: 'steer' | 'queue') => void;
  disabledReason: string | null;
  keys: ComposerKeys;
  modelLabel?: string;
  finished?: boolean;
  sampleModels?: { models: string[]; efforts: string[] };
  queued?: QueuedPreview[];
}) {
  const [tray, setTray] = useState<'attach' | 'model' | 'queue' | null>(null);
  const [model, setModel] = useState(sampleModels?.models[0] ?? '');
  const [effort, setEffort] = useState(sampleModels?.efforts.at(-1) ?? '');
  return (
    <View className="gap-2" style={{ zIndex: 5 }}>
      {queued.length > 0 && <Pressable accessibilityRole="button" accessibilityLabel="queued messages" onPress={() => setTray(tray === 'queue' ? null : 'queue')} className="min-h-11 self-start justify-center px-2"><Text className="font-sans text-xs text-muted-foreground">{queued.length} queued ↑</Text></Pressable>}
      {tray && <ComposerTray title={tray === 'attach' ? 'add to your message' : tray === 'queue' ? 'queued messages' : 'model & reasoning'} onClose={() => setTray(null)}>
        {tray === 'attach' ? <>
          <View className="min-h-11 flex-row items-center gap-2.5 px-2"><FilePlus size={18} color={COLORS.foregroundSoft} /><Text className="font-sans text-sm text-foreground">Add file</Text></View>
          <View className="min-h-11 flex-row items-center gap-2.5 px-2"><ImagePlus size={18} color={COLORS.foregroundSoft} /><Text className="font-sans text-sm text-foreground">Add image</Text></View>
          <Text className="font-sans text-xs text-muted-foreground">File and image transfer comes with chat delivery.</Text>
        </> : tray === 'queue' ? <ComposerQueue messages={queued} /> : sampleModels ? <ComposerModelPicker {...sampleModels} model={model} effort={effort} onModel={setModel} onEffort={setEffort} /> : <>
          <Text className="font-sans text-xs text-muted-foreground">Models and reasoning will come from this agent on your PC.</Text>
          <View className="min-h-11 justify-center rounded-lg border border-primary px-3" style={{ backgroundColor: COLORS.accentSoft }}><Text className="font-sans text-sm text-foreground">{modelLabel} · current agent</Text></View>
          <Text className="font-sans text-xs text-muted-foreground">Model switching is not connected yet.</Text>
        </>}
      </ComposerTray>}
      {keys.list && <KeyList list={keys.list} />}
      <View className="rounded-xl border border-composer-edge bg-composer">
        <TextInput
          className="font-sans max-h-[124px] min-h-[52px] w-full px-3 pb-1 pt-3 text-sm text-foreground"
          style={[{ lineHeight: 20, textAlignVertical: 'top' }, ANDROID_METRICS]}
          placeholder="Message…"
          placeholderTextColor={COLORS.muted}
          value={draft}
          onChangeText={onDraft}
          onSelectionChange={({ nativeEvent }) => keys.onSelection(nativeEvent.selection.end)}
          multiline
          accessibilityLabel="message for the agent"
        />
        <View className="flex-row items-center gap-0.5 px-1.5 pb-1.5 pt-0.5">
          <Pressable accessibilityRole="button" accessibilityLabel="add file or image" accessibilityState={{ expanded: tray === 'attach' }} onPress={() => setTray(tray === 'attach' ? null : 'attach')} className="h-11 w-11 items-center justify-center rounded-lg"><Plus size={20} color={COLORS.foregroundSoft} /></Pressable>
          <View accessibilityLabel="voice comes soon" className="h-11 w-11 items-center justify-center rounded-lg"><Mic size={20} color={COLORS.foregroundSoft} /></View>
          <Pressable accessibilityRole="button" accessibilityLabel="model and reasoning" accessibilityState={{ expanded: tray === 'model' }} onPress={() => setTray(tray === 'model' ? null : 'model')} className="h-11 min-w-0 flex-1 flex-row items-center justify-end gap-1 px-1">
            <Text className="font-sans min-w-0 shrink text-xs text-muted-foreground" numberOfLines={1}>{sampleModels ? `${model} · ${effort}` : modelLabel}</Text><ChevronDown size={14} color={COLORS.muted} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={finished ? 'continue this chat' : 'send message'} accessibilityState={{ disabled: true }} disabled className={`h-11 items-center justify-center rounded-[9px] bg-secondary ${finished ? 'px-2.5' : 'w-11'}`}>
            {finished ? <Text className="font-sans text-xs text-muted-foreground">Continue</Text> : <ArrowUp size={20} color={COLORS.muted} />}
          </Pressable>
        </View>
      </View>
      <KeyPlan lines={keys.plan} onCopy={keys.onCopy} onNudge={keys.onNudge} />
      {!!disabledReason && <Text className="font-sans text-[11px] leading-4 text-muted-foreground">{disabledReason}</Text>}
    </View>
  );
}

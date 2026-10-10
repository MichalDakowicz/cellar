import { Pressable, Switch, Text, TextInput, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { ANDROID_METRICS, Overline } from '@/components/ui/controls';
import { KINDS } from '@/lib/kinds';
import { COLORS } from '@/theme/colors';

/**
 * The share sheet's body (`PhoneShare.dc.html`): in your words, the kind —
 * guessed from them until you pick — the project, and whether it goes
 * straight to an agent. The file button is the sheet's footer.
 */
export function ShareBody(props: {
  text: string;
  onText: (text: string) => void;
  kind: string;
  guessed: boolean;
  onKind: (kind: string) => void;
  projects: { id: string; name: string }[];
  projectId: string | null;
  onProject: (id: string | null) => void;
  handoff: boolean;
  onHandoff: (on: boolean) => void;
  onCancel: () => void;
}) {
  return (
    <View className="gap-[18px]">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-foreground">file it into cellar</Text>
        <Pressable accessibilityRole="button" onPress={props.onCancel} className="h-9 justify-center rounded-full px-3 active:opacity-70">
          <Text className="text-sm text-muted-foreground">cancel</Text>
        </Pressable>
      </View>

      <View className="gap-1.5">
        <Text className="text-xs text-muted-foreground">in your words</Text>
        <TextInput
          className="min-h-[80px] rounded-xl border border-border bg-secondary px-3 py-2.5 text-foreground"
          style={[{ fontSize: 14, lineHeight: 20, textAlignVertical: 'top' }, ANDROID_METRICS]}
          value={props.text}
          onChangeText={props.onText}
          multiline
          autoFocus
          placeholder="what is it about?"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel="in your words"
        />
      </View>

      <View className="gap-2">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          kind
          {props.guessed && <Text className="font-medium normal-case tracking-normal"> · guessed from your words</Text>}
        </Text>
        <ChipWrap label="kind" options={KINDS.map((kind) => ({ value: kind.value, label: kind.label }))} selected={props.kind} onToggle={props.onKind} />
      </View>

      <View className="gap-2">
        <Overline>project</Overline>
        <ChipWrap
          label="project"
          options={[...props.projects.map((project) => ({ value: project.id, label: project.name })), { value: '', label: 'inbox · decide later' }]}
          selected={props.projectId ?? ''}
          onToggle={(id) => props.onProject(id || null)}
        />
      </View>

      <View className="flex-row items-start gap-3 rounded-xl bg-secondary/60 p-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-foreground">hand it off now</Text>
          <Text className="text-xs text-muted-foreground">
            {props.handoff ? 'files it, then opens a new task with these words' : 'just files it — hand it off later from the entry'}
          </Text>
        </View>
        <Switch
          value={props.handoff}
          onValueChange={props.onHandoff}
          trackColor={{ true: COLORS.accent, false: COLORS.outline }}
          thumbColor={COLORS.foreground}
          accessibilityLabel="hand it off now"
        />
      </View>
    </View>
  );
}

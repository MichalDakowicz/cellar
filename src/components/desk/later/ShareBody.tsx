import { Platform, Pressable, Switch, Text, TextInput, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { ANDROID_METRICS, Overline } from '@/components/ui/controls';
import { KINDS } from '@/lib/kinds';
import { COLORS } from '@/theme/colors';

/** The field is the sheet's whole point; a browser's focus ring around it is noise. */
const NO_OUTLINE = Platform.OS === 'web' ? ({ outlineWidth: 0 } as const) : null;

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
  filingPending?: boolean;
}) {
  return (
    <View className="gap-[18px]">
      <View className="flex-row items-center justify-between">
        <Text className="font-sans text-lg font-bold text-foreground">file it into cellar</Text>
        <Pressable accessibilityRole="button" onPress={props.onCancel} className="h-9 justify-center rounded-full px-3 active:opacity-70">
          <Text className="font-sans text-sm text-muted-foreground">cancel</Text>
        </Pressable>
      </View>

      {props.filingPending && <Text className="font-sans text-sm text-muted-foreground">Filing unconfirmed. Original words and choices are kept until you confirm the result.</Text>}

      <View className="gap-1.5">
        <Text className="font-sans text-xs text-muted-foreground">in your words</Text>
        <TextInput
          className="font-sans min-h-[80px] rounded-xl border border-border bg-secondary px-3 py-2.5 text-foreground"
          style={[{ fontSize: 14, lineHeight: 20, textAlignVertical: 'top' }, ANDROID_METRICS, NO_OUTLINE]}
          value={props.text}
          onChangeText={props.onText}
          editable={!props.filingPending}
          multiline
          autoFocus
          placeholder="what is it about?"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel="in your words"
        />
      </View>

      <View className="gap-2">
        <Text className="font-sans text-xs font-bold uppercase tracking-widest text-muted-foreground">
          kind
          {props.guessed && <Text className="font-sans font-medium normal-case tracking-normal"> · guessed from your words</Text>}
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

      <View className="flex-row items-start gap-3 rounded-xl bg-row p-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-sans text-sm font-semibold text-foreground">hand it off now</Text>
          <Text className="font-sans text-xs text-muted-foreground">
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

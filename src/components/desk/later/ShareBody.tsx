import { Pressable, Text, TextInput, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { ANDROID_METRICS, Overline, SwitchRow } from '@/components/ui/controls';
import { KINDS } from '@/lib/kinds';
import { COLORS } from '@/theme/colors';

/** The share sheet's form (`PhoneShare.dc.html`): words, kind, project, hand it off, file. */
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
  canFile: boolean;
  label: string;
  file: () => void;
}) {
  return (
    <View className="gap-5">
      <View className="gap-2">
        <Overline>in your words</Overline>
        <TextInput
          className="min-h-[88px] rounded-xl bg-secondary px-4 py-3 text-base text-foreground"
          style={[{ textAlignVertical: 'top', lineHeight: undefined }, ANDROID_METRICS]}
          value={props.text}
          onChangeText={props.onText}
          multiline
          placeholder="what is it about?"
          placeholderTextColor={COLORS.muted}
          accessibilityLabel="in your words"
        />
      </View>
      <View className="gap-2">
        <Overline>{props.guessed ? 'kind · guessed from your words' : 'kind'}</Overline>
        <ChipWrap label="kind" options={KINDS.map((kind) => ({ value: kind.value, label: kind.label }))} selected={props.kind} onToggle={props.onKind} />
      </View>
      <View className="gap-2">
        <Overline>project</Overline>
        <ChipWrap
          label="project"
          options={[{ value: '', label: 'inbox · decide later' }, ...props.projects.map((project) => ({ value: project.id, label: project.name }))]}
          selected={props.projectId ?? ''}
          onToggle={(id) => props.onProject(id || null)}
        />
      </View>
      <SwitchRow
        label="hand it off now"
        sub={props.handoff ? 'files it, then opens a new task with these words' : 'just files it — hand it off later from the entry'}
        value={props.handoff}
        onChange={props.onHandoff}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={props.label}
        accessibilityState={{ disabled: !props.canFile }}
        disabled={!props.canFile}
        onPress={props.file}
        className={`h-[52px] items-center justify-center rounded-full bg-foreground active:opacity-80 ${props.canFile ? '' : 'opacity-40'}`}
      >
        <Text className="text-base font-semibold text-background">{props.label}</Text>
      </Pressable>
    </View>
  );
}

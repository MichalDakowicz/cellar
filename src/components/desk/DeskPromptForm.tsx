import { Pressable, Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { TrustAsk } from '@/components/desk/TrustAsk';
import { Field } from '@/components/ui/controls';
import { agentLabel, type DeskAgent } from '@/lib/deskProtocol';

/**
 * A prompt that is not a thought: type it, pick the project it runs in and the
 * agent, send it. The phone's version of opening a terminal in a repo — without
 * remote control, without the pc in front of you.
 *
 * Only projects that know where they live are offered — a checkout, or for a
 * group's own project the group's folder; anything else has no folder for the
 * pc to run in.
 */
export function DeskPromptForm({
  agents,
  agent,
  onAgent,
  projects,
  projectId,
  onProject,
  text,
  onText,
  onStart,
  disabledReason,
  error,
  untrusted,
  trusting,
  onTrust,
  busy,
}: {
  agents: DeskAgent[];
  agent: DeskAgent;
  onAgent: (agent: DeskAgent) => void;
  projects: { id: string; name: string }[];
  projectId: string | null;
  onProject: (id: string) => void;
  text: string;
  onText: (text: string) => void;
  onStart: () => void;
  disabledReason: string | null;
  /** What the pc said when the last start failed. */
  error: string | null;
  /** The folder claude wants trusted before it starts there, while that question is open. */
  untrusted: string | null;
  trusting: boolean;
  onTrust: () => void;
  busy: boolean;
}) {
  const blocked = busy || !!disabledReason;
  return (
    <View className="gap-3 pt-2">
      <Field
        placeholder="what should it do?"
        value={text}
        onChangeText={onText}
        multiline
        style={{ minHeight: 84, textAlignVertical: 'top' }}
      />
      {projects.length > 0 ? (
        <ChipWrap
          label="project"
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          selected={projectId}
          onToggle={onProject}
        />
      ) : (
        <Text className="text-xs text-muted-foreground">
          no project knows where it lives yet — set a folder on one under edit → where it lives
        </Text>
      )}
      <ChipWrap
        label="agent"
        options={agents.map((id) => ({ value: id, label: agentLabel(id) }))}
        selected={agent}
        onToggle={onAgent}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="start it on the pc"
        disabled={blocked}
        onPress={onStart}
        className={['h-11 items-center justify-center rounded-full bg-primary active:opacity-80', blocked ? 'opacity-50' : ''].join(' ')}
      >
        <Text className="text-sm font-semibold text-primary-foreground">{busy ? 'starting…' : 'start it'}</Text>
      </Pressable>
      {!!disabledReason && <Text className="text-xs text-muted-foreground">{disabledReason}</Text>}
      {!!untrusted && <TrustAsk folder={untrusted} busy={trusting} onTrust={onTrust} />}
      {!!error && <Text className="text-sm text-destructive-foreground">{error}</Text>}
    </View>
  );
}

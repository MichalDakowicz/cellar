import { useState } from 'react';
import { Text, View } from 'react-native';

import { StartOnPc } from '@/components/cellar/StartOnPc';
import { TrustAsk } from '@/components/desk/TrustAsk';
import { Chip } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { deskFolderFor } from '@/lib/deskFolders';
import { agentLabel, type DeskAgent } from '@/lib/deskProtocol';
import { deskStartFrom, offeredAgents } from '@/lib/deskStart';

import { useDeskLink } from './useDeskLink';
import { useDeskRuns } from './useDeskRuns';
import { useDeskStart } from './useDeskStart';

/**
 * "start on pc" and the sheet behind it, for an entry or a project.
 *
 * Absent until there is a pc to mean — paired, seen through the cellar, or
 * this window being the pc. The sheet names the agent (the one choice there
 * is), shows the line and the folder — the project's checkout, or for a
 * group's own project the group's folder — and says plainly why it cannot
 * start when it cannot. Claude's trust question, when the folder is new to it,
 * is asked right here.
 */
export function StartOnPcControl({
  prompt,
  projectId,
  entryId = null,
  className = '',
}: {
  prompt: string;
  projectId: string | null | undefined;
  entryId?: string | null;
  /** Spacing for the row it sits in, applied only when there is a control to space. */
  className?: string;
}) {
  const link = useDeskLink();
  const runs = useDeskRuns(link, { watch: false });
  const { projects, groups } = useCellar();
  const { say } = useToast();
  const [open, setOpen] = useState(false);
  const [agent, setAgent] = useState<DeskAgent>('claude');
  const starting = useDeskStart(link, runs, () => {
    setOpen(false);
    say(`started on ${link.name}${link.via === 'cellar' ? ' through the cellar' : ''}`);
  });

  if (!link.bridge && !link.pair && !link.desk) return null;

  const project = projects.find((candidate) => candidate.id === projectId) ?? null;
  const installed = link.info
    ? link.info.agents.filter((candidate) => candidate.installed).map((candidate) => candidate.id)
    : (link.desk?.agents ?? null);
  const built = deskStartFrom({ prompt, repoPath: deskFolderFor(project, projects, groups), entryId, agent });
  const reason = !built.ok
    ? built.reason
    : !link.can.start
      ? `${link.name} is off, asleep or away — it has not answered for a while`
      : starting.busy
        ? `asking ${link.name}…`
        : starting.untrusted
          ? 'answer the question above first'
          : null;

  return (
    <View className={className}>
      <StartOnPc
        name={link.name}
        onPress={() => {
          starting.reset();
          setOpen(true);
        }}
      />
      <SheetDialog
        open={open}
        title={`start on ${link.name}`}
        body="an agent runs this in the project's folder on the pc, in auto mode — the same checks as a session you start there."
        confirmLabel={starting.busy ? 'starting…' : 'start it'}
        confirmDisabledReason={reason}
        onConfirm={() => built.ok && starting.begin(built.start)}
        onDismiss={() => setOpen(false)}
      >
        <View className="gap-3 pt-4">
          <View className="flex-row flex-wrap gap-2">
            {offeredAgents(installed).map((id) => (
              <Chip key={id} label={agentLabel(id)} selected={agent === id} onPress={() => setAgent(id)} />
            ))}
          </View>
          <Text className="font-mono text-xs text-foreground" numberOfLines={4}>
            {prompt}
          </Text>
          {built.ok && <Text className="text-xs text-muted-foreground">in {built.start.cwd}</Text>}
          {!!starting.untrusted && (
            <TrustAsk folder={starting.untrusted} busy={starting.trusting} onTrust={starting.trustAndStart} />
          )}
          {!!starting.error && <Text className="text-sm text-destructive-foreground">{starting.error}</Text>}
        </View>
      </SheetDialog>
    </View>
  );
}

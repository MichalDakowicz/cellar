import { useRouter, type Href } from 'expo-router';
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
 *
 * On a thought it opens the new-task screen with the thought attached instead
 * (docs/desk/screens.md) — the run picks it up, and you can say more, pick the
 * agent and how much it may do. The sheet stays for a project, which has no
 * thought to attach.
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
  const router = useRouter();
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
  const built = deskStartFrom({ prompt, repoPath: deskFolderFor(project, projects, groups), entryId, agent, projectId: project?.id });
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
          if (entryId) {
            router.push(`/desk/new?entry=${entryId}` as Href);
            return;
          }
          starting.reset();
          setOpen(true);
        }}
      />
      <SheetDialog
        open={open}
        title={`start on ${link.name}`}
        body="An agent runs in this project's checkout with edits allowed. Permissions are handled at the PC; phone approvals arrive with W8."
        confirmLabel={starting.busy ? 'starting…' : starting.pending ? 'recover pending task' : 'start it'}
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
          {built.ok && <Text className="font-sans text-xs text-muted-foreground">in {built.start.cwd}</Text>}
          {!!starting.untrusted && (
            <TrustAsk folder={starting.untrusted} busy={starting.trusting} onTrust={starting.trustAndStart} />
          )}
          {!!starting.error && <Text className="font-sans text-sm text-destructive-foreground">{starting.error}</Text>}
          {starting.failed && !starting.busy && <Chip label="edit unstarted task" selected={false} onPress={starting.discardFailed} />}
        </View>
      </SheetDialog>
    </View>
  );
}

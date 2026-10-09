import { useState } from 'react';
import { Text, View } from 'react-native';

import { StartOnPc } from '@/components/cellar/StartOnPc';
import { Chip } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useToast } from '@/components/ui/Toast';
import { agentLabel, type DeskAgent } from '@/lib/deskProtocol';
import { deskStartFrom, offeredAgents } from '@/lib/deskStart';
import { readError } from '@/lib/utils';

import { useDeskLink } from './useDeskLink';
import { useDeskRuns } from './useDeskRuns';

/**
 * "start on pc" and the sheet behind it, for an entry or a project.
 *
 * Absent until there is a pc to mean — paired, seen through the cellar, or
 * this window being the pc. The sheet names the agent (the one choice there
 * is), shows the line and the folder, and states plainly why it cannot start
 * when it cannot: no folder on the project, or the pc off.
 */
export function StartOnPcControl({
  prompt,
  repoPath,
  entryId = null,
  className = '',
}: {
  prompt: string;
  repoPath: string | null | undefined;
  entryId?: string | null;
  /** Spacing for the row it sits in, applied only when there is a control to space. */
  className?: string;
}) {
  const link = useDeskLink();
  const { start } = useDeskRuns(link, { watch: false });
  const { say } = useToast();
  const [open, setOpen] = useState(false);
  const [agent, setAgent] = useState<DeskAgent>('claude');
  // Said inside the sheet: a toast draws under an open modal, which is how a
  // refusal from the pc used to look like a button that did nothing.
  const [error, setError] = useState<string | null>(null);

  if (!link.bridge && !link.pair && !link.desk) return null;

  const installed = link.info
    ? link.info.agents.filter((candidate) => candidate.installed).map((candidate) => candidate.id)
    : (link.desk?.agents ?? null);
  const agents = offeredAgents(installed);
  const built = deskStartFrom({ prompt, repoPath, entryId, agent });
  const reason = !built.ok
    ? built.reason
    : !link.can.start
      ? `${link.name} is off, asleep or away — it has not answered for a while`
      : start.isPending
        ? `asking ${link.name}…`
        : null;

  const go = () => {
    if (!built.ok) return;
    setError(null);
    start.mutate(built.start, {
      onSuccess: () => {
        setOpen(false);
        say(`started on ${link.name}${link.via === 'cellar' ? ' through the cellar' : ''}`);
      },
      onError: (failure) => setError(readError(failure)),
    });
  };

  return (
    <View className={className}>
      <StartOnPc
        name={link.name}
        onPress={() => {
          setError(null);
          setOpen(true);
        }}
      />
      <SheetDialog
        open={open}
        title={`start on ${link.name}`}
        body="an agent runs this in the project's folder on the pc, in auto mode — the same checks as a session you start there."
        confirmLabel={start.isPending ? 'starting…' : 'start it'}
        confirmDisabledReason={reason}
        onConfirm={go}
        onDismiss={() => setOpen(false)}
      >
        <View className="gap-3 pt-4">
          <View className="flex-row flex-wrap gap-2">
            {agents.map((id) => (
              <Chip key={id} label={agentLabel(id)} selected={agent === id} onPress={() => setAgent(id)} />
            ))}
          </View>
          <Text className="font-mono text-xs text-foreground" numberOfLines={4}>
            {prompt}
          </Text>
          {built.ok && <Text className="text-xs text-muted-foreground">in {built.start.cwd}</Text>}
          {!!error && <Text className="text-sm text-destructive-foreground">{error}</Text>}
        </View>
      </SheetDialog>
    </View>
  );
}

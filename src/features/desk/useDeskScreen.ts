import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import type { DeskAgent, DeskRun } from '@/lib/deskProtocol';
import { deskStartFrom, offeredAgents } from '@/lib/deskStart';
import { readError } from '@/lib/utils';
import { useDeskPair } from '@/store/deskPair';

import { useDeskLink } from './useDeskLink';
import { useDeskLocal } from './useDeskLocal';
import { useDeskRuns } from './useDeskRuns';

/**
 * Everything the pc screen shows, put together so the route only lays it out.
 */
export function useDeskScreen() {
  const link = useDeskLink();
  const runs = useDeskRuns(link);
  const local = useDeskLocal(link);
  const { projects } = useCellar();
  const forgetPair = useDeskPair((state) => state.forget);
  const { say } = useToast();

  const [text, setText] = useState('');
  const [agent, setAgent] = useState<DeskAgent>('claude');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [logRun, setLogRun] = useState<DeskRun | null>(null);

  const pairing = useQuery({
    queryKey: ['desk', 'pairing'],
    queryFn: () => link.bridge!.pairing(),
    enabled: link.bridge !== null,
    refetchInterval: 30_000,
  });

  const placed = useMemo(() => projects.filter((project) => !!project.repoPath), [projects]);
  const project = placed.find((candidate) => candidate.id === projectId) ?? null;

  const installed = link.info
    ? link.info.agents.filter((candidate) => candidate.installed).map((candidate) => candidate.id)
    : (link.desk?.agents ?? null);

  const built = project ? deskStartFrom({ prompt: text.trim(), repoPath: project.repoPath, agent }) : null;
  const formReason = !link.can.start
    ? null
    : !text.trim()
      ? 'say what it should do'
      : !project
        ? 'pick the project it runs in'
        : built && !built.ok
          ? built.reason
          : null;

  const startTyped = () => {
    if (!built?.ok) return;
    runs.start.mutate(built.start, {
      onSuccess: () => {
        setText('');
        say(`started on ${link.name}`);
      },
      onError: (error) => say(readError(error)),
    });
  };

  const stop = (run: DeskRun) =>
    runs.stop.mutate(run.id, {
      onSuccess: () => say(`stopped ${run.name}`),
      onError: (error) => say(readError(error)),
    });

  const forgetPhones = async () => {
    await link.bridge?.forgetPhones();
    void pairing.refetch();
    say('every paired phone has to scan again');
  };

  return {
    link,
    runs,
    local,
    form: {
      agents: offeredAgents(installed),
      agent,
      onAgent: setAgent,
      projects: placed.map((candidate) => ({ id: candidate.id, name: candidate.name })),
      projectId,
      onProject: (id: string) => setProjectId((current) => (current === id ? null : id)),
      text,
      onText: setText,
      onStart: startTyped,
      disabledReason: formReason,
      busy: runs.start.isPending,
    },
    pairing: pairing.data ?? null,
    forgetPhones,
    forgetPair: () => {
      forgetPair();
      say('this phone forgot the pc');
    },
    logRun,
    openLog: link.can.log ? setLogRun : null,
    closeLog: () => setLogRun(null),
    stop,
  };
}

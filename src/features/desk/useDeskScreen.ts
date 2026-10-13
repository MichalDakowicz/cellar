import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import type { DeskAgent, DeskRun } from '@/lib/deskProtocol';
import { deskFolders } from '@/lib/deskFolders';
import { deskStartFrom, offeredAgents } from '@/lib/deskStart';
import { readError } from '@/lib/utils';
import { useDeskPair } from '@/store/deskPair';

import { useDeskLink } from './useDeskLink';
import { useDeskLocal } from './useDeskLocal';
import { useDeskRuns } from './useDeskRuns';
import { useDeskStart } from './useDeskStart';

/**
 * Everything the pc screen shows, put together so the route only lays it out.
 */
export function useDeskScreen() {
  const link = useDeskLink();
  const runs = useDeskRuns(link);
  const local = useDeskLocal(link);
  const { projects, groups } = useCellar();
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

  // Roots first: a group's own folder (or the one its checkouts share) is where
  // work on the whole group runs — C:\ping for ping — and it is the pick most
  // likely to already be trusted by claude.
  const folders = useMemo(() => deskFolders(projects, groups), [projects, groups]);
  const folder = folders.find((candidate) => candidate.projectId === projectId) ?? null;
  const starting = useDeskStart(link, runs, () => {
    setText('');
    say(`started on ${link.name}`);
  });

  const installed = link.info
    ? link.info.agents.filter((candidate) => candidate.installed).map((candidate) => candidate.id)
    : (link.desk?.agents ?? null);

  const built = folder ? deskStartFrom({ prompt: text.trim(), repoPath: folder.path, agent }) : null;
  const formReason = !link.can.start
    ? null
    : !text.trim()
      ? 'say what it should do'
      : !folder
        ? 'pick the project it runs in'
        : built && !built.ok
          ? built.reason
          : null;

  const startTyped = () => {
    if (built?.ok) starting.begin(built.start);
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
      projects: folders.map((candidate) => ({ id: candidate.projectId, name: candidate.name })),
      projectId,
      onProject: (id: string) => setProjectId((current) => (current === id ? null : id)),
      text,
      onText: setText,
      onStart: startTyped,
      disabledReason: formReason,
      error: starting.error,
      untrusted: starting.untrusted,
      trusting: starting.trusting,
      onTrust: starting.trustAndStart,
      busy: starting.busy,
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

import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { chatItems, type DeskApproval } from '@/lib/deskChat';
import { agentLabel, isLiveRun, type DeskRunState } from '@/lib/deskProtocol';
import { SAMPLE_CHATS, SAMPLE_RUNS } from '@/lib/deskSample';
import { runMeta } from '@/lib/deskView';
import { longRel } from '@/lib/relTime';
import { projectForPath, repoPathLabel } from '@/lib/repoLink';
import { readError } from '@/lib/utils';

import { useDeskLink } from './useDeskLink';
import { useDeskLog, useDeskRuns } from './useDeskRuns';

export type Dispatch = 'steer' | 'queue';
type Decision = 'allow' | 'always' | 'deny';

const DECIDED: Record<Decision, string> = {
  allow: 'allowed from your phone',
  always: 'allowed for the rest of this run',
  deny: 'denied — the agent was told to go without it',
};

/**
 * One run's screen (`Run.dc.html`): its header, what it said folded into a
 * chat, the approval it is waiting on, and the composer.
 *
 * A real run reads its log from the pc. Answering an approval and talking to a
 * running agent need the pc to hold them open (docs/desk/TASKS.md W8, W9), so
 * on a real run those are drawn and say they are coming; the sample desk's runs
 * show them working, locally.
 */
export function useRunChat(id: string) {
  const link = useDeskLink();
  const runs = useDeskRuns(link);
  const log = useDeskLog(link, id.startsWith('sample-') ? null : id);
  const { projects } = useCellar();
  const { say } = useToast();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [dispatch, setDispatch] = useState<Dispatch>('steer');
  const [draft, setDraft] = useState('');

  const sample = SAMPLE_RUNS.find((candidate) => candidate.id === id) ?? null;
  const chat = sample ? SAMPLE_CHATS[id] : null;
  const run = sample ? null : (runs.runs.find((candidate) => candidate.id === id) ?? null);

  const lines = chat ? chat.lines : (log.data ?? []);
  const asked: DeskApproval | null = chat?.approval ?? null;
  const waiting = (sample?.state ?? run?.state) === 'waiting';
  const state: DeskRunState = sample ? (asked && decision ? 'running' : sample.state) : (run?.state ?? 'done');

  const meta = sample
    ? sample.meta
    : run
      ? runMeta([projectForPath(run.cwd, projects)?.name ?? repoPathLabel(run.cwd), agentLabel(run.agent)])
      : '';

  return {
    found: sample !== null || run !== null,
    loading: !sample && runs.loading,
    title: sample?.title ?? run?.name ?? 'run',
    meta,
    branch: chat?.branch ?? null,
    state,
    age: run ? longRel(new Date(run.startedAt).toISOString()) : null,
    diff: chat?.diff ?? null,
    items: chatItems(lines),
    logError: !sample && log.error ? readError(log.error) : !sample && !link.calls ? `${link.name} is not on this network — its words show here when it is` : null,
    /** The approval it is waiting on, until it is answered. */
    approval: asked && !decision ? asked : null,
    /** A real run stopped on something, before approvals reach the phone. */
    waitingAtPc: !sample && waiting,
    decided: decision ? DECIDED[decision] : null,
    decide: (next: Decision) => setDecision(next),
    canStop: !!run && isLiveRun(run) && run.origin === 'phone',
    stop: () =>
      run &&
      runs.stop.mutate(run.id, {
        onSuccess: () => say(`stopped ${run.name}`),
        onError: (error) => say(readError(error)),
      }),
    composer: {
      draft,
      onDraft: setDraft,
      dispatch,
      onDispatch: setDispatch,
      /** Talking to a running agent waits for the pc's side (W9). */
      disabledReason: 'talking to a running agent comes soon — start a new task for now',
    },
  };
}

import { turnLines } from '@/lib/deskEvents';
import { useDeskHistory } from '@/store/deskHistory';
import { useDeskPrefs } from '@/store/deskPrefs';
import { useDeskStream } from './useDeskStream';
import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { chatItems, type DeskApproval } from '@/lib/deskChat';
import { SAMPLE_COMPOSER_MODELS } from '@/lib/deskCanvas';
import { agentLabel, isLiveRun, type DeskRunState } from '@/lib/deskProtocol';
import { SAMPLE_CHATS, SAMPLE_RUNS } from '@/lib/deskSample';
import { runMeta } from '@/lib/deskView';
import { longRel } from '@/lib/relTime';
import { projectForPath, repoKey, repoPathLabel } from '@/lib/repoLink';
import { readError } from '@/lib/utils';

import { useDeskKeys } from './useDeskKeys';
import { useDeskLink } from './useDeskLink';
import { useDeskLog, useDeskRuns } from './useDeskRuns';
import { useDeskCommands } from './useDeskCommands';
import { leadingCommand, parseCommandSettings } from '@/lib/deskCommands';
import { deskTestResults } from '@/lib/deskTestResults';
import { finishedWorktreeRun } from '@/lib/deskWorktrees';

export type Dispatch = 'steer' | 'queue';
type Decision = 'allow' | 'always' | 'deny';

const DECIDED: Record<Decision, string> = {
  allow: 'allowed from your phone · carrying on',
  always: 'allowed for the rest of this run · carrying on',
  deny: 'denied · the agent was told to go without it',
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
  const sampleEnabled = useDeskPrefs((state) => state.sample);
  const stream = useDeskStream(link, id.startsWith('sample-') ? null : id, !id.startsWith('sample-'));
  const saved = useDeskHistory((state) => state.snapshots[stream.key + ':' + id]);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const history = historyId === id;
  const runs = useDeskRuns(link);
  const log = useDeskLog(link, id.startsWith('sample-') ? null : id);
  const { projects } = useCellar();
  const { say } = useToast();
  const [decision, setDecision] = useState<Decision | null>(null);
  const [dispatch, setDispatch] = useState<Dispatch>('steer');
  const [draft, setDraft] = useState('');
  const jobs = useDeskCommands();
  const [commandError, setCommandError] = useState<string | null>(null);

  const sample = sampleEnabled ? SAMPLE_RUNS.find((candidate) => candidate.id === id) ?? null : null;
  const chat = sample ? SAMPLE_CHATS[id] : null;
  const run = sample ? null : (runs.runs.find((candidate) => candidate.id === id) ?? null);

  const matchedProjectId = run ? run.projectId ?? projectForPath(run.cwd, projects)?.id : null;
  const projectCommands = jobs.projects.find((project) => project.id === matchedProjectId || (!!run && repoKey(project.cwd) === repoKey(run.cwd)));
  const projectId = projectCommands?.id ?? matchedProjectId;
  const command = leadingCommand(draft);
  const canRunCommand = !!command && draft.trim() === `$${command}` && !!projectId && !!link.calls && !jobs.start.isPending;
  const saveText = /^\/save-command\s+(.+)$/s.exec(draft.trim())?.[1];
  const canSaveCommand = !!saveText && !!projectCommands && !!link.calls && !jobs.save.isPending;
  const keys = useDeskKeys(draft, setDraft, run?.agent ?? (sample?.meta.includes('codex') ? 'codex' : 'claude'), projectCommands?.commands.map((item) => item.id));

  const synchronized = stream.live && stream.state.runId === id;
  const viewingHistory = !synchronized && history && !!saved;
  const realItems = synchronized ? stream.state.items : viewingHistory ? saved.items : [];
  const renderEvents = stream.supported || viewingHistory;
  const lines = renderEvents && !chat ? turnLines(realItems) : chat ? chat.lines : (link.calls && log.isSuccess && log.isFetchedAfterMount ? log.data : []);
  const asked: DeskApproval | null = chat?.approval ?? null;
  const state: DeskRunState = sample ? (asked && decision ? 'running' : sample.state)
    : !link.calls || (stream.supported && !synchronized) ? 'unknown' : (run?.state ?? 'unknown');

  const meta = sample
    ? sample.meta
    : run
      ? runMeta([projects.find((project) => project.id === matchedProjectId)?.name ?? repoPathLabel(run.cwd), agentLabel(run.agent)])
      : '';

  return {
    found: sample !== null || run !== null,
    connection: `${link.name} · ${sample ? 'sample desk' : stream.supported ? synchronized ? 'live · synchronized' : stream.state.phase : link.calls ? 'connected · legacy log' : 'disconnected'}`,
    loading: !sample && runs.loading,
    missing: !sample && runs.available && !run,
    title: sample?.title ?? run?.name ?? saved?.runs.find((row) => row.id === id)?.name ?? 'run',
    meta,
    branch: chat?.branch ?? run?.branch ?? null,
    worktreeId: run?.worktreeId && finishedWorktreeRun(state) ? run.worktreeId : null,
    state,
    age: run ? longRel(new Date(run.startedAt).toISOString()) : null,
    diff: chat?.diff ?? null,
    items: chatItems(lines),
    turnItems: renderEvents && !sample ? realItems : null,
    history: viewingHistory,
    historyAt: saved?.at ?? null,
    canViewHistory: !sample && !synchronized && !!saved && !history,
    viewHistory: () => setHistoryId(id),
    retryEvents: stream.retry,
    job: run?.agent === 'job' ? { results: deskTestResults(lines), lines, state } : null,
    logError: (!sample && stream.supported && !synchronized ? stream.state.error ?? (stream.state.phase === 'connecting' ? 'Synchronizing PC events…' : 'Reconnect to read live output.') : null) ?? commandError ?? (jobs.save.error ? readError(jobs.save.error) : jobs.start.error ? readError(jobs.start.error) : !sample && log.error ? readError(log.error) : !sample && !link.calls ? `${link.name} is not on this network — its words show here when it is` : null),
    /** The approval it is waiting on, until it is answered. */
    approval: asked && !decision ? asked : null,
    /** A real run stopped on something, before approvals reach the phone. */
    waitingAtPc: !sample && state === 'waiting',
    decided: decision ? DECIDED[decision] : null,
    /** Amber while it carries on, grey when it was told no. */
    decidedTone: decision === 'deny' ? ('denied' as const) : ('allowed' as const),
    /** Under your bubble: who said it, and from where. */
    youCaption: (run ?? (viewingHistory ? saved.runs.find((row) => row.id === id) : null))?.origin === 'pc' ? 'you · at the pc' : 'you · from your phone',
    decide: (next: Decision) => setDecision(next),
    canStop: !!link.calls && (!stream.supported || synchronized) && !!run && isLiveRun(run) && run.origin === 'phone',
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
      disabledReason: canRunCommand || canSaveCommand ? null : jobs.start.isPending || jobs.save.isPending ? 'asking the pc…' : '$command starts a job; /save-command name = npm:task saves a chain. Agent messages come with W9.',
      onSend: () => {
        setCommandError(null);
        if (canSaveCommand) {
          try {
            const additions = parseCommandSettings(saveText!);
            const commands = [...(projectCommands!.overrides ?? []).filter((old) => !additions.some((next) => next.id === old.id)), ...additions];
            jobs.save.mutate({ projectId: projectId!, commands }, { onSuccess: () => { setDraft(''); say('commands saved on the pc'); } });
          } catch (error) { setCommandError(readError(error)); }
        } else if (canRunCommand) jobs.start.mutate({ projectId: projectId!, command: command! }, { onSuccess: () => { setDraft(''); say('job started on the pc'); } });
      },
      modelLabel: agentLabel(run?.agent ?? (sample?.meta.includes('codex') ? 'codex' : 'claude')),
      finished: !canRunCommand && !canSaveCommand && (state === 'done' || state === 'failed' || state === 'stopped'),
      sampleModels: sample ? SAMPLE_COMPOSER_MODELS : undefined,
      keys,
    },
  };
}

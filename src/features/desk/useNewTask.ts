import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { agentPrompt, agentPromptMany } from '@/lib/agentPrompt';
import { deskFolders } from '@/lib/deskFolders';
import type { DeskAgent } from '@/lib/deskProtocol';
import { startingAgent } from '@/lib/deskSettings';
import { deskStartFrom, offeredAgents } from '@/lib/deskStart';
import { modeHint, taskBlocker, taskStarts, type DeskMode, type DeskSplit, type DeskWhere } from '@/lib/deskTask';
import { kindMeta } from '@/lib/kinds';
import { useDeskHandoff } from '@/store/deskHandoff';
import { useDeskPrefs } from '@/store/deskPrefs';

import { useDeskKeys } from './useDeskKeys';
import { useDeskLink } from './useDeskLink';
import { useDeskRuns } from './useDeskRuns';
import { useDeskStart } from './useDeskStart';
import { useDeskCommands } from './useDeskCommands';
import { leadingCommand } from '@/lib/deskCommands';
import { readError } from '@/lib/utils';
import { repoKey } from '@/lib/repoLink';
import { useDeskWorktrees } from './useDeskWorktrees';

/**
 * The new-task screen (`NewTask.dc.html`): what you say, the project it works
 * in, where, which agent and how much it may do, and the thoughts it picks up.
 *
 * Sends complete choices and all attachment IDs through the durable task protocol.
 * The host refuses unsupported worktrees or modes before claiming or launching.
 */
export function useNewTask(entryIds: string[], onSent: () => void) {
  const link = useDeskLink();
  const runs = useDeskRuns(link, { watch: false });
  const { projects, groups, entries } = useCellar();
  const { say } = useToast();
  const jobs = useDeskCommands();
  const worktrees = useDeskWorktrees();
  const commandsProject = useDeskPrefs((state) => state.commandsProject);

  const folders = useMemo(() => deskFolders(projects, groups), [projects, groups]);
  // Thoughts handed in — from an entry's start on pc, or held on a project and
  // handed off together — and which of them are still attached.
  const [attachedIds, setAttachedIds] = useState(entryIds);
  const [split, setSplit] = useState<DeskSplit>('one');
  const handed = useMemo(
    () => entryIds.map((id) => entries.find((candidate) => candidate.id === id)).filter((found) => !!found),
    [entryIds, entries],
  );
  const attached = handed.filter((candidate) => attachedIds.includes(candidate.id));
  const entry = handed[0] ?? null;

  // Words handed off from the desktop's capture bar, taken once.
  const [text, setText] = useState(() => useDeskHandoff.getState().text);
  useEffect(() => useDeskHandoff.getState().clear(), []);
  const [picked, setPicked] = useState<string | null>(null);
  const [where, setWhere] = useState<DeskWhere>('worktree');
  // Started from the defaults in settings › desk; the agent falls back to one
  // the pc actually has.
  const [chosen, setAgent] = useState<DeskAgent>(() => useDeskPrefs.getState().defaultAgent);
  const [mode, setMode] = useState<DeskMode>(() => useDeskPrefs.getState().defaultMode);
  const installed = link.info
    ? link.info.agents.filter((candidate) => candidate.installed).map((candidate) => candidate.id)
    : (link.desk?.agents ?? null);
  const offered = offeredAgents(installed);
  const agent = startingAgent(chosen, offered);

  // An attached thought brings its project with it, until you pick another.
  const projectId = picked ?? entry?.projectId ?? commandsProject ?? null;
  const folder = folders.find((candidate) => candidate.projectId === projectId) ?? null;
  const projectName = projects.find((candidate) => candidate.id === entry?.projectId)?.name;
  const projectCommands = jobs.projects.find((project) => project.id === projectId || (!!folder && repoKey(project.cwd) === repoKey(folder.path)));
  const keys = useDeskKeys(text, setText, agent, projectCommands?.commands.map((command) => command.id), { link, projectId });
  const starts = taskStarts({
    typed: text,
    picks: attached.map((thought) => ({ entryId: thought.id, line: agentPrompt(thought, projectName) })),
    together: agentPromptMany(attached, projectName),
    split,
  });
  const prompt = starts[0].prompt;

  const starting = useDeskStart(link, runs, () => {
    say(`sent to ${link.name}${link.via === 'cellar' ? ' through the cellar' : ''}`);
    onSent();
  });

  const workspace = worktrees.projects.find((project) => project.projectId === projectId);
  const worktreeReason = worktrees.error ?? (worktrees.loading ? 'Checking project Git support…' : workspace?.reason
    ?? (!workspace?.available ? 'Select a linked Git project; worktrees require local main.' : null));
  const blocker = starting.pending ? (starting.busy ? `checking ${link.name}…` : null) : (where === 'worktree' ? worktreeReason : null) ?? taskBlocker({
    prompt,
    hasFolder: folder !== null,
    canStart: link.can.start,
    host: link.name,
    busy: starting.busy || jobs.start.isPending,
  });

  const send = () => {
    if (starting.pending) { starting.resume(); return; }
    if (blocker || !folder) return;
    const command = leadingCommand(text);
    if (command) {
      if (text.trim() !== `$${command}` || attached.length) {
        say('send a command by itself; attach thoughts to an agent task');
        return;
      }
      jobs.start.mutate({ projectId: projectCommands?.id ?? folder.projectId, command }, { onSuccess: () => { say(`job started on ${link.name}`); onSent(); } });
      return;
    }
    const built = starts.map((one) => deskStartFrom({ prompt: one.prompt, repoPath: folder.path, agent, entryId: one.entryId,
      projectId: folder.projectId, where, mode, entryIds: split === 'each' && one.entryId ? [one.entryId] : attached.map((entry) => entry.id) }));
    const ready = built.flatMap((one) => (one.ok ? [one.start] : []));
    if (ready.length === built.length) starting.begin(ready);
  };

  return {
    host: link.name,
    online: link.can.start,
    text,
    onText: setText,
    keys,
    projects: folders.map((candidate) => ({ id: candidate.projectId, name: candidate.name })),
    projectId,
    onProject: (id: string) => setPicked(id),
    where,
    worktreeReason,
    onWhere: setWhere,
    folder: folder?.path ?? null,
    agents: offered,
    agent,
    onAgent: setAgent,
    mode,
    onMode: setMode,
    modeHint: modeHint(mode),
    attached: attached.map((thought) => ({ id: thought.id, text: thought.text, kind: thought.kind, kindLabel: kindMeta(thought.kind).label })),
    onDetach: (id: string) => setAttachedIds((now) => now.filter((candidate) => candidate !== id)),
    /** Only asked when there is more than one thought to split. */
    split: attached.length > 1 ? split : null,
    onSplit: setSplit,
    send,
    sendLabel: starting.pending ? 'recover pending task' : starts.length > 1 ? `send ${starts.length} runs to ${link.name}` : `send to ${link.name}`,
    blocker,
    busy: starting.busy || jobs.start.isPending,
    error: starting.error ?? (jobs.start.error ? readError(jobs.start.error) : null),
    untrusted: starting.untrusted,
    trusting: starting.trusting,
    onTrust: starting.trustAndStart,
    pendingHint: starting.pending ? (starting.failed ? 'PC confirmed this task did not start. Retry saved choices, or edit the unstarted remainder.' : 'Saved task awaiting confirmation. Recover uses its original choices.') : null,
    onEditFailed: starting.failed && !starting.busy ? () => {
      const remaining = starting.discardFailed();
      if (remaining) setAttachedIds([...new Set(remaining.flatMap((task) => task.entryIds ?? []))]);
    } : null,
  };
}

export type NewTask = ReturnType<typeof useNewTask>;

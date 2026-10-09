import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { agentPrompt, agentPromptMany } from '@/lib/agentPrompt';
import { deskFolders } from '@/lib/deskFolders';
import type { DeskAgent } from '@/lib/deskProtocol';
import { deskStartFrom, offeredAgents } from '@/lib/deskStart';
import { DEFAULT_MODE, modeHint, taskBlocker, taskStarts, type DeskMode, type DeskSplit, type DeskWhere } from '@/lib/deskTask';
import { kindMeta } from '@/lib/kinds';
import { useDeskHandoff } from '@/store/deskHandoff';

import { useDeskKeys } from './useDeskKeys';
import { useDeskLink } from './useDeskLink';
import { useDeskRuns } from './useDeskRuns';
import { useDeskStart } from './useDeskStart';

/**
 * The new-task screen (`NewTask.dc.html`): what you say, the project it works
 * in, where, which agent and how much it may do, and the thoughts it picks up.
 *
 * Sends through the same start the desk already has. Two of the choices are
 * drawn ahead of the pc understanding them (docs/desk/TASKS.md): "new worktree"
 * waits for W5 and the mode for W8 — until then a run goes in the checkout, in
 * the agent's own auto mode, and the screen says so rather than pretending.
 */
export function useNewTask(entryIds: string[], onSent: () => void) {
  const link = useDeskLink();
  const runs = useDeskRuns(link, { watch: false });
  const { projects, groups, entries } = useCellar();
  const { say } = useToast();

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
  const [where, setWhere] = useState<DeskWhere>('main');
  const [agent, setAgent] = useState<DeskAgent>('claude');
  const [mode, setMode] = useState<DeskMode>(DEFAULT_MODE);

  // An attached thought brings its project with it, until you pick another.
  const projectId = picked ?? entry?.projectId ?? null;
  const folder = folders.find((candidate) => candidate.projectId === projectId) ?? null;
  const projectName = projects.find((candidate) => candidate.id === entry?.projectId)?.name;
  const keys = useDeskKeys(text, setText, agent);
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

  const installed = link.info
    ? link.info.agents.filter((candidate) => candidate.installed).map((candidate) => candidate.id)
    : (link.desk?.agents ?? null);

  const blocker = taskBlocker({
    prompt,
    hasFolder: folder !== null,
    canStart: link.can.start,
    host: link.name,
    busy: starting.busy,
  });

  const send = () => {
    if (blocker || !folder) return;
    const built = starts.map((one) => deskStartFrom({ prompt: one.prompt, repoPath: folder.path, agent, entryId: one.entryId }));
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
    onWhere: setWhere,
    folder: folder?.path ?? null,
    agents: offeredAgents(installed),
    agent,
    onAgent: setAgent,
    mode,
    onMode: setMode,
    modeHint: modeHint(mode),
    attached: attached.map((thought) => ({ id: thought.id, text: thought.text, kind: kindMeta(thought.kind).label })),
    onDetach: (id: string) => setAttachedIds((now) => now.filter((candidate) => candidate !== id)),
    /** Only asked when there is more than one thought to split. */
    split: attached.length > 1 ? split : null,
    onSplit: setSplit,
    send,
    sendLabel: starts.length > 1 ? `send ${starts.length} runs to ${link.name}` : `send to ${link.name}`,
    blocker,
    busy: starting.busy,
    error: starting.error,
    untrusted: starting.untrusted,
    trusting: starting.trusting,
    onTrust: starting.trustAndStart,
  };
}

export type NewTask = ReturnType<typeof useNewTask>;

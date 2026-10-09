import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { agentPrompt } from '@/lib/agentPrompt';
import { deskFolders } from '@/lib/deskFolders';
import type { DeskAgent } from '@/lib/deskProtocol';
import { deskStartFrom, offeredAgents } from '@/lib/deskStart';
import { DEFAULT_MODE, modeHint, taskBlocker, taskPrompt, type DeskMode, type DeskWhere } from '@/lib/deskTask';
import { kindMeta } from '@/lib/kinds';

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
export function useNewTask(entryId: string | null, onSent: () => void) {
  const link = useDeskLink();
  const runs = useDeskRuns(link, { watch: false });
  const { projects, groups, entries } = useCellar();
  const { say } = useToast();

  const entry = entryId ? (entries.find((candidate) => candidate.id === entryId) ?? null) : null;
  const folders = useMemo(() => deskFolders(projects, groups), [projects, groups]);

  const [text, setText] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const [where, setWhere] = useState<DeskWhere>('main');
  const [agent, setAgent] = useState<DeskAgent>('claude');
  const [mode, setMode] = useState<DeskMode>(DEFAULT_MODE);
  const [attached, setAttached] = useState(entry !== null);

  // An attached thought brings its project with it, until you pick another.
  const projectId = picked ?? entry?.projectId ?? null;
  const folder = folders.find((candidate) => candidate.projectId === projectId) ?? null;
  const pickUps = attached && entry ? [agentPrompt(entry, projects.find((p) => p.id === entry.projectId)?.name)] : [];
  const prompt = taskPrompt(text, pickUps);

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
    const built = deskStartFrom({ prompt, repoPath: folder.path, agent, entryId: attached ? entryId : null });
    if (built.ok) starting.begin(built.start);
  };

  return {
    host: link.name,
    online: link.can.start,
    text,
    onText: setText,
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
    attached:
      attached && entry
        ? { text: entry.text, kind: kindMeta(entry.kind).label, onDetach: () => setAttached(false) }
        : null,
    send,
    blocker,
    busy: starting.busy,
    error: starting.error,
    untrusted: starting.untrusted,
    trusting: starting.trusting,
    onTrust: starting.trustAndStart,
  };
}

export type NewTask = ReturnType<typeof useNewTask>;

import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { waitingOnYou } from '@/lib/agentWork';
import { approvalNote, questionNote, runNote, type NoteView } from '@/lib/deskNotify';
import { SAMPLE_CHATS, SAMPLE_NOTES, SAMPLE_QUESTION } from '@/lib/deskSample';
import { pendingQuestions } from '@/lib/entryQuestions';
import { useDeskPrefs } from '@/store/deskPrefs';

import { useDeskLink } from './useDeskLink';
import { useDeskRunCards } from './useDeskRunCards';
import { useDeskRuns } from './useDeskRuns';

/**
 * Notification previews (`PhoneNotify.dc.html`): what the shade will show,
 * drawn in the app ahead of real notifications (docs/desk/TASKS.md W13).
 *
 * Real notes come from real things — a run going on the pc, a question an
 * agent left on a thought — and their buttons open them. The sample desk adds
 * the ones with no source yet, and answers them here, locally.
 */
export function useDeskNotify() {
  const router = useRouter();
  const link = useDeskLink();
  const runs = useDeskRuns(link);
  const cards = useDeskRunCards(runs.runs);
  const { entries, projects } = useCellar();
  const sample = useDeskPrefs((state) => state.sample);
  const { say } = useToast();
  const [done, setDone] = useState<Record<string, string>>({});

  const notes = useMemo(() => {
    const live = cards
      .filter((card) => card.state === 'running')
      .map((card) =>
        runNote({
          id: card.id,
          title: card.title,
          host: link.name,
          doing: card.detail,
          plan: card.id === 'sample-2' ? { at: 3, of: 5 } : null,
          stoppable: card.stoppable,
        }),
      );
    const waiting = waitingOnYou(entries).flatMap((entry) =>
      pendingQuestions(entry.questions).slice(0, 1).map((question) =>
        questionNote({
          id: question.id,
          agent: question.agent,
          where: projects.find((project) => project.id === entry.projectId)?.name ?? 'inbox',
          question: question.question,
          options: question.options,
        }),
      ),
    );
    const asked = SAMPLE_CHATS['sample-1'].approval!;
    const extra: NoteView[] = sample
      ? [
          approvalNote({ id: 'sample-1', agent: 'codex', what: asked.what, subject: asked.subject, where: asked.effect }),
          questionNote(SAMPLE_QUESTION),
          ...SAMPLE_NOTES,
        ]
      : [];
    return [...live, ...waiting.slice(0, 2), ...extra];
  }, [cards, entries, projects, sample, link.name]);

  return {
    notes: notes.map((note) => ({ note, done: done[note.id] ?? null })),
    /** A real note opens what it is about; a sample one answers itself. */
    onAction: (note: NoteView, actionId: string, label: string) => {
      const [kind, id] = [note.id.split(':')[0], note.id.slice(note.id.indexOf(':') + 1)];
      if (!id.startsWith('sample') && kind === 'run') {
        router.push(`/desk/run/${id}` as Href);
        return;
      }
      if (!id.startsWith('sample') && kind === 'question') {
        const entry = entries.find((candidate) => candidate.questions.some((question) => question.id === id));
        if (entry) router.push(`/entry/${entry.id}` as Href);
        say('answering from the notification itself comes later — it opens the thought for now');
        return;
      }
      setDone((now) => ({ ...now, [note.id]: actionId === 'more' ? 'opens the rest in the app' : `you picked ${label}` }));
    },
    empty: notes.length === 0 ? 'nothing is going on the pc or waiting on you — turn on the sample desk to see every kind' : null,
  };
}

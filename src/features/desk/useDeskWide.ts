import { useRouter, type Href } from 'expo-router';
import { useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar, useCellarWrites } from '@/features/cellar/useCellar';
import { waitingOnYou } from '@/lib/agentWork';
import { deskToday } from '@/lib/deskHome';
import type { DeskRunCard, DeskRunSections } from '@/lib/deskView';
import { SAMPLE_CHATS, SAMPLE_RUNS } from '@/lib/deskSample';
import { plan } from '@/lib/dump';
import { readError } from '@/lib/utils';
import { useCellarPrefs } from '@/store/cellarPrefs';
import { useDeskHandoff } from '@/store/deskHandoff';
import { useDeskPrefs } from '@/store/deskPrefs';

import type { useDeskScreen } from './useDeskScreen';
import { useDeskStatus } from './DeskStatusProvider';
import { useDeskStream } from './useDeskStream';
import { pendingApproval } from '@/lib/deskApprovals';
import { useApprovalPending } from '@/store/deskApprovals';

type Decision = 'allow' | 'deny';

/**
 * What only the wide desk has (`DeskHome.dc.html`): the capture bar, waiting
 * on you answered inline, today's figures and stop all.
 *
 * Enter files the thought in the inbox, the way the dump does; shift+enter
 * hands it to the new task screen with the words already in it. Runtime
 * approvals use the synchronized host feed; a blocked thought opens its question.
 */
export function useDeskWide(screen: ReturnType<typeof useDeskScreen>, sections: DeskRunSections<DeskRunCard>) {
  const router = useRouter();
  const { entries } = useCellar();
  const { counts, link } = useDeskStatus();
  const stream = useDeskStream(link);
  const pendingAnswers = useApprovalPending((state) => state.pending);
  const approvals = stream.live && link.info?.approvalProtocol === 1 ? (stream.state.approvals ?? []).filter((row) => pendingApproval(row)
    || !!pendingAnswers[`${link.ownerId}:${link.info?.id ?? link.pair?.id}:${row.id}`]) : [];
  const { drop } = useCellarWrites();
  const { say } = useToast();
  const kind = useCellarPrefs((state) => state.draftKind);
  const sample = useDeskPrefs((state) => state.sample);
  const hand = useDeskHandoff((state) => state.hand);
  const [text, setText] = useState('');
  const [decided, setDecided] = useState<Record<string, Decision>>({});

  const asks = useMemo(
    () =>
      sample
        ? SAMPLE_RUNS.filter((run) => SAMPLE_CHATS[run.id]?.approval && !decided[run.id]).map((run) => ({
            id: run.id,
            title: run.title,
            detail: `sample · wants to ${SAMPLE_CHATS[run.id].approval!.what}: ${SAMPLE_CHATS[run.id].approval!.subject}`,
          }))
        : [],
    [sample, decided],
  );

  const thoughts = useMemo(
    () => counts.waiting === null ? [] : waitingOnYou(entries).map((entry) => ({ id: entry.id, title: entry.text, detail: 'an agent asked about this' })),
    [entries, counts.waiting],
  );

  const stoppable = screen.runs.runs.filter((run) => run.origin === 'phone' && (run.state === 'running' || run.state === 'waiting'));

  return {
    capture: {
      text,
      onText: setText,
      busy: drop.isPending,
      onFile: () => {
        const filed = plan({ text, kind, projectId: null, raw: false }, null);
        if (filed.empty) return;
        drop.mutate(
          filed.drops.map((entry) => ({ ...entry, kind, projectId: null })),
          {
            onSuccess: () => {
              setText('');
              say('filed in the inbox');
            },
            onError: (error) => say(readError(error)),
          },
        );
      },
      onHandoff: () => {
        if (!text.trim()) return;
        hand(text.trim());
        router.push('/desk/new' as Href);
        setText('');
      },
    },
    asks,
    approvals,
    /** The runs, less the approvals already answerable above them. */
    sections: { ...sections, waiting: sections.waiting.filter((run) => !asks.some((ask) => ask.id === run.id)) },
    onDecide: (id: string, decision: Decision) => {
      setDecided((now) => ({ ...now, [id]: decision }));
      say(decision === 'allow' ? 'allowed — sample run' : 'denied — sample run');
    },
    thoughts,
    openThought: (id: string) => router.push(`/entry/${id}` as Href),
    today: deskToday(
      entries.map((entry) => entry.createdAt),
      screen.runs.runs,
    ),
    /** Every run this desk started that is still going; sessions opened at the pc are the pc's. */
    stopAll: stoppable.length > 0 ? () => stoppable.forEach((run) => screen.stop(run)) : null,
  };
}

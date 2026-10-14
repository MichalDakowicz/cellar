import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar, useCellarWrites } from '@/features/cellar/useCellar';
import { guessKind } from '@/lib/deskLater';
import { plan } from '@/lib/dump';
import { readError } from '@/lib/utils';
import { useDeskHandoff } from '@/store/deskHandoff';
import type { Kind } from '@/types/cellar';
import { useSharedCapture } from '@/store/sharedCapture';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fileSharedDraft } from '@/features/capture/sharedApi';
import { ENTRIES_KEY } from '@/lib/cellarKeys';

/**
 * "File it into cellar" (`PhoneShare.dc.html`): the words, the kind guessed
 * from them until you pick one, the project, and whether it goes straight to
 * an agent. Filing is real; arriving here from another app's share sheet waits
 * for Android's text/link share target (docs/desk/TASKS.md W18).
 */
export function useDeskShare() {
  const router = useRouter();
  const { projects } = useCellar();
  const { drop } = useCellarWrites();
  const hand = useDeskHandoff((state) => state.hand);
  const { say } = useToast();
  const owner = useAuth().user?.id ?? '';
  const pending = useSharedCapture((state) => state.pending[owner]?.[0]);
  const [localText, setText] = useState('');
  const [localPicked, setPicked] = useState<Kind | null>(null);
  const [localProject, setProjectId] = useState<string | null>(null);
  const [localHandoff, setHandoff] = useState(false);
  const text = pending?.text ?? localText; const picked = pending ? pending.picked : localPicked;
  const projectId = pending ? pending.projectId : localProject; const handoff = pending?.handoff ?? localHandoff;
  const client = useQueryClient();
  const shared = useMutation({ mutationFn: async () => { const draft = useSharedCapture.getState().submit(owner); await fileSharedDraft(owner, draft.submission!); return draft; },
    onSuccess: (draft) => { useSharedCapture.getState().consume(owner, draft.id); void client.invalidateQueries({ queryKey: ENTRIES_KEY }); complete(draft.text, draft.projectId, draft.handoff); },
    onError: (error) => say(readError(error)),
  });
  function complete(text: string, projectId: string | null, handoff: boolean) {
    say(projectId ? 'filed' : 'filed in the inbox');
    if (handoff) { hand(text.trim()); router.replace('/desk/new' as Href); }
    else if (router.canGoBack()) router.back();
    else { setText(''); setPicked(null); }
  }

  const kind = picked ?? guessKind(text);
  const filed = plan({ text, kind, projectId, raw: false }, null);

  return {
    text,
    filingPending: !!pending?.submission,
    onText: (text: string) => { if (pending) useSharedCapture.getState().edit(owner, { text }); else setText(text); },
    kind,
    guessed: picked === null,
    onKind: (next: string) => { if (pending) useSharedCapture.getState().edit(owner, { picked: next as Kind }); else setPicked(next as Kind); },
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
    projectId,
    onProject: (projectId: string | null) => { if (pending) useSharedCapture.getState().edit(owner, { projectId }); else setProjectId(projectId); },
    handoff,
    onHandoff: (handoff: boolean) => { if (pending) useSharedCapture.getState().edit(owner, { handoff }); else setHandoff(handoff); },
    busy: drop.isPending || shared.isPending,
    canFile: !filed.empty && !drop.isPending && !shared.isPending,
    label: pending?.submission ? 'confirm original filing' : handoff ? 'file it and hand it off' : 'file it',
    file: () => {
      if (filed.empty) return;
      if (pending) { shared.mutate(); return; }
      drop.mutate(
        filed.drops.map((entry) => ({ ...entry, kind, projectId })),
        {
          onSuccess: () => {
            complete(text, projectId, handoff);
          },
          onError: (error) => say(readError(error)),
        },
      );
    },
  };
}

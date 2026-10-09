import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar, useCellarWrites } from '@/features/cellar/useCellar';
import { guessKind } from '@/lib/deskLater';
import { plan } from '@/lib/dump';
import { readError } from '@/lib/utils';
import { useDeskHandoff } from '@/store/deskHandoff';
import type { Kind } from '@/types/cellar';

/**
 * "File it into cellar" (`PhoneShare.dc.html`): the words, the kind guessed
 * from them until you pick one, the project, and whether it goes straight to
 * an agent. Filing is real; arriving here from another app's share sheet waits
 * for cellar to be a share target (docs/desk/TASKS.md W17).
 */
export function useDeskShare() {
  const router = useRouter();
  const { projects } = useCellar();
  const { drop } = useCellarWrites();
  const hand = useDeskHandoff((state) => state.hand);
  const { say } = useToast();
  const [text, setText] = useState('');
  const [picked, setPicked] = useState<Kind | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [handoff, setHandoff] = useState(false);

  const kind = picked ?? guessKind(text);
  const filed = plan({ text, kind, projectId, raw: false }, null);

  return {
    text,
    onText: setText,
    kind,
    guessed: picked === null,
    onKind: (next: string) => setPicked(next as Kind),
    projects: projects.map((project) => ({ id: project.id, name: project.name })),
    projectId,
    onProject: setProjectId,
    handoff,
    onHandoff: setHandoff,
    busy: drop.isPending,
    canFile: !filed.empty && !drop.isPending,
    label: handoff ? 'file it and hand it off' : 'file it',
    file: () => {
      if (filed.empty) return;
      drop.mutate(
        filed.drops.map((entry) => ({ ...entry, kind, projectId })),
        {
          onSuccess: () => {
            say(projectId ? 'filed' : 'filed in the inbox');
            if (handoff) {
              hand(text.trim());
              router.replace('/desk/new' as Href);
            } else {
              setText('');
              setPicked(null);
            }
          },
          onError: (error) => say(readError(error)),
        },
      );
    },
  };
}

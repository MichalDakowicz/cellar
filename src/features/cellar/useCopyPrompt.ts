import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { agentPrompt } from '@/lib/agentPrompt';
import type { Entry } from '@/types/cellar';

/**
 * Copies the one line that starts a thought in an agent.
 *
 * One hook rather than a handler per screen, because the copy button is on
 * every list in the app and the string it produces has to be identical from all
 * of them — a prompt that names the project in one place and not another is two
 * behaviours wearing one icon.
 *
 * The project name is resolved here rather than passed in: every screen already
 * has `useCellar`, and the inbox and search span projects, so the caller would
 * have to build the same lookup anyway.
 */
export function useCopyPrompt() {
  const { projects } = useCellar();
  const { say } = useToast();

  return useCallback(
    (entry: Entry) => {
      const project = entry.projectId
        ? (projects.find((candidate) => candidate.id === entry.projectId)?.name ?? null)
        : null;
      void Clipboard.setStringAsync(agentPrompt(entry, project));
      say('copied — paste it into an agent');
    },
    [projects, say],
  );
}

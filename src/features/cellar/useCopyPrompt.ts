import * as Clipboard from 'expo-clipboard';
import { useCallback } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellar } from '@/features/cellar/useCellar';
import { agentPrompt, projectPrompt } from '@/lib/agentPrompt';
import type { Entry, Project } from '@/types/cellar';

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

/**
 * The same act one level up: hand over a whole project rather than one thought
 * in it.
 *
 * Its own hook rather than a second return value, because every screen in the
 * app copies entries and exactly one copies a project — folding it into
 * `useCopyPrompt` would put a projects lookup behind every list in the app for
 * one caller.
 */
export function useCopyProjectPrompt() {
  const { say } = useToast();

  return useCallback(
    (project: Pick<Project, 'id' | 'name'>) => {
      void Clipboard.setStringAsync(projectPrompt(project));
      say('copied — paste it into an agent');
    },
    [say],
  );
}

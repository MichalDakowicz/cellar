import { useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { formatCommandSettings, parseCommandSettings } from '@/lib/deskCommands';
import { readError } from '@/lib/utils';

import { useDeskCommands } from './useDeskCommands';

export function useCommandSettings() {
  const commands = useDeskCommands();
  const { say } = useToast();
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ projectId: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const project = commands.projects.find((candidate) => candidate.id === picked) ?? commands.projects[0] ?? null;
  const text = draft?.projectId === project?.id ? draft!.text : formatCommandSettings(project?.overrides ?? []);
  return {
    projects: commands.projects, project, text,
    onProject: (id: string) => { setPicked(id); setDraft(null); setError(null); },
    onText: (value: string) => { if (project) setDraft({ projectId: project.id, text: value }); setError(null); },
    busy: commands.save.isPending,
    status: error ?? (commands.save.error ? readError(commands.save.error) : commands.error) ?? (commands.loading ? 'reading project commands…' : null),
    retry: commands.retry,
    save: () => {
      if (!project || commands.save.isPending) return;
      try {
        const definitions = parseCommandSettings(text);
        commands.save.mutate({ projectId: project.id, commands: definitions }, { onSuccess: () => say('commands saved on the pc') });
      } catch (failure) { setError(readError(failure)); }
    },
  };
}

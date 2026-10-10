import { SAMPLE_PROJECT_DESK, type DeskPanelRow } from '@/lib/deskSample';
import { repoPathLabel } from '@/lib/repoLink';
import { useDeskPrefs } from '@/store/deskPrefs';
import { useDeskStatus } from './DeskStatusProvider';

/**
 * The project board's desk panel (`DeskProjects.dc.html`). Worktrees, previews
 * and the last command runs need the pc to track them (docs/desk/TASKS.md W5,
 * W11, W2), so a real project shows only its checkout and says so; the sample
 * desk shows the whole panel.
 */
export function useProjectDesk(repoPath: string | null): { sections: { title: string; rows: DeskPanelRow[] }[]; note: string | null } {
  const sample = useDeskPrefs((state) => state.sample);
  const { runs } = useDeskStatus();
  const jobs = runs.runs.filter((run) => run.agent === 'job' && run.cwd.replace(/\\/g, '/').toLowerCase() === repoPath?.replace(/\\/g, '/').toLowerCase()).slice(0, 5);
  if (sample) return { sections: SAMPLE_PROJECT_DESK, note: null };
  const folder = repoPathLabel(repoPath);
  return {
    sections: folder ? [{ title: 'worktrees', rows: [{ label: 'main', detail: folder, state: null }] }, ...(jobs.length ? [{ title: 'last command jobs', rows: jobs.map((job) => ({ label: job.name, detail: job.state, state: null })) }] : [])] : [],
    note: 'other worktrees, previews and what shipped show here once the pc tracks them',
  };
}

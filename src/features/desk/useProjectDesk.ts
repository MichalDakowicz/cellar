import { SAMPLE_PROJECT_DESK, type DeskPanelRow } from '@/lib/deskSample';
import { repoPathLabel } from '@/lib/repoLink';
import { useDeskPrefs } from '@/store/deskPrefs';
import { useDeskStatus } from './DeskStatusProvider';
import { useDeskWorktrees } from './useDeskWorktrees';

/**
 * The project board's desk panel (`DeskProjects.dc.html`). Worktrees, previews
 * and last command jobs read the PC. Previews/shipped remain W11; samples stay
 * explicitly labelled and never fill a failed real read.
 */
export function useProjectDesk(repoPath: string | null, projectId?: string): { sections: { title: string; rows: DeskPanelRow[] }[]; note: string | null; retry?: () => void } {
  const sample = useDeskPrefs((state) => state.sample);
  const { runs, link } = useDeskStatus();
  const trees = useDeskWorktrees();
  const jobs = runs.runs.filter((run) => run.agent === 'job' && run.cwd.replace(/\\/g, '/').toLowerCase() === repoPath?.replace(/\\/g, '/').toLowerCase()).slice(0, 5);
  if (sample) return { sections: SAMPLE_PROJECT_DESK, note: 'sample desk' };
  const folder = repoPathLabel(repoPath);
  const project = trees.projects.find((row) => row.projectId === projectId);
  return {
    sections: folder && link.calls ? [...(project?.available ? [{ title: 'worktrees', rows: project.worktrees.map((row) => ({
      label: `${row.branch ?? 'detached'}${row.kept ? ' · kept' : ''}`, detail: `${row.path}${row.unavailable ? ' · unavailable' : row.dirty ? ' · local changes' : ''}${row.locked ? ' · locked' : ''}`, state: null })) }] : []),
      ...(jobs.length && runs.available ? [{ title: 'last command jobs', rows: jobs.map((job) => ({ label: job.name, detail: job.state, state: null })) }] : [])] : [],
    note: trees.error ?? project?.reason ?? (trees.loading ? 'Reading PC worktrees…' : !folder ? 'Link a project folder to read its worktrees.' : 'Previews and shipped history arrive with W11.'),
    retry: trees.error ? trees.retry : undefined,
  };
}

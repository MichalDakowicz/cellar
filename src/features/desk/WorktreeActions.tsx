import { useWorktreeAction } from './useWorktreeAction';
import { WorktreeControl } from '@/components/desk/WorktreeControl';

/** Host behavior remains in the hook; phone and desktop share one confirmation surface. */
export function WorktreeActions({ id }: { id: string }) {
  return <WorktreeControl {...useWorktreeAction(id)} />;
}

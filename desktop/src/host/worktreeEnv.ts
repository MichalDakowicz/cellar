import { DeskError } from './claudeRuns.ts';

/** Windows sandbox agents use another OS account. Trust only their validated workspace. */
export function worktreeEnv(cwd: string, inherited: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const count = Number(inherited.GIT_CONFIG_COUNT ?? 0);
  if (!Number.isSafeInteger(count) || count < 0 || count > 1000) throw new DeskError('Invalid inherited GIT_CONFIG_COUNT.', 409, { notStarted: true });
  return { ...inherited, GIT_CONFIG_COUNT: String(count + 1),
    [`GIT_CONFIG_KEY_${count}`]: 'safe.directory', [`GIT_CONFIG_VALUE_${count}`]: cwd.replace(/\\/g, '/') };
}

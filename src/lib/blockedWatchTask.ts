import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import { notifyBlockedQuestions } from '@/lib/questionNotifier';
import { ENTRY_COLUMNS, normalizeEntry, normalizeProject, PROJECT_COLUMNS, type EntryRow, type ProjectRow } from '@/lib/rows';
import { supabase } from '@/lib/supabase';

// Android's WorkManager wakes the app every few hours, boots a headless JS
// context and calls this task. Registration is persisted by the OS, so it keeps
// working after a reboot without Cellar being opened.
//
// defineTask has to run at module scope: the headless launch imports the bundle
// and looks the task up by name, with no React tree involved. This module is
// imported from src/app/_layout.tsx purely to guarantee that happens.
//
// This is the entire reason Cellar can notify without FCM. A push would arrive
// in seconds; this arrives on the OS's schedule. For "an agent is waiting on an
// answer" that is a fair trade, and it costs no credentials, no edge function
// and nothing of Radar's.

export const BLOCKED_WATCH_TASK = 'cellar-blocked-watch';

/**
 * The floor Android enforces is 15 minutes, and it ignores anything under it.
 * Asking hourly rather than hourly-ish is pointless — WorkManager batches wakes
 * with whatever else the device is doing and Doze stretches them further. One
 * hour asks often enough to be useful and rarely enough to be free.
 */
const WAKEUP_INTERVAL_MINUTES = 60;

const supported = Platform.OS !== 'web';

/**
 * The query is written here rather than reused from `cellarApi` because that
 * module is the app's read boundary and pulls the whole cellar; a background
 * wake wants the blocked rows and nothing else. The normalizers are shared, so
 * a row still means the same thing.
 */
async function blockedNow() {
  const [entries, projects] = await Promise.all([
    supabase.from('cellar_entries').select(ENTRY_COLUMNS).eq('state', 'blocked').eq('archived', false),
    supabase.from('cellar_projects').select(PROJECT_COLUMNS),
  ]);
  if (entries.error) throw entries.error;
  if (projects.error) throw projects.error;

  return {
    entries: (entries.data as EntryRow[]).map(normalizeEntry),
    projects: (projects.data as ProjectRow[]).map(normalizeProject),
  };
}

if (supported) {
  TaskManager.defineTask(BLOCKED_WATCH_TASK, async () => {
    try {
      // No session on this device means nobody to notify — a signed-out install
      // must not wake up and ask the server for someone else's questions.
      const { data } = await supabase.auth.getSession();
      if (!data.session) return BackgroundTask.BackgroundTaskResult.Success;

      const { entries, projects } = await blockedNow();
      await notifyBlockedQuestions(entries, projects);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch (error) {
      console.error('Blocked-question watch failed', error);
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}

/**
 * Idempotent — re-registering an already-registered task refreshes its options,
 * so this can run on every app start.
 */
export async function registerBlockedWatchTask(): Promise<void> {
  if (!supported) return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status === BackgroundTask.BackgroundTaskStatus.Restricted) return;
    await BackgroundTask.registerTaskAsync(BLOCKED_WATCH_TASK, { minimumInterval: WAKEUP_INTERVAL_MINUTES });
  } catch (error) {
    console.warn('Could not register the blocked-question watch', error);
  }
}

export async function unregisterBlockedWatchTask(): Promise<void> {
  if (!supported) return;
  try {
    if (await TaskManager.isTaskRegisteredAsync(BLOCKED_WATCH_TASK)) {
      await BackgroundTask.unregisterTaskAsync(BLOCKED_WATCH_TASK);
    }
  } catch (error) {
    console.warn('Could not unregister the blocked-question watch', error);
  }
}

import { useEffect } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { useQuestionTaps } from '@/features/notifications/useQuestionTaps';
import { useCellar } from '@/features/cellar/useCellar';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { registerBlockedWatchTask, unregisterBlockedWatchTask } from '@/lib/blockedWatchTask';
import { ensureNotificationChannels } from '@/lib/notificationChannels';
import { supportsNotifications } from '@/lib/notificationSetup';
import { notifyBlockedQuestions } from '@/lib/questionNotifier';

/**
 * Renders nothing. Mounted from the root layout so a question raises a banner
 * whatever screen is open, rather than only on the one that remembered to look.
 *
 * Two paths, and they are the same function called from different places. In
 * the foreground the cellar is already loaded, so a question that arrived while
 * you were reading something else surfaces immediately. In the background
 * `blockedWatchTask` wakes on the OS's schedule and runs the same check against
 * its own small query. `notifyBlockedQuestions` is idempotent, which is what
 * lets the two race harmlessly.
 */
export function QuestionSync() {
  const { user } = useAuth();
  const { entries, projects } = useCellar();
  const { settings } = useCellarSettings();
  const wanted = settings.notifyQuestions;
  // The background wake carries both passes, so it stays registered while
  // either switch is on (lib/blockedWatchTask).
  const wake = settings.notifyQuestions || settings.notifyNudges;

  // Channels first and unconditionally: Android shows their names in the system
  // permission sheet, so creating them after the prompt describes nothing.
  useEffect(() => {
    if (supportsNotifications) void ensureNotificationChannels();
  }, []);

  // The OS keeps the registration across reboots, so turning the setting off
  // has to actively take it away rather than just stop re-adding it.
  useEffect(() => {
    if (!user?.id) return;
    if (wake) void registerBlockedWatchTask();
    else void unregisterBlockedWatchTask();
  }, [user?.id, wake]);

  useEffect(() => {
    if (!user?.id || !wanted || entries.length === 0) return;
    void notifyBlockedQuestions(entries, projects);
  }, [user?.id, wanted, entries, projects]);

  // Only route a tapped question once there is somebody to route it for.
  useQuestionTaps(!!user?.id);

  return null;
}

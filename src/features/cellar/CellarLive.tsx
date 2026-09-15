import { useCellarLive } from '@/features/cellar/useCellarLive';

/**
 * Renders nothing. Mounted once from the root layout, beside QuestionSync, so
 * the subscription outlives any one screen — a channel opened by the shelf
 * would close the moment you walked to stats, which is exactly when an agent
 * writes something.
 */
export function CellarLive() {
  useCellarLive();
  return null;
}

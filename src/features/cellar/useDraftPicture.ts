import { useCallback, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { pickPicture } from '@/features/cellar/pickPicture';
import type { NewPicture } from '@/lib/entryPicture';
import { readError } from '@/lib/utils';

/**
 * A picture chosen but not yet attached to anything — the capture screen's.
 *
 * Held as the text it will be stored as, so the preview and the write are the
 * same picture and a thumb is never cut twice. Like the draft text it is not
 * persisted: a picture that survives a cold start is one you will find attached
 * to a thought you no longer remember dropping.
 */
export function useDraftPicture() {
  const { say } = useToast();
  const [picture, setPicture] = useState<NewPicture | null>(null);
  const [busy, setBusy] = useState(false);

  const pick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await pickPicture();
      if (next) setPicture(next);
    } catch (error) {
      say(readError(error));
    } finally {
      setBusy(false);
    }
  }, [busy, say]);

  const clear = useCallback(() => setPicture(null), []);

  return { picture, busy, pick, clear };
}

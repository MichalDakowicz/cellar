import { useState } from 'react';

import { CLOSED_DRAFT, resolveDraft, seedDraft, type HeldDraft } from '@/lib/sheetDraft';

/**
 * The draft an edit sheet holds while it is open.
 *
 * It re-seeds from the row every time the sheet opens — on a different target
 * or on the same one again — so a rename you abandoned last time does not come
 * back as this time's draft. It does that by *deriving* during render against a
 * session key, not by writing state from an effect: setting state
 * synchronously in an effect triggers a cascading render, and on a sheet that
 * is a visible flash of the old name before the new one.
 *
 * The one write is the close. These sheets are mounted once for the life of the
 * app (`CellarSheets`) and never unmount, so without it the held key stays on
 * the last row edited and derivation has nothing to notice. It lands on the
 * closed render, where the sheet is not on screen and a second pass costs
 * nothing. The rule itself is `resolveDraft` in `src/lib/sheetDraft.ts`.
 *
 * It holds a whole field set rather than one name because a project's sheet
 * edits three things at once, and three independently seeded `useState`s go out
 * of step the moment one of them re-seeds and the others do not.
 */
export type SheetDraft<T extends Record<string, string>> = {
  values: T;
  set: (patch: Partial<T>) => void;
  /** The delete confirmation is a second sheet; this is which one is showing. */
  confirming: boolean;
  setConfirming: (confirming: boolean) => void;
};

export function useSheetDraft<T extends Record<string, string>>(
  open: boolean,
  targetId: string | null,
  initial: T,
): SheetDraft<T> {
  const [held, setHeld] = useState<HeldDraft<T>>(() => seedDraft(CLOSED_DRAFT, initial));

  const { draft, persist } = resolveDraft(held, open, targetId, initial);
  if (persist) setHeld(draft);

  return {
    values: draft.values,
    set: (patch) => setHeld({ ...draft, values: { ...draft.values, ...patch } }),
    confirming: draft.confirming,
    setConfirming: (confirming) => setHeld({ ...draft, confirming }),
  };
}

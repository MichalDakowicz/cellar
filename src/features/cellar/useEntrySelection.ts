import { useEffect, useMemo } from 'react';

import { useCopySelection } from '@/features/cellar/useCopyPrompt';
import { useHaptics } from '@/hooks/useHaptics';
import { selectedEntries } from '@/lib/entrySelection';
import { useCellarSheets } from '@/store/cellarPrefs';
import { useSelection } from '@/store/entrySelection';
import type { Entry } from '@/types/cellar';

/**
 * Holding several rows at once, and the two things that can then happen to
 * them: file them all somewhere, or copy one line that starts all of them in an
 * agent.
 *
 * A long press starts it, because a long press is the only gesture free on an
 * entry row — the tap opens the thought and the buttons at its end are taken.
 * While it is on, a tap picks and unpicks instead of opening, which is what
 * stops a mis-tap navigating away from a selection you spent six taps building.
 *
 * One hook for every list that offers it, so the gesture, the mode and both
 * actions are identical from the project, the inbox and search.
 */
export function useEntrySelection(entries: Entry[], open: (entry: Entry) => void) {
  const haptics = useHaptics();
  const ids = useSelection((state) => state.ids);
  const toggle = useSelection((state) => state.toggle);
  const clear = useSelection((state) => state.clear);
  const copySelection = useCopySelection();
  const fileMany = useCellarSheets((state) => state.fileMany);

  // Dropped when the screen that started it goes away. A selection is about
  // what is in front of you, and carrying one to another list would put an
  // invisible six rows behind the next "file it" you press.
  useEffect(() => clear, [clear]);

  const selected = useMemo(() => selectedEntries(entries, ids), [entries, ids]);
  const selectedIds = useMemo(() => new Set(ids), [ids]);
  const selecting = ids.length > 0;

  return {
    selecting,
    selectedIds,
    count: selected.length,
    clear,
    /** Hand straight to `EntryList`: picks while selecting, opens the rest of the time. */
    onPress: (entry: Entry) => (selecting ? toggle(entry.id) : open(entry)),
    onLongPress: (entry: Entry) => {
      haptics.hold();
      toggle(entry.id);
    },
    copy: () => copySelection(selected),
    file: () => fileMany?.(selected.map((entry) => entry.id)),
  };
}

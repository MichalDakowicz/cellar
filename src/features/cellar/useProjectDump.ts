import { useCallback, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { useCellarWrites } from '@/features/cellar/useCellar';
import { useDraftPicture } from '@/features/cellar/useDraftPicture';
import { useHaptics } from '@/hooks/useHaptics';
import { dumpHint, plan, shouldSubmitOnReturn } from '@/lib/dump';
import { fanOut } from '@/lib/fileTargets';
import { useCellarPrefs } from '@/store/cellarPrefs';
import type { Kind } from '@/types/cellar';

/**
 * The dump field on a project's own page.
 *
 * The same rule as the capture screen — the first line is the thought, every
 * line under it a note — but it only ever files into this project, so there is
 * no file it block and no raw mode: the raw toggle lives on the capture
 * screen's nav plate, and a mode you cannot see or flip from here would be one
 * you could only be surprised by. The kind is the same sticky pick the capture
 * screen holds, so a glitch dumped here is still the glitch you were on.
 *
 * Its text is local and never persisted, for the reason the capture screen's is
 * not (features/cellar/useDumpScreen).
 */
export function useProjectDump(projectId: string, projectName: string) {
  const { drop } = useCellarWrites();
  const haptics = useHaptics();
  const kind = useCellarPrefs((state) => state.draftKind);
  const setKind = useCellarPrefs((state) => state.setDraftKind);
  const { say } = useToast();
  const draftPicture = useDraftPicture();
  const [text, setText] = useState('');

  const draft = useMemo(() => ({ text, kind, projectId, raw: false }), [text, kind, projectId]);
  const dropPlan = useMemo(() => plan(draft, projectName), [draft, projectName]);

  const submit = useCallback(() => {
    if (dropPlan.empty || drop.isPending) return;
    // Never raw, so there is exactly one thought for the picture to be the cover of.
    const picture = draftPicture.picture ?? undefined;
    const drops = dropPlan.drops.map((entry) => (picture ? { ...entry, picture } : entry));
    void drop.mutateAsync(fanOut(drops, [projectId]).map((entry) => ({ ...entry, kind }))).then((result) => {
      haptics.drop();
      setText('');
      draftPicture.clear();
      if (result.pictureFailed) say('dropped, but the picture did not attach');
    });
  }, [dropPlan, drop, projectId, kind, draftPicture, say, haptics]);

  const onReturn = useCallback(
    (modifiers: { shift: boolean; meta: boolean }) => {
      if (!shouldSubmitOnReturn(false, modifiers)) return false;
      submit();
      return true;
    },
    [submit],
  );

  return {
    text,
    setText,
    kind,
    setKind: (next: Kind) => setKind(next),
    /** The cover for the thought being typed. Like the text, never persisted. */
    picture: {
      thumb: draftPicture.picture?.thumb ?? null,
      busy: draftPicture.busy,
      onPick: draftPicture.pick,
      onClear: draftPicture.clear,
    },
    placeholder: `dump into ${projectName}`,
    hint: dumpHint(draft),
    dropLabel: dropPlan.label,
    canDrop: !dropPlan.empty && !drop.isPending,
    submit,
    onReturn,
  };
}

import { useCallback, useMemo, useState } from 'react';

import { useToast } from '@/components/ui/Toast';
import { pickPicture } from '@/features/cellar/pickPicture';
import { usePictureData, usePicturesOf, usePictureWrites } from '@/features/cellar/usePictures';
import { aspectOf, type NewPicture, type PictureThumb, type ShownPicture } from '@/lib/entryPicture';
import { readError } from '@/lib/utils';

const shown = (picture: PictureThumb, uri: string = picture.thumb): ShownPicture => ({
  id: picture.id,
  uri,
  aspect: aspectOf(picture.width, picture.height),
});

/**
 * One thought's pictures: its cover, the pictures its notes carry, and the
 * writes and the full-size viewer around them. Derived here so the entry route
 * stays a composition (PING.md §13).
 *
 * The cover is drawn at full size once it has loaded and as its thumb until
 * then; a note's picture stays a thumb in the thread and only becomes the big
 * one when opened, so a thought with ten of them is ten small reads and one
 * large one at a time.
 */
export function useEntryGallery(entryId: string | undefined) {
  const { say } = useToast();
  const set = usePicturesOf(entryId);
  const writes = usePictureWrites();
  const [viewing, setViewing] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [picking, setPicking] = useState(false);

  const coverData = usePictureData(set.cover?.id ?? null);
  const viewingData = usePictureData(viewing);

  const lines = useMemo(() => {
    const out: Record<string, ShownPicture> = {};
    for (const [lineId, picture] of set.byLine) out[lineId] = shown(picture);
    return out;
  }, [set.byLine]);

  // Picks, cuts, and hands the picture to `write`. Every failure is said out
  // loud: a backed-out picker is `null` and silent, anything else is a toast.
  const attach = useCallback(
    async (write: (picture: NewPicture) => Promise<unknown>) => {
      if (!entryId || picking) return;
      setPicking(true);
      try {
        const picture = await pickPicture();
        if (picture) await write(picture);
      } catch (error) {
        say(readError(error));
      } finally {
        setPicking(false);
      }
    },
    [entryId, picking, say],
  );

  const viewed = viewing
    ? [set.cover, ...set.byLine.values()].find((picture) => picture?.id === viewing) ?? null
    : null;

  return {
    cover: set.cover ? shown(set.cover, coverData ?? set.cover.thumb) : null,
    lines,
    busy: picking || writes.cover.isPending || writes.note.isPending,
    /** Add a cover, or replace the one there is. */
    setCover: () => entryId && attach((picture) => writes.cover.mutateAsync({ entryId, picture })),
    /** Append a note that is only a picture. */
    addNote: () => entryId && attach((picture) => writes.note.mutateAsync({ entryId, picture })),
    hasLinePicture: (lineId: string) => set.byLine.has(lineId),
    view: (id: string) => setViewing(id),
    closeViewer: () => setViewing(null),
    /** What the viewer shows: the full size once it is read, the thumb meanwhile. */
    viewer: viewed ? { uri: viewingData ?? viewed.thumb } : null,
    removing,
    askRemoveCover: () => setRemoving(true),
    cancelRemoveCover: () => setRemoving(false),
    confirmRemoveCover: () => {
      setRemoving(false);
      if (set.cover) writes.remove.mutate(set.cover.id, { onError: (error) => say(readError(error)) });
    },
  };
}

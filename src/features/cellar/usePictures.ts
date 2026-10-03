import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { appendLine, deleteLine } from '@/features/cellar/cellarApi';
import {
  addNotePicture,
  deletePicture,
  fetchPictureData,
  fetchPictureThumbs,
  setCover,
} from '@/features/cellar/pictureApi';
import { requireUser } from '@/features/cellar/useCellar';
import { ENTRIES_KEY, PICTURES_KEY, pictureDataKey } from '@/lib/cellarKeys';
import { PICTURE_LINE, picturesOf, type NewPicture, type PictureThumb } from '@/lib/entryPicture';

const NO_THUMBS: PictureThumb[] = [];

/**
 * Every picture's thumb, once. Cut per entry by `usePicturesOf`; nothing that
 * lists thoughts reads the big pictures.
 */
export function usePictureThumbs(): PictureThumb[] {
  const query = useQuery({ queryKey: PICTURES_KEY, queryFn: fetchPictureThumbs });
  return query.data ?? NO_THUMBS;
}

/** One thought's cover and note pictures. */
export function usePicturesOf(entryId: string | undefined) {
  const thumbs = usePictureThumbs();
  return useMemo(() => picturesOf(thumbs, entryId ?? ''), [thumbs, entryId]);
}

/** The full-size picture, fetched when it is wanted and kept — it never changes. */
export function usePictureData(id: string | null) {
  const query = useQuery({
    queryKey: pictureDataKey(id ?? ''),
    queryFn: () => fetchPictureData(id as string),
    enabled: !!id,
    staleTime: Infinity,
  });
  return query.data ?? null;
}

/**
 * The writes on a picture. Each refreshes the thumbs; the note one also
 * refreshes the entries, since it appends a line.
 */
export function usePictureWrites() {
  const { user } = useAuth();
  const client = useQueryClient();
  const refresh = useCallback(() => void client.invalidateQueries({ queryKey: PICTURES_KEY }), [client]);

  const cover = useMutation({
    mutationFn: ({ entryId, picture }: { entryId: string; picture: NewPicture }) =>
      setCover(requireUser(user?.id), entryId, picture),
    onSuccess: refresh,
  });

  // The line goes in first so the picture has an id to hang off, and comes back
  // out if the picture does not land — a note that says "(picture)" with
  // nothing under it is worse than no note.
  const note = useMutation({
    mutationFn: async ({ entryId, picture }: { entryId: string; picture: NewPicture }) => {
      const userId = requireUser(user?.id);
      const line = await appendLine(userId, entryId, PICTURE_LINE);
      try {
        await addNotePicture(userId, entryId, line.id, picture);
      } catch (error) {
        await deleteLine(line.id).catch(() => undefined);
        throw error;
      }
    },
    onSuccess: () => {
      refresh();
      void client.invalidateQueries({ queryKey: ENTRIES_KEY });
    },
  });

  const remove = useMutation({ mutationFn: (id: string) => deletePicture(id), onSuccess: refresh });

  return { cover, note, remove };
}

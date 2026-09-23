import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { addDoc, removeDoc } from '@/features/cellar/docsApi';
import { ENTRIES_KEY } from '@/lib/cellarKeys';
import { docHref, docKind, docTitle, isDuplicateDoc, normalizeDocRef, type DocKind } from '@/lib/entryDocs';
import type { Entry, EntryDoc, Project } from '@/types/cellar';

export type DocRowView = EntryDoc & { kind: DocKind; title: string; href: string | null };

/**
 * The docs on one thought: the rows as the entry screen draws them, the field
 * that attaches another, and the two writes. The reading of a ref — link or
 * path, what to call it, where it opens — is `lib/entryDocs`.
 */
export function useEntryDocs(entry: Entry | null, project: Project | null) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [draft, setDraft] = useState('');

  const refresh = () => void client.invalidateQueries({ queryKey: ENTRIES_KEY });
  const add = useMutation({
    mutationFn: ({ entryId, ref }: { entryId: string; ref: string }) => {
      if (!user?.id) throw new Error('not signed in');
      return addDoc(user.id, entryId, ref);
    },
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: (id: string) => removeDoc(id), onSuccess: refresh });

  const rows = useMemo<DocRowView[]>(
    () =>
      (entry?.docs ?? []).map((doc) => ({
        ...doc,
        kind: docKind(doc.ref),
        title: docTitle(doc),
        href: docHref(doc.ref, project),
      })),
    [entry?.docs, project],
  );

  const ref = normalizeDocRef(draft);
  const duplicate = !!ref && isDuplicateDoc(ref, entry?.docs ?? []);

  return {
    rows,
    draft,
    setDraft,
    canAttach: !!ref && !duplicate && !add.isPending,
    /** Said under the field instead of attaching the same thing twice. */
    draftNote: duplicate ? 'already on this thought' : null,
    attach: () => {
      if (!entry || !ref || duplicate) return;
      setDraft('');
      add.mutate({ entryId: entry.id, ref });
    },
    detach: (doc: DocRowView) => remove.mutate(doc.id),
    open: (doc: DocRowView) => {
      if (doc.href) void Linking.openURL(doc.href).catch(() => undefined);
    },
  };
}

import { View } from 'react-native';

import { Field } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useSheetDraft } from '@/features/cellar/sheets/useSheetDraft';
import { useCellar, useCellarWrites } from '@/features/cellar/useCellar';
import {
  canDeleteShelf,
  checkName,
  deleteShelfCost,
  nameErrorText,
  shelfDeleteBlockedReason,
} from '@/lib/containers';
import { useCellarPrefs } from '@/store/cellarPrefs';

/**
 * Rename or delete a shelf.
 *
 * Deleting one cascades to its projects, and their entries fall back to the
 * inbox — the confirm says both numbers out loud before it happens. The last
 * shelf cannot go at all: capture is the home route and it files onto a shelf,
 * so a cellar with none is an app whose first screen cannot work.
 */
export function EditShelfSheet({
  open,
  shelfId,
  onClose,
}: {
  open: boolean;
  shelfId: string | null;
  onClose: () => void;
}) {
  const { shelves, projects, entries } = useCellar();
  const { editShelf, removeShelf } = useCellarWrites();
  const currentShelfId = useCellarPrefs((state) => state.shelfId);
  const setShelf = useCellarPrefs((state) => state.setShelf);
  const statsShelfId = useCellarPrefs((state) => state.statsShelfId);
  const setStatsShelf = useCellarPrefs((state) => state.setStatsShelf);

  const shelf = shelves.find((candidate) => candidate.id === shelfId) ?? null;
  const { name, setName, confirming, setConfirming } = useSheetDraft(open, shelfId, shelf?.name ?? '');

  if (!shelf) return null;

  const siblings = shelves.filter((candidate) => candidate.id !== shelf.id).map((candidate) => candidate.name);
  const error = checkName(name, siblings, shelf.name);
  const deletable = canDeleteShelf(shelves);
  const cost = deleteShelfCost(shelf.id, projects, entries);

  const save = () => {
    if (error) return;
    if (name.trim() !== shelf.name) editShelf.mutate({ id: shelf.id, name: name.trim() });
    onClose();
  };

  const destroy = () => {
    // Both prefs can be pointing at this shelf. `useCurrentShelf` falls back to
    // the first shelf on its own, but stats would silently read as an empty
    // scope rather than as every shelf.
    const fallback = shelves.find((candidate) => candidate.id !== shelf.id) ?? null;
    if (currentShelfId === shelf.id) setShelf(fallback?.id ?? null);
    if (statsShelfId === shelf.id) setStatsShelf(null);
    removeShelf.mutate(shelf.id, { onSuccess: onClose });
  };

  return (
    <>
      <SheetDialog
        open={open && !confirming}
        title="edit shelf"
        body={deletable ? undefined : shelfDeleteBlockedReason()}
        confirmLabel="save"
        dismissLabel={deletable ? 'delete it' : 'close'}
        confirmDisabledReason={nameErrorText(error, 'shelf')}
        onConfirm={save}
        onDismiss={() => (deletable ? setConfirming(true) : onClose())}
        onRequestClose={onClose}
      >
        <View className="mt-4">
          <Field
            placeholder="shelf name"
            value={name}
            onChangeText={setName}
            onSubmitEditing={save}
            error={nameErrorText(error, 'shelf')}
          />
        </View>
      </SheetDialog>

      <SheetDialog
        open={open && confirming}
        title={`delete ${shelf.name}`}
        body={cost.body}
        confirmLabel="delete the shelf"
        dismissLabel="keep it"
        tone="destructive"
        onConfirm={destroy}
        onDismiss={() => setConfirming(false)}
        onRequestClose={() => setConfirming(false)}
      />
    </>
  );
}

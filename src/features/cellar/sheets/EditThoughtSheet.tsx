import { View } from 'react-native';

import { Field } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useSheetDraft } from '@/features/cellar/sheets/useSheetDraft';
import { checkThought } from '@/lib/thoughtEdit';

/**
 * Reword the thought itself — the line at the top of an entry, never the notes
 * under it, which are a record of when you wrote them.
 *
 * The wording it replaces is not thrown away: the entry's trail keeps it
 * (`lib/entryTrail`, the `edited` move), which is what lets this sheet exist
 * without breaking the promise that a thought can be read as it was dropped.
 */
export function EditThoughtSheet({
  open,
  entryId,
  text,
  onSave,
  onClose,
}: {
  open: boolean;
  entryId: string;
  text: string;
  onSave: (text: string) => void;
  onClose: () => void;
}) {
  const { values, set } = useSheetDraft(open, entryId, { text });
  const check = checkThought(values.text, text);

  const save = () => {
    if (!check.ok) return;
    onSave(check.text);
    onClose();
  };

  return (
    <SheetDialog
      open={open}
      title="reword this thought"
      body="the way it was worded stays on the trail."
      confirmLabel="save"
      dismissLabel="cancel"
      confirmDisabledReason={check.ok ? null : check.message}
      onConfirm={save}
      onDismiss={onClose}
      onRequestClose={onClose}
    >
      <View className="mt-4">
        <Field
          multiline
          autoFocus
          placeholder="what is the thought"
          accessibilityLabel="the thought"
          value={values.text}
          onChangeText={(next) => set({ text: next })}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />
      </View>
    </SheetDialog>
  );
}

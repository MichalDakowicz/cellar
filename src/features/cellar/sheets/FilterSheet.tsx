import { View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { Overline } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { ENTRY_STATES } from '@/lib/entryState';
import { useEntryFilter } from '@/store/cellarPrefs';
import type { EntryState, Kind } from '@/types/cellar';

/** Narrows one project by kind and state. Never narrows the inbox — see SortSheet. */
export function FilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const filter = useEntryFilter((state) => state.filter);
  const setFilter = useEntryFilter((state) => state.setFilter);
  const toggleKind = useEntryFilter((state) => state.toggleKind);
  const clear = useEntryFilter((state) => state.clear);

  return (
    <SheetDialog
      open={open}
      title="filter"
      body="narrows this project. it does not narrow the inbox, which is a pile you sort rather than a list you filter."
      confirmLabel="show it"
      dismissLabel="clear"
      onConfirm={onClose}
      onDismiss={() => {
        clear();
        onClose();
      }}
      // "clear" is the secondary button here, so clicking off must not clear.
      onRequestClose={onClose}
    >
      <View className="mt-5 gap-2">
        <Overline>kind</Overline>
        <ChipWrap
          label="kind"
          options={kindChips(filter.kinds)}
          selected={filter.kinds}
          onToggle={(kind: Kind) => toggleKind(kind)}
        />
      </View>
      <View className="mt-5 gap-2">
        <Overline>state</Overline>
        <ChipWrap
          label="state"
          options={[
            { value: 'any' as const, label: 'any state' },
            ...ENTRY_STATES.map((state) => ({ value: state.value, label: state.label })),
          ]}
          selected={filter.state ?? 'any'}
          onToggle={(value) => setFilter({ ...filter, state: value === 'any' ? null : (value as EntryState) })}
        />
      </View>
    </SheetDialog>
  );
}

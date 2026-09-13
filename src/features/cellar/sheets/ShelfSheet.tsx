import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Field } from '@/components/ui/controls';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useCellar, useCellarWrites, useCurrentShelf } from '@/features/cellar/useCellar';
import { checkName, nameErrorText } from '@/lib/containers';
import { plural } from '@/lib/utils';
import { useCellarSheets } from '@/store/cellarPrefs';
import { COLORS } from '@/theme/colors';

/**
 * The shelf picker, and where a new shelf is made.
 *
 * Each row carries a pencil rather than being a long-press, because the whole
 * row is already a tap target that switches shelves — a hidden gesture on a
 * control that already does something is how you rename a shelf by accident.
 */
export function ShelfSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { shelves, projects } = useCellar();
  const { shelf, setShelf } = useCurrentShelf(shelves);
  const { addShelf } = useCellarWrites();
  const editShelf = useCellarSheets((state) => state.editShelf);
  const [name, setName] = useState('');

  const error = name.trim() ? checkName(name, shelves.map((candidate) => candidate.name)) : null;

  const create = () => {
    if (!name.trim() || error) return;
    addShelf.mutate(
      { name: name.trim(), position: shelves.length },
      {
        onSuccess: (made) => {
          setShelf(made.id);
          setName('');
          onClose();
        },
      },
    );
  };

  return (
    <SheetDialog
      open={open}
      title="shelves"
      body="the layer above projects. apps on one shelf, minecraft mods on another, whatever comes next on its own."
      confirmLabel={name.trim() ? `add ${name.trim()}` : 'done'}
      dismissLabel="close"
      confirmDisabledReason={name.trim() ? nameErrorText(error, 'shelf') : null}
      onConfirm={() => (name.trim() ? create() : onClose())}
      onDismiss={onClose}
    >
      <View className="mt-4 gap-2">
        {shelves.map((candidate) => {
          const count = projects.filter((project) => project.shelfId === candidate.id).length;
          const active = candidate.id === shelf?.id;
          return (
            <View
              key={candidate.id}
              className={[
                'flex-row items-center gap-2 rounded-xl p-3',
                active ? 'bg-neutral-800' : 'bg-neutral-900',
              ].join(' ')}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={candidate.name}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setShelf(candidate.id);
                  onClose();
                }}
                className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-80"
              >
                <Text className="min-w-0 flex-1 text-base font-bold text-foreground" numberOfLines={1}>
                  {candidate.name}
                </Text>
                <Text className="text-xs text-muted-foreground">{plural(count, 'project')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`edit ${candidate.name}`}
                hitSlop={8}
                onPress={() => {
                  onClose();
                  editShelf?.(candidate.id);
                }}
                className="h-8 w-8 items-center justify-center rounded-full active:opacity-70"
              >
                <Pencil size={15} color={COLORS.muted} strokeWidth={2} />
              </Pressable>
            </View>
          );
        })}
        <View className="mt-1">
          <Field
            placeholder="new shelf"
            value={name}
            onChangeText={setName}
            onSubmitEditing={create}
            error={name.trim() ? nameErrorText(error, 'shelf') : null}
          />
        </View>
      </View>
    </SheetDialog>
  );
}

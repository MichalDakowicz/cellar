import { FileText, Link2, Plus, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { ANDROID_METRICS, Overline } from '@/components/ui/controls';
import type { DocRowView } from '@/features/cellar/useEntryDocs';
import { webFocusRing } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

type EntryDocsProps = {
  rows: DocRowView[];
  draft: string;
  onDraft: (text: string) => void;
  canAttach: boolean;
  draftNote: string | null;
  onAttach: () => void;
  onOpen: (doc: DocRowView) => void;
  onDetach: (doc: DocRowView) => void;
};

/**
 * The docs hung off a thought, and the field that hangs another.
 *
 * A link wears the link glyph and a path the file glyph, read off the ref —
 * there is no picker, because the field takes either. A path with nowhere to
 * open reads the same but does not pretend to be a button.
 *
 * Taking one off is an X rather than an armed confirm: it removes a reference,
 * never the page or the file, and pasting it back is the whole undo.
 */
export function EntryDocs({ rows, draft, onDraft, canAttach, draftNote, onAttach, onOpen, onDetach }: EntryDocsProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View className="mt-7">
      <View className="mb-2">
        <Overline>{rows.length > 0 ? `docs · ${rows.length}` : 'docs'}</Overline>
      </View>

      {rows.map((doc) => {
        const Glyph = doc.kind === 'url' ? Link2 : FileText;
        return (
          <View key={doc.id} className="flex-row items-center gap-2.5">
            <Pressable
              accessibilityRole={doc.href ? 'link' : 'text'}
              accessibilityLabel={doc.title}
              disabled={!doc.href}
              onPress={() => onOpen(doc)}
              className="min-w-0 flex-1 flex-row items-center gap-2.5 py-2 active:opacity-70"
            >
              <Glyph size={14} color={COLORS.muted} strokeWidth={2} />
              <View className="min-w-0 flex-1">
                <Text className={doc.href ? 'text-sm font-semibold text-foreground' : 'text-sm text-foreground'} numberOfLines={1}>
                  {doc.title}
                </Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                  {doc.ref}
                </Text>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`take ${doc.title} off this thought`}
              hitSlop={8}
              onPress={() => onDetach(doc)}
              className="h-8 w-8 items-center justify-center rounded-full active:opacity-60"
            >
              <X size={14} color={COLORS.muted} strokeWidth={2} />
            </Pressable>
          </View>
        );
      })}

      <View className="mt-2 flex-row gap-2">
        <TextInput
          className="h-[42px] min-w-0 flex-1 rounded-lg bg-secondary px-3.5 text-foreground"
          style={[{ fontSize: 14, lineHeight: undefined }, ANDROID_METRICS, webFocusRing(focused)]}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="a link, or a path in the repo"
          placeholderTextColor={COLORS.muted}
          value={draft}
          onChangeText={onDraft}
          onSubmitEditing={onAttach}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          accessibilityLabel="attach a link or a path"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="attach it"
          accessibilityState={{ disabled: !canAttach }}
          disabled={!canAttach}
          hitSlop={6}
          onPress={onAttach}
          className="h-[42px] w-[42px] items-center justify-center rounded-lg bg-secondary active:opacity-70"
          style={{ opacity: canAttach ? 1 : 0.4 }}
        >
          <Plus size={18} color={COLORS.foreground} strokeWidth={2} />
        </Pressable>
      </View>
      {!!draftNote && <Text className="mt-1.5 text-xs text-muted-foreground">{draftNote}</Text>}
    </View>
  );
}

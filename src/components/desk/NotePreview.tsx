import { Monitor } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import type { NoteView } from '@/lib/deskNotify';
import { COLORS } from '@/theme/colors';

/**
 * One notification as the shade will draw it (`PhoneNotify.dc.html`): the app
 * line, the title, its lines, a plan's bar, and up to three buttons. Once a
 * button is pressed, the note says what happened instead.
 */
export function NotePreview({
  note,
  done,
  onAction,
}: {
  note: NoteView;
  done: string | null;
  onAction: (actionId: string, label: string) => void;
}) {
  return (
    <View className="gap-1.5 rounded-3xl px-4 pb-2.5 pt-3.5" style={{ backgroundColor: COLORS.noteGround }}>
      <View className="flex-row items-center gap-2">
        <View className="h-[18px] w-[18px] items-center justify-center rounded-[5px] bg-primary">
          <Monitor size={11} color={COLORS.accentInk} strokeWidth={2.6} />
        </View>
        <Text className="min-w-0 flex-1 text-xs text-muted-foreground" numberOfLines={1}>
          {note.head}
        </Text>
      </View>
      <Text className="text-sm font-semibold text-foreground">{note.title}</Text>
      {done ? (
        <Text className="text-sm" style={{ color: COLORS.foregroundSoft }}>
          {done}
        </Text>
      ) : (
        note.body.map((line, index) => <BodyLine key={`${index}:${line}`} line={line} first={index === 0} mono={note.mono} />)
      )}
      {note.progress !== null && !done && (
        <View className="mt-1 h-1 overflow-hidden rounded-full" style={{ backgroundColor: COLORS.outline }}>
          <View className="h-full rounded-full bg-foreground" style={{ width: `${Math.round(note.progress * 100)}%` }} />
        </View>
      )}
      {!done && note.actions.length > 0 && (
        <View className="mt-1 flex-row gap-1">
          {note.actions.map((action) => (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              onPress={() => onAction(action.id, action.label)}
              className="h-10 justify-center rounded-full px-3.5 active:opacity-60"
            >
              <Text className="text-sm font-semibold" style={{ color: COLORS.noteAction }}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

/**
 * One body line: a command in mono, an option with its letter in bold mono, a
 * "+2 more" or a where-line in grey, anything else in the note's soft white.
 */
function BodyLine({ line, first, mono }: { line: string; first: boolean; mono: boolean }) {
  if (first && mono) return <Text className="font-mono text-sm text-foreground">{line}</Text>;
  const option = line.match(/^([A-Z])  (.*)$/);
  if (option) {
    return (
      <Text className="text-sm" style={{ color: COLORS.foregroundSoft }}>
        <Text className="font-mono font-semibold text-foreground">{option[1]}</Text>
        {`  ${option[2]}`}
      </Text>
    );
  }
  const quiet = mono || /^\+\d+ more/.test(line);
  return (
    <Text className={quiet ? 'text-xs text-muted-foreground' : 'text-sm'} style={quiet ? undefined : { color: COLORS.foregroundSoft }}>
      {line}
    </Text>
  );
}

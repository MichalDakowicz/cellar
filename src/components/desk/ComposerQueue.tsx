import { Ellipsis, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import type { QueuedMessage } from '@/lib/deskDispatch';

import { COLORS } from '@/theme/colors';

export type QueuedPreview = { id: string; text: string; settings: string };

/** Each action retains its original item until a PC receipt confirms the change. */
export function ComposerQueue({ messages, busy = false, onPromote, onCancel, onEdit }: {
  messages: QueuedMessage[]; busy?: boolean;
  onPromote?: (item: QueuedMessage) => void; onCancel?: (item: QueuedMessage) => void;
  onEdit?: (item: QueuedMessage, text: string) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string; revision: number } | null>(null);
  const editedItem = messages.find((row) => row.id === editing?.id);
  if (editing && editedItem && editedItem.revision > editing.revision && editedItem.text === editing.text && !busy) setEditing(null);
  return <View className="gap-2">
    {messages.map((message) => <View key={message.id} className="gap-1 rounded-lg border border-border px-1.5 py-1">
      <View className="flex-row items-center gap-0.5"><Text className="font-sans min-w-0 flex-1 px-1 text-xs text-foreground" numberOfLines={1}>{message.text}</Text><Pressable accessibilityRole="button" accessibilityLabel="send queued message now" disabled={busy || message.state !== 'queued' || !onPromote} onPress={() => onPromote?.(message)} className="min-h-11 justify-center px-1"><Text className="font-sans text-[11px] text-muted-foreground">Send now</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="cancel queued message" disabled={busy || message.state !== 'queued' || !onCancel} onPress={() => onCancel?.(message)} className="h-11 w-8 items-center justify-center"><X size={16} color={COLORS.muted} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel="queued message details" onPress={() => setExpanded(expanded === message.id ? null : message.id)} className="h-11 w-8 items-center justify-center"><Ellipsis size={16} color={COLORS.muted} /></Pressable></View>
      {message.state !== 'queued' && <Text className="font-sans px-1 text-xs text-muted-foreground">{message.state} · {message.error ?? 'Waiting for PC confirmation.'}</Text>}
      {expanded === message.id && <View className="gap-1.5 px-1.5 pb-2">
        <Text className="font-sans text-xs text-foreground">{message.text}</Text>
        <Text className="font-sans text-[11px] text-muted-foreground">{message.settings.agent} · {message.settings.mode} · model/reasoning: {message.settings.model}</Text>
        {editing?.id === message.id ? <>
          <TextInput accessibilityLabel="edit queued message" multiline value={editing.text} onChangeText={(text) => setEditing({ ...editing, text })} className="font-sans min-h-11 rounded-lg border border-border px-2 py-2 text-sm text-foreground" />
          <Pressable accessibilityRole="button" accessibilityLabel="confirm queued edit" disabled={busy || !editing.text.trim() || message.state !== 'queued'} onPress={() => onEdit?.(message, editing.text)} className="min-h-11 justify-center"><Text className="font-sans text-xs text-foreground">Confirm edit</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => setEditing(null)} className="min-h-11 justify-center"><Text className="font-sans text-xs text-muted-foreground">Discard edit</Text></Pressable>
        </> : <Pressable accessibilityRole="button" accessibilityLabel="edit this queued message" disabled={busy || message.state !== 'queued' || !onEdit} onPress={() => setEditing({ id: message.id, text: message.text, revision: message.revision })} className="min-h-11 justify-center"><Text className="font-sans text-xs text-muted-foreground">Edit</Text></Pressable>}
      </View>}
    </View>)}
  </View>;
}

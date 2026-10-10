import { Ellipsis, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { COLORS } from '@/theme/colors';

export type QueuedPreview = { id: string; text: string; settings: string };

/** Queue presentation for sample/preview data; host delivery is W9. */
export function ComposerQueue({ messages }: { messages: QueuedPreview[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  return <View className="gap-2">
    <Text className="font-sans text-xs text-muted-foreground">Sample queue · delivery controls connect in the wiring pass.</Text>
    {messages.map((message) => <View key={message.id} className="gap-1 rounded-lg border border-border px-1.5 py-1">
      <View className="flex-row items-center gap-0.5"><Text className="font-sans min-w-0 flex-1 px-1 text-xs text-foreground" numberOfLines={1}>{message.text}</Text><View className="min-h-11 justify-center px-1"><Text className="font-sans text-[11px] text-muted-foreground">Send now</Text></View><View className="h-11 w-8 items-center justify-center"><X size={16} color={COLORS.muted} /></View><Pressable accessibilityRole="button" accessibilityLabel="queued message details" onPress={() => setExpanded(expanded === message.id ? null : message.id)} className="h-11 w-8 items-center justify-center"><Ellipsis size={16} color={COLORS.muted} /></Pressable></View>
      {expanded === message.id && <View className="gap-1.5 px-1.5 pb-2"><Text className="font-sans text-xs text-foreground">{message.text}</Text><Text className="font-sans text-[11px] text-muted-foreground">{message.settings}</Text><Text className="font-sans py-2 text-xs text-muted-foreground">Edit · coming with queue delivery</Text></View>}
    </View>)}
  </View>;
}

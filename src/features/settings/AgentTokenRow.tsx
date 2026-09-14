import { Pressable, Text, View } from 'react-native';

import { longRel } from '@/lib/relTime';
import type { AgentToken } from '@/types/cellar';

/**
 * One token: what it is for, whether it has ever been used, and the one action
 * that matters.
 *
 * A revoked token stays on the list, struck through rather than gone. A row
 * that disappears when you revoke it answers "is it off?" and nothing else; the
 * question you come back with a month later is "what did I turn off, and when".
 */
export function AgentTokenRow({
  token,
  onRevoke,
}: {
  token: AgentToken;
  onRevoke: (id: string) => void;
}) {
  const revoked = !!token.revokedAt;
  const used = token.lastUsedAt ? `used ${longRel(token.lastUsedAt)}` : 'never used';

  return (
    <View className="flex-row items-center gap-3 py-2">
      <View className="flex-1">
        <Text
          className={`text-sm text-foreground ${revoked ? 'line-through opacity-50' : ''}`}
          numberOfLines={1}
        >
          {token.name}
        </Text>
        <Text className="text-xs text-muted-foreground">
          {revoked ? `revoked ${longRel(token.revokedAt!)}` : `${used} · made ${longRel(token.createdAt)}`}
        </Text>
      </View>
      {!revoked && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`revoke ${token.name}`}
          onPress={() => onRevoke(token.id)}
          className="h-9 justify-center rounded-full border border-border px-4 active:opacity-70"
        >
          <Text className="text-xs font-semibold text-foreground">revoke</Text>
        </Pressable>
      )}
    </View>
  );
}

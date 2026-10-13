import { Pressable, Text, View } from 'react-native';

/**
 * Claude's own question — "do you trust the files in this folder?" — asked on
 * the phone, because the pc it would normally be asked on is not in front of
 * you. It says what yes means before the button does: claude will load that
 * folder's settings, hooks and MCP servers and run them as it works.
 */
export function TrustAsk({ folder, busy, onTrust }: { folder: string; busy: boolean; onTrust: () => void }) {
  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4">
      <Text className="text-sm font-semibold text-foreground">claude has not worked in {folder} before</Text>
      <Text className="text-xs text-muted-foreground">
        it asks once per folder whether you trust it — saying yes lets claude load that folder&apos;s settings, hooks and mcp
        servers and act on them. the same question it asks at the pc.
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`trust ${folder} and start`}
        disabled={busy}
        onPress={onTrust}
        className={['mt-1 h-10 items-center justify-center rounded-full bg-primary active:opacity-80', busy ? 'opacity-50' : ''].join(' ')}
      >
        <Text className="text-sm font-semibold text-primary-foreground">{busy ? 'trusting…' : 'trust it and start'}</Text>
      </Pressable>
    </View>
  );
}

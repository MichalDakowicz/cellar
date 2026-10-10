import { Pressable, Text } from 'react-native';

import type { DeskCountState } from '@/lib/deskCounts';

/** Recovery uses existing reads; it never starts or stops a run. */
export function DeskCountRecovery({ state, onRetry, onReconnect }: {
  state: DeskCountState; onRetry: () => void; onReconnect: () => void;
}) {
  if (state !== 'failed' && state !== 'disconnected') return null;
  const label = state === 'failed' ? 'retry counts' : 'reconnect';
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={state === 'failed' ? onRetry : onReconnect}
    className="mt-3 min-h-12 w-full items-center justify-center rounded-lg bg-secondary active:opacity-80">
    <Text className="font-sans text-sm font-semibold text-foreground">{label}</Text>
  </Pressable>;
}

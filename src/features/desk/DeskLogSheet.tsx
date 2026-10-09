import { Text, View } from 'react-native';

import { SheetDialog } from '@/components/ui/SheetDialog';
import type { DeskLogLine, DeskRun } from '@/lib/deskProtocol';

import { useDeskLog } from './useDeskRuns';
import type { DeskLink } from './useDeskLink';

const WHO: Record<DeskLogLine['who'], string> = {
  you: 'text-foreground font-semibold',
  agent: 'text-foreground',
  tool: 'text-muted-foreground font-mono',
  system: 'text-muted-foreground italic',
};

/**
 * What a run has said so far — the prompt, the agent's replies, the tools it
 * reached for — refreshed every few seconds while it is open. Read-only: a run
 * that needs an answer is answered at the pc, or on the cellar entry it asks on.
 */
export function DeskLogSheet({ link, run, onClose }: { link: DeskLink; run: DeskRun | null; onClose: () => void }) {
  const log = useDeskLog(link, run?.id ?? null);
  const lines = log.data ?? [];

  return (
    <SheetDialog
      open={run !== null}
      title={run?.name ?? ''}
      confirmLabel="close"
      onConfirm={onClose}
      onDismiss={onClose}
      dismissLabel="back"
    >
      <View className="gap-2 pt-3">
        {log.isLoading && <Text className="text-xs text-muted-foreground">reading…</Text>}
        {log.error && <Text className="text-xs text-muted-foreground">{(log.error as Error).message}</Text>}
        {lines.slice(-60).map((line, index) => (
          <Text key={index} className={`text-xs ${WHO[line.who]}`} selectable>
            {line.who === 'tool' ? `› ${line.text}` : line.text}
          </Text>
        ))}
        {!log.isLoading && !log.error && lines.length === 0 && (
          <Text className="text-xs text-muted-foreground">nothing said yet</Text>
        )}
      </View>
    </SheetDialog>
  );
}

import { ChevronDown, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { DeskLogLine, DeskRunState } from '@/lib/deskProtocol';
import type { DeskTestResults } from '@/lib/deskTestResults';
import { COLORS } from '@/theme/colors';

/** A readable report above the original, selectable job output. */
export function JobResults({ results, lines, state }: { results: DeskTestResults | null; lines: DeskLogLine[]; state: DeskRunState }) {
  const [raw, setRaw] = useState(false);
  const Chevron = raw ? ChevronDown : ChevronRight;
  return (
    <View className="gap-3">
      {results && <View className="gap-2 rounded-xl bg-row p-4">
        <Text className="font-sans text-sm font-semibold text-foreground">Test results · {results.runner}</Text>
        <View className="flex-row flex-wrap gap-4">
          <Text className="font-sans text-sm text-foreground">{results.passed} passed</Text>
          <Text className="font-sans text-sm" style={{ color: results.failed ? COLORS.danger : COLORS.muted }}>{results.failed} failed</Text>
          <Text className="font-sans text-sm text-muted-foreground">{results.skipped} skipped</Text>
        </View>
        <Text className="font-sans text-xs text-muted-foreground">{results.total} tests{results.duration ? ` · ${results.duration}` : ''} · latest reported suite</Text>
        {state !== 'done' && <Text className="font-sans text-xs text-muted-foreground">Job {state === 'running' ? 'still running' : state}; these totals describe test output only.</Text>}
        {results.failures.map((name) => <Text key={name} selectable className="font-mono text-xs text-foreground">{name}</Text>)}
        {!!results.failed && !results.failures.length && <Text className="font-sans text-xs text-muted-foreground">Failure details are in the raw output.</Text>}
      </View>}
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: raw }} accessibilityLabel={`${raw ? 'Hide' : 'Show'} raw output`} onPress={() => setRaw(!raw)} className="min-h-11 flex-row items-center gap-2">
        <Chevron size={16} color={COLORS.muted} />
        <Text className="font-sans text-sm text-foreground">{raw ? 'Hide' : 'Show'} raw output</Text>
      </Pressable>
      {!results && !raw && <Text className="font-sans text-xs text-muted-foreground">No recognized test summary in the current log. Open raw output for details.</Text>}
      {raw && <Text selectable className="font-mono text-xs leading-relaxed text-foreground">{lines.map((line) => line.text).join('\n') || 'Waiting for output…'}</Text>}
    </View>
  );
}

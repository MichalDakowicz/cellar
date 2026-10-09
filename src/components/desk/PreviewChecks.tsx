import { Check, CircleDashed, Package, X, type LucideIcon } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Overline } from '@/components/ui/controls';
import type { PreviewCheck, PreviewCheckState } from '@/lib/deskPreview';
import { COLORS } from '@/theme/colors';

const MARK: Record<PreviewCheckState, { Icon: LucideIcon; color: string }> = {
  passed: { Icon: Check, color: COLORS.ok },
  failed: { Icon: X, color: COLORS.danger },
  running: { Icon: CircleDashed, color: COLORS.muted },
  measure: { Icon: Package, color: COLORS.muted },
};

/** "checks on <host>": the project's check commands and what they measured. */
export function PreviewChecks({ host, checks, empty }: { host: string; checks: PreviewCheck[]; empty: string }) {
  return (
    <View className="gap-2">
      <Overline>{`checks on ${host}`}</Overline>
      {checks.length === 0 && <Text className="text-xs text-muted-foreground">{empty}</Text>}
      {checks.map((check) => {
        const { Icon, color } = MARK[check.state];
        return (
          <View key={check.label} className="flex-row items-center gap-2">
            <Icon size={16} color={color} strokeWidth={check.state === 'measure' ? 2 : 2.4} />
            <Text
              className={`min-w-0 flex-1 text-sm text-foreground ${check.command ? 'font-mono' : ''}`}
              numberOfLines={1}
            >
              {check.label}
            </Text>
            <Text className="text-xs text-muted-foreground">{check.detail}</Text>
          </View>
        );
      })}
    </View>
  );
}

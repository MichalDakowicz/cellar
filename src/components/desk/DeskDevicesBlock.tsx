import { ChevronRight } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { SwitchRow } from '@/components/ui/controls';
import { COLORS } from '@/theme/colors';

/**
 * Settings › desk › devices and pairing: the pc this phone is paired with (or
 * the phones this pc lets in), forgetting it, and the sample desk — which
 * fills the desk's coming screens on this device only.
 */
export function DeskDevicesBlock({
  browser,
  paired,
  onPair,
  onForget,
  sample,
  onSample,
}: {
  browser: boolean;
  paired: string | null;
  onPair: () => void;
  onForget: (() => void) | null;
  sample: boolean;
  onSample: (on: boolean) => void;
}) {
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={onPair} className="flex-row items-center gap-3 py-2 active:opacity-70">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-sm text-foreground">{browser ? 'account connection' : (paired ?? 'pair with your pc')}</Text>
          <Text className="font-sans mt-0.5 text-xs text-muted-foreground">
            {browser ? 'browser uses the cellar mailbox; pairing keys stay on your phone' : paired ? 'paired — open the desk' : 'scan the code cellar shows on your pc'}
          </Text>
        </View>
        <ChevronRight size={16} color={COLORS.muted} strokeWidth={2} />
      </Pressable>
      {onForget && (
        <Pressable accessibilityRole="button" onPress={onForget} className="py-2 active:opacity-70">
          <Text className="font-sans text-sm text-muted-foreground">forget {paired} on this phone</Text>
        </Pressable>
      )}
      <SwitchRow
        label="show a sample desk"
        sub="fill the desk's screens with sample runs and commands, to see what is coming. this device only"
        value={sample}
        onChange={onSample}
      />
    </View>
  );
}

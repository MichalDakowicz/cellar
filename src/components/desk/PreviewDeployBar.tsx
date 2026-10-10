import { CloudUpload, MessageSquare } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';

import { deployLine, type PreviewDeploy } from '@/lib/deskPreview';
import { COLORS } from '@/theme/colors';

/**
 * The bottom of the preview (`Preview.dc.html`), in thumb reach: tell the agent
 * what is wrong, or deploy — and one line under them saying where it goes, how
 * long it has been going, or why it cannot yet.
 */
export function PreviewDeployBar({
  deploy,
  onDeploy,
  onTellAgent,
}: {
  deploy: PreviewDeploy;
  onDeploy: () => void;
  onTellAgent: () => void;
}) {
  const line = deployLine(deploy);
  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="tell the agent"
          onPress={onTellAgent}
          className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full border border-border active:opacity-70"
        >
          <MessageSquare size={16} color={COLORS.foreground} strokeWidth={2} />
          <Text className="font-sans shrink-0 text-sm font-semibold text-foreground" numberOfLines={1}>
            tell the agent
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={line.label}
          accessibilityState={{ disabled: !line.enabled }}
          disabled={!line.enabled}
          onPress={onDeploy}
          className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-full bg-primary active:opacity-80 ${line.enabled ? '' : 'opacity-60'}`}
        >
          <CloudUpload size={16} color={COLORS.accentInk} strokeWidth={2} />
          <Text className="font-sans shrink-0 text-sm font-semibold text-primary-foreground" numberOfLines={1}>
            {line.label}
          </Text>
        </Pressable>
      </View>
      <Text className="font-sans text-center text-xs text-muted-foreground">{line.meta}</Text>
    </View>
  );
}

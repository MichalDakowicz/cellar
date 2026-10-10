import { Redirect, type Href } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { RunListPane } from '@/components/desk/RunListPane';
import { AppChrome } from '@/components/layout/AppChrome';
import { useRunList } from '@/features/desk/useRunList';
import { useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * Desk › chat with nothing open (`DeskChat.dc.html`): every run grouped by
 * project, waiting first. Opening one is the run's own screen. The phone's runs
 * live on the desk tab, so there this is the desk.
 */
export default function DeskChat() {
  const side = useRunList('');
  const isDesktop = useIsDesktop();
  const sidebar = useSidebarSpace();

  if (!isDesktop) return <Redirect href={'/desk' as Href} />;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-1 flex-row" style={{ marginLeft: sidebar }}>
        <RunListPane {...side.list} />
        <View className="flex-1 items-center justify-center gap-3 px-10">
          <MessageSquare size={28} color={COLORS.muted} strokeWidth={1.8} />
          <Text className="font-sans text-center text-sm text-muted-foreground">pick a run on the left, or start a new one with +</Text>
        </View>
      </View>
      <AppChrome />
    </View>
  );
}

import { useLocalSearchParams } from 'expo-router';
import { useWindowDimensions, View } from 'react-native';

import { RunListPane } from '@/components/desk/RunListPane';
import { RunRail } from '@/components/desk/RunRail';
import { AppChrome } from '@/components/layout/AppChrome';
import { RunChatPane } from '@/features/desk/RunChatPane';
import { useRunChat } from '@/features/desk/useRunChat';
import { useRunList } from '@/features/desk/useRunList';
import { useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';

/**
 * One run (docs/desk/screens.md, `Run.dc.html`). On a phone, its chat. On a
 * wide window, the desktop chat (`DeskChat.dc.html`): every run grouped by
 * project on the left, this one in the middle, its phone, files, checkpoints
 * and preview on the right.
 */
const RAIL_MIN_WIDTH = 1320;

export default function RunScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const chat = useRunChat(id ?? '');
  const side = useRunList(id ?? '');
  const isWide = useIsDesktop();
  const sidebar = useSidebarSpace();
  // The rail is the first thing to go: below this the chat itself gets too narrow to read.
  const { width } = useWindowDimensions();
  const rail = width >= RAIL_MIN_WIDTH;

  return (
    <View className="flex-1 bg-background">
      {isWide ? (
        <View className="flex-1 flex-row" style={{ marginLeft: sidebar }}>
          <RunListPane {...side.list} />
          <RunChatPane chat={chat} meter />
          {rail && <RunRail {...side.rail} />}
        </View>
      ) : (
        <View className="flex-1">
          <RunChatPane chat={chat} />
        </View>
      )}
      <AppChrome />
    </View>
  );
}

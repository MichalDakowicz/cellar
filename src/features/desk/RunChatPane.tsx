import { TurnChatItems } from '@/components/desk/TurnChatItems';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ApprovalPanel } from '@/components/desk/ApprovalPanel';
import { RunChatItems } from '@/components/desk/RunChatItems';
import { JobResults } from '@/components/desk/JobResults';
import { RunComposer } from '@/components/desk/RunComposer';
import { RunHeader } from '@/components/desk/RunHeader';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useIsDesktop } from '@/hooks/useResponsive';
import { runChip } from '@/lib/deskView';
import { COLORS } from '@/theme/colors';

import type { useRunChat } from './useRunChat';
import { WorktreeActions } from './WorktreeActions';
import { RunWaitingDock } from './RunWaitingDock';

/**
 * One run's chat (`Run.dc.html`): the header, what it said, and at the bottom in
 * thumb reach either the approval it is waiting on or the composer — never
 * both, because a run waiting on you has nothing else to hear. The whole phone
 * screen, and the middle of the desktop chat (`DeskChat.dc.html`), where the
 * header carries the usage meter.
 */
export function RunChatPane({ chat, meter = false }: { chat: ReturnType<typeof useRunChat>; meter?: boolean }) {
  const navBarSpace = useNavBarSpace();
  const keyboard = useKeyboardHeight();
  const isDesktop = useIsDesktop();
  // A chat is read from its newest line: open at the bottom, and stay there
  // as lines arrive unless you have scrolled up to read.
  const scroller = useRef<ScrollView>(null);
  const pinned = useRef(true);
  const [unread, setUnread] = useState(false);

  return (
    <View className="flex-1">
      <ScreenTop extra={0} />
      <View className="border-b border-border/50 px-4 pb-3 pt-4">
        <RunHeader title={chat.title} meta={chat.meta} branch={chat.branch} state={chat.state} age={chat.age} diff={chat.diff} onStop={chat.canStop ? chat.stop : null} meter={meter} connection={chat.connection} known={chat.found} />
      </View>
      <View className="min-h-0 flex-1">
      <ScrollView
        ref={scroller}
        onContentSizeChange={() => {
          if (pinned.current) scroller.current?.scrollToEnd({ animated: false });
          else setUnread(true);
        }}
        onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
          pinned.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 48;
          if (pinned.current) setUnread(false);
        }}
        scrollEventThrottle={100}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ContentShell maxWidth={MAX_W.text}>
          <View className="gap-4 px-4 pt-4">
            {!chat.found && (
              <Text className="font-sans text-sm text-muted-foreground">
                {chat.history ? 'Viewing saved chat; reconnect to check current run state.' : chat.loading ? 'reading…' : chat.missing ? 'this run is not on the pc any more' : 'Run data unavailable until the PC synchronizes.'}
              </Text>
            )}
            {chat.history && <Text className="font-sans text-xs text-muted-foreground">Saved history · last received {chat.historyAt ? new Date(chat.historyAt).toLocaleString() : 'unknown'}</Text>}
            {chat.canViewHistory && <Pressable accessibilityRole="button" onPress={chat.viewHistory} className="min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2"><Text className="font-sans text-sm text-foreground">View history</Text></Pressable>}
            {chat.job ? <JobResults {...chat.job} /> : chat.turnItems ? <TurnChatItems items={chat.turnItems} youCaption={chat.youCaption} historical={chat.history} /> : <RunChatItems items={chat.items} youCaption={chat.youCaption} />}
            {!!chat.logError && <View className="gap-2"><Text className="font-sans text-xs text-muted-foreground">{chat.logError}</Text><Pressable accessibilityRole="button" onPress={chat.retryEvents} className="min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2"><Text className="font-sans text-sm text-foreground">Reconnect</Text></Pressable></View>}
            {!!chat.worktreeId && <WorktreeActions id={chat.worktreeId} />}
            {!!chat.runtimeOutcome && <Text className="font-sans text-xs text-muted-foreground">{chat.runtimeOutcome}</Text>}
            {chat.decided && (
              <View className="flex-row items-center gap-2">
                <View
                  className="h-[7px] w-[7px] rounded-full"
                  style={{ backgroundColor: chat.decidedTone === 'denied' ? COLORS.muted : runChip('running').color }}
                />
                <Text className="font-sans text-xs text-muted-foreground">{chat.decided}</Text>
              </View>
            )}
          </View>
        </ContentShell>
      </ScrollView>
      {unread && <Pressable accessibilityRole="button" onPress={() => { scroller.current?.scrollToEnd({ animated: true }); pinned.current = true; setUnread(false); }} className="absolute bottom-3 self-center rounded-lg bg-foreground px-4 py-3"><Text className="font-sans text-sm font-semibold text-background">New messages ↓</Text></Pressable>}
      </View>

      <View
        className="border-t border-border/50 bg-background"
        style={{ paddingBottom: keyboard ? keyboard + 16 : isDesktop ? 16 : navBarSpace, zIndex: 5 }}
      >
        <ContentShell maxWidth={MAX_W.text}>
          <View className="px-4 pt-2.5">
            {chat.runtimeRequests.length || chat.linkedQuestions.length ? (
              <RunWaitingDock requests={chat.runtimeRequests} questions={chat.linkedQuestions} />
            ) : chat.approval ? (
              <ApprovalPanel approval={chat.approval} onDecide={chat.decide} />
            ) : chat.waitingAtPc ? (
              <Text className="font-sans pb-1 text-xs text-muted-foreground">
                This session needs the PC. Fresh Cellar tasks support phone approvals; legacy sessions keep their original controls.
              </Text>
            ) : (
              <RunComposer {...chat.composer} />
            )}
          </View>
        </ContentShell>
      </View>

    </View>
  );
}

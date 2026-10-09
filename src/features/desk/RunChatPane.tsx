import { useRef } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { ApprovalPanel } from '@/components/desk/ApprovalPanel';
import { RunChatItems } from '@/components/desk/RunChatItems';
import { RunComposer } from '@/components/desk/RunComposer';
import { RunHeader } from '@/components/desk/RunHeader';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useKeyboardHeight } from '@/hooks/useKeyboardHeight';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

import type { useRunChat } from './useRunChat';

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
  const gutter = useGutter();
  // A chat is read from its newest line: open at the bottom, and stay there
  // as lines arrive unless you have scrolled up to read.
  const scroller = useRef<ScrollView>(null);
  const pinned = useRef(true);

  return (
    <View className="flex-1">
      <ScrollView
        ref={scroller}
        onContentSizeChange={() => pinned.current && scroller.current?.scrollToEnd({ animated: false })}
        onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
          pinned.current = contentOffset.y + layoutMeasurement.height >= contentSize.height - 48;
        }}
        scrollEventThrottle={100}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`gap-5 pt-2 ${gutter}`}>
            <View className="flex-row items-start gap-3">
              <ScreenAction />
              <View className="min-w-0 flex-1">
                <RunHeader
                  title={chat.title}
                  meta={chat.meta}
                  branch={chat.branch}
                  state={chat.state}
                  age={chat.age}
                  diff={chat.diff}
                  onStop={chat.canStop ? chat.stop : null}
                  meter={meter}
                />
              </View>
            </View>

            {!chat.found && (
              <Text className="text-sm text-muted-foreground">
                {chat.loading ? 'reading…' : 'this run is not on the pc any more'}
              </Text>
            )}
            <RunChatItems items={chat.items} />
            {!!chat.logError && <Text className="text-xs text-muted-foreground">{chat.logError}</Text>}
            {chat.decided && (
              <View className="flex-row items-center gap-2">
                <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: COLORS.accent }} />
                <Text className="text-xs text-muted-foreground">{chat.decided}</Text>
              </View>
            )}
          </View>
        </ContentShell>
      </ScrollView>

      <View
        className="border-t border-border/50 bg-background"
        style={{ paddingBottom: Math.max(navBarSpace, keyboard + 12) }}
      >
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`pt-3 ${gutter}`}>
            {chat.approval ? (
              <ApprovalPanel approval={chat.approval} onDecide={chat.decide} />
            ) : chat.waitingAtPc ? (
              <Text className="pb-1 text-xs text-muted-foreground">
                it stopped on something only the pc can answer for now — answering from here comes soon
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

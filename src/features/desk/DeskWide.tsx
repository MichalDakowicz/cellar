import { Pressable, Text, View } from 'react-native';

import { DeskCaptureBar } from '@/components/desk/DeskCaptureBar';
import { DeskCommandTiles } from '@/components/desk/DeskCommandTiles';
import { DeskHostCard } from '@/components/desk/DeskHostCard';
import { DeskRunSections } from '@/components/desk/DeskRunSections';
import { DeskTodayFigures } from '@/components/desk/DeskTodayFigures';
import { DeskWaitingInline } from '@/components/desk/DeskWaitingInline';
import { Overline } from '@/components/ui/controls';

import type { useDeskHome } from './useDeskHome';
import type { useDeskScreen } from './useDeskScreen';
import type { useDeskWide } from './useDeskWide';

/**
 * The desk tab on a wide window (docs/desk/screens.md, `DeskHome.dc.html`):
 * header with stop all, the capture bar, then two columns — what needs you and
 * what is going on the left, devices, commands and today on the right. One
 * component so the route lays out one shape or the other.
 */
export function DeskWide({
  screen,
  home,
  wide,
}: {
  screen: ReturnType<typeof useDeskScreen>;
  home: ReturnType<typeof useDeskHome>;
  wide: ReturnType<typeof useDeskWide>;
}) {
  return (
    <View className="gap-6 px-8 pt-8">
      <View className="flex-row items-start gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-2xl font-bold tracking-tight text-foreground">desk</Text>
          <Text className="text-sm text-muted-foreground">{home.summary}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="stop all agents"
          accessibilityState={{ disabled: !wide.stopAll }}
          disabled={!wide.stopAll}
          onPress={() => wide.stopAll?.()}
          className={`h-10 justify-center rounded-full border border-destructive/60 px-4 active:opacity-70 ${wide.stopAll ? '' : 'opacity-40'}`}
        >
          <Text className="text-sm font-semibold text-destructive">stop all agents</Text>
        </Pressable>
      </View>

      <DeskCaptureBar {...wide.capture} />

      <View className="flex-row items-start gap-8">
        <View className="min-w-0 flex-[3]">
          <DeskWaitingInline asks={wide.asks} onDecide={wide.onDecide} thoughts={wide.thoughts} onAnswer={wide.openThought} />
          <DeskRunSections
            sections={wide.sections}
            gutter=""
            onOpen={home.openRun}
            empty={screen.runs.error ?? (screen.runs.loading ? 'reading…' : 'nothing running')}
          />
        </View>

        <View className="min-w-0 flex-[2] gap-7">
          <View className="gap-2">
            <Overline>devices</Overline>
            <DeskHostCard {...home.host} />
          </View>
          {home.commands && (
            <View className="gap-2">
              <Overline>{`commands · $${home.commands.current.name}`}</Overline>
              <DeskCommandTiles {...home.commands} gutter="" mono />
            </View>
          )}
          <DeskTodayFigures figures={wide.today} />
        </View>
      </View>
    </View>
  );
}

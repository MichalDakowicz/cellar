import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { DeskCommandTiles } from '@/components/desk/DeskCommandTiles';
import { DeskHostCard } from '@/components/desk/DeskHostCard';
import { DeskIdentity } from '@/components/desk/DeskIdentity';
import { DeskRunScope } from '@/components/desk/DeskRunScope';
import { DeskWaitingCards } from '@/components/desk/DeskWaitingCards';
import { DeskLaterLinks } from '@/components/desk/DeskLaterLinks';
import { DeskPairPanel } from '@/components/desk/DeskPairPanel';
import { DeskRunSections } from '@/components/desk/DeskRunSections';
import { DeskSection } from '@/components/desk/DeskSection';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { DeskLocalSections } from '@/features/desk/DeskLocalSections';
import { DeskWide } from '@/features/desk/DeskWide';
import { useDeskHome } from '@/features/desk/useDeskHome';
import { useDeskScreen } from '@/features/desk/useDeskScreen';
import { useDeskWide } from '@/features/desk/useDeskWide';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useIsDesktop, useSidebarSpace } from '@/hooks/useResponsive';

/**
 * The desk tab — the right plate of the bar (docs/desk/screens.md, `Main.dc.html`).
 *
 * Your desk, top down: who is awake and what is waiting, the host, the selected
 * project's commands, then the runs — waiting, running, lately. Below them, the
 * pc's own business: pairing, and on the same wi-fi its pages, screen and
 * builds. A new task is the left island (`desk/new`).
 *
 * On a wide window the top half is the desktop's home instead (`DeskWide`,
 * `DeskHome.dc.html`); the pc's own business below stays the same.
 */
export default function Desk() {
  const router = useRouter();
  const screen = useDeskScreen();
  const home = useDeskHome(screen);
  const wide = useDeskWide(screen, home.sections);
  const isWide = useIsDesktop();
  const { link } = screen;
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const unpaired = !link.bridge && !link.pair;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        style={{ marginLeft: sidebar }}
        contentContainerStyle={{ paddingBottom: navBarSpace }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {!isWide && <ScreenTop />}
        <ContentShell maxWidth={isWide ? MAX_W.detail : MAX_W.text}>
          {isWide ? (
            <DeskWide screen={screen} home={home} wide={wide} />
          ) : (
            <>
              <View className={gutter}>
                <DeskIdentity name={unpaired ? 'your desk' : home.host.name} online={home.host.online} checking={link.checking} summary={home.host.online ? home.activity : ''} sample={home.sample} onSettings={() => router.push('/settings' as Href)} />
              </View>

              {(home.sections.waiting.length > 0 || wide.thoughts.length > 0) && <View className={`pt-5 ${gutter}`}><DeskWaitingCards runs={home.sections.waiting} thoughts={wide.thoughts} onRun={home.openRun} onThought={wide.openThought} /></View>}

              <View className={`pt-5 ${gutter}`}>
                <DeskHostCard {...home.host} compact />
              </View>

              {home.commands && (
                <View className="pt-5">
                  <DeskCommandTiles {...home.commands} gutter={gutter} />
                </View>
              )}

              {home.commands && <View className={`pt-5 ${gutter}`}><DeskRunScope project={home.commands.current.name} scope={home.scope} onScope={home.onScope} /></View>}
              <DeskRunSections
                sections={home.scopedSections}
                gutter={gutter}
                onOpen={home.openRun}
                empty={screen.runs.error ?? (screen.runs.loading ? 'reading…' : 'nothing running')}
                only={['running', 'lately']}
              />
            </>
          )}

          {link.bridge && (
            <DeskSection title="pair a phone" gutter={gutter}>
              <DeskPairPanel
                url={screen.pairing?.url ?? null}
                reason={screen.pairing && screen.pairing.url === null ? screen.pairing.reason : null}
                onForget={() => void screen.forgetPhones()}
              />
            </DeskSection>
          )}

          {unpaired && (
            <DeskSection title="pair with your pc" gutter={gutter}>
              <Text className="font-sans pb-3 text-xs text-muted-foreground">
                open cellar on the pc, go to this pc from its tray, and scan the code it shows.
                {link.desk ? ` ${link.desk.name} is reachable through the cellar meanwhile.` : ''}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="scan the pc's code"
                onPress={() => router.push('/desk-scan' as Href)}
                className="h-11 items-center justify-center rounded-full bg-secondary active:opacity-80"
              >
                <Text className="font-sans text-sm font-semibold text-foreground">scan the pc&apos;s code</Text>
              </Pressable>
            </DeskSection>
          )}

          <DeskSection title="more on the desk" gutter={gutter}>
            <DeskLaterLinks links={home.later} />
          </DeskSection>

          <DeskLocalSections local={screen.local} gutter={gutter} />

          {link.pair && !link.bridge && (
            <View className={`py-7 ${gutter}`}>
              <Pressable accessibilityRole="button" accessibilityLabel="forget this pc" hitSlop={8} onPress={screen.forgetPair}>
                <Text className="font-sans text-xs font-semibold text-muted-foreground">forget {link.pair.name} on this phone</Text>
              </Pressable>
            </View>
          )}
        </ContentShell>
      </ScrollView>

    </View>
  );
}

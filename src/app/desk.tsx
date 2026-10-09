import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { DeskPairPanel } from '@/components/desk/DeskPairPanel';
import { DeskPromptForm } from '@/components/desk/DeskPromptForm';
import { DeskRunRow } from '@/components/desk/DeskRunRow';
import { DeskSection } from '@/components/desk/DeskSection';
import { DeskStatusLine } from '@/components/desk/DeskStatusLine';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { DeskLocalSections } from '@/features/desk/DeskLocalSections';
import { DeskLogSheet } from '@/features/desk/DeskLogSheet';
import { useDeskScreen } from '@/features/desk/useDeskScreen';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';
import { longRel } from '@/lib/relTime';

/**
 * The pc. On the phone: what it is running, a prompt to send it, and — on the
 * same wi-fi — its screen, its local pages and its builds. In the desktop app's
 * own window: the code a phone scans to pair, and the same list of runs.
 */
export default function Desk() {
  const router = useRouter();
  const screen = useDeskScreen();
  const { link, runs } = screen;
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
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`pt-4 ${gutter}`}>
            <View className="flex-row items-center gap-3">
              <ScreenAction />
              <Text className="text-2xl font-bold tracking-tight text-foreground">
                {link.bridge ? 'this pc' : link.name}
              </Text>
            </View>
            <DeskStatusLine via={link.via} seenAt={link.desk?.seenAt ?? null} checking={link.checking} />
          </View>

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
              <Text className="pb-3 text-xs text-muted-foreground">
                open cellar on the pc, go to this pc from its tray, and scan the code it shows.
                {link.desk ? ` ${link.desk.name} is reachable through the cellar meanwhile.` : ''}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="scan the pc's code"
                onPress={() => router.push('/desk-scan' as Href)}
                className="h-11 items-center justify-center rounded-full bg-secondary active:opacity-80"
              >
                <Text className="text-sm font-semibold text-foreground">scan the pc&apos;s code</Text>
              </Pressable>
            </DeskSection>
          )}

          {link.can.start && (
            <DeskSection title="send it something" gutter={gutter}>
              <DeskPromptForm {...screen.form} />
            </DeskSection>
          )}

          <DeskSection
            title={runs.snapshotAt ? `runs · as of ${longRel(runs.snapshotAt)}` : 'runs'}
            gutter={gutter}
            empty={runs.error ?? (runs.runs.length === 0 ? (runs.loading ? 'reading…' : 'nothing running') : null)}
          >
            {runs.runs.map((run) => (
              <DeskRunRow key={run.id} run={run} onOpen={screen.openLog} onStop={screen.stop} />
            ))}
          </DeskSection>

          <DeskLocalSections local={screen.local} gutter={gutter} />

          {link.pair && !link.bridge && (
            <View className={`py-7 ${gutter}`}>
              <Pressable accessibilityRole="button" accessibilityLabel="forget this pc" hitSlop={8} onPress={screen.forgetPair}>
                <Text className="text-xs font-semibold text-muted-foreground">forget {link.pair.name} on this phone</Text>
              </Pressable>
            </View>
          )}
        </ContentShell>
      </ScrollView>

      <DeskLogSheet link={link} run={screen.logRun} onClose={screen.closeLog} />
      <AppChrome />
    </View>
  );
}

import Constants from 'expo-constants';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { ChipWrap } from '@/components/cellar/ChipWrap';
import { kindChips } from '@/components/cellar/kindChips';
import { ContentShell } from '@/components/layout/ContentShell';
import { AppChrome } from '@/components/layout/AppChrome';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { Overline, Segmented, SwitchRow } from '@/components/ui/controls';
import { useQuestionNotices } from '@/features/notifications/useQuestionNotices';
import { AgentAccess } from '@/features/settings/AgentAccess';
import { SheetDialog } from '@/components/ui/SheetDialog';
import { useToast } from '@/components/ui/Toast';
import { signOut } from '@/features/auth/authActions';
import { useCellarSettings } from '@/hooks/useCellarSettings';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';
import type { ProjectViewPref } from '@/lib/cellarSettings';
import type { ThemePref } from '@/lib/userSettings';
import { useCellarPrefs } from '@/store/cellarPrefs';
import { useTheme } from '@/theme/ThemeProvider';

/**
 * Settings. The theme row says out loud that it is shared with the siblings —
 * telling someone that after the fact is how you lose their trust in a switch.
 *
 * There is no privacy row, because there is nothing to gate: the cellar is
 * owner-only at the database, not by preference (docs/shared-database.md).
 */
export default function Settings() {
  const { settings, updateSettings } = useCellarSettings();
  const notifications = useQuestionNotices();
  const { theme, setTheme } = useTheme();
  const setRaw = useCellarPrefs((state) => state.setRaw);
  const setDraftKind = useCellarPrefs((state) => state.setDraftKind);
  const setView = useCellarPrefs((state) => state.setView);
  const { say } = useToast();
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const [signingOut, setSigningOut] = useState(false);

  const version = Constants.expoConfig?.version ?? '0.1.0';

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        style={{ marginLeft: sidebar }}
        contentContainerStyle={{ paddingBottom: navBarSpace }}
        showsVerticalScrollIndicator={false}
      >
        <ScreenTop />
        <ContentShell maxWidth={MAX_W.text}>
          <View className={`flex-row pt-4 ${gutter}`}>
            <ScreenAction />
          </View>
          <View className={`pt-4 ${gutter}`}>
            <Text className="text-2xl font-bold tracking-tight text-foreground">settings</Text>
          </View>

          <View className={`mt-6 border-t border-border/50 ${gutter}`}>
            <SwitchRow
              label="kind glyphs in the gutter"
              sub="the column of marks that makes a list scan like a ledger"
              value={settings.showCodes}
              onChange={(value) => void updateSettings({ showCodes: value })}
            />
            <SwitchRow
              label="raw dump by default"
              sub="open the capture screen in many-lines mode"
              value={settings.rawDefault}
              onChange={(value) => {
                setRaw(value);
                void updateSettings({ rawDefault: value });
              }}
            />
            <SwitchRow
              label="remember the last project"
              sub="the project chip you picked stays picked for the next drop"
              value={settings.rememberLast}
              onChange={(value) => void updateSettings({ rememberLast: value })}
            />
            <SwitchRow
              label="tell me when an agent asks"
              sub={notifications.sub}
              value={settings.notifyQuestions && notifications.granted !== false}
              onChange={(value) => void notifications.set(value)}
            />
          </View>

          <View className={`gap-2 pt-7 ${gutter}`}>
            <Overline>default kind</Overline>
            <ChipWrap
              label="default kind"
              options={kindChips(settings.defaultKind)}
              selected={settings.defaultKind}
              onToggle={(kind) => {
                setDraftKind(kind);
                void updateSettings({ defaultKind: kind });
              }}
            />
            <Text className="text-xs text-muted-foreground">what a fresh draft starts as.</Text>
          </View>

          <View className={`gap-3 pt-7 ${gutter}`}>
            <Overline>how a project opens</Overline>
            <Segmented<ProjectViewPref>
              label="how a project opens"
              value={settings.defaultView}
              onChange={(value) => {
                setView(value);
                void updateSettings({ defaultView: value });
              }}
              options={[
                { value: 'grouped', label: 'by kind' },
                { value: 'stream', label: 'one stream' },
              ]}
            />
          </View>

          <View className={`gap-3 pt-7 ${gutter}`}>
            <Overline>theme</Overline>
            <Segmented<ThemePref>
              label="theme"
              value={theme}
              onChange={setTheme}
              options={[
                { value: 'dark', label: 'dark' },
                { value: 'light', label: 'light' },
                { value: 'system', label: 'system' },
              ]}
            />
            <Text className="text-xs text-muted-foreground">
              shared with radar, lidar, sonar and pulsar — picking light here picks light there.
            </Text>
          </View>

          <AgentAccess gutter={gutter} />

          <View className={`pt-7 ${gutter}`}>
            <Overline>about</Overline>
            <Text className="mt-2 text-sm text-muted-foreground">cellar {version}</Text>
            <Text className="mt-1 text-xs text-muted-foreground">
              one account across radar, lidar, sonar, pulsar and cellar. your cellar itself is private —
              nobody else can read it, and there is no switch that changes that. signing out here signs you
              out of this app only.
            </Text>
          </View>

          <View className={`py-7 ${gutter}`}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="sign out"
              hitSlop={8}
              onPress={() => setSigningOut(true)}
            >
              <Text className="text-sm font-semibold text-destructive-foreground">sign out</Text>
            </Pressable>
          </View>
        </ContentShell>
      </ScrollView>

      <SheetDialog
        open={signingOut}
        title="sign out?"
        body="every thought stays where it is. the same account signs back in."
        confirmLabel="sign out"
        dismissLabel="stay"
        tone="destructive"
        onConfirm={async () => {
          setSigningOut(false);
          try {
            await signOut();
          } catch (error) {
            say(error instanceof Error ? error.message : 'that did not work.');
          }
        }}
        onDismiss={() => setSigningOut(false)}
      />

      {/* Pushed out of the tabs, so the navigator's own chrome is gone — the
          screen mounts it itself, which is also where the phone build's left
          island turns into Back (components/layout/navActions). */}
      <AppChrome />
    </View>
  );
}

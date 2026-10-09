import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { AttachedThought } from '@/components/desk/AttachedThought';
import { NewTaskChoices } from '@/components/desk/NewTaskChoices';
import { NewTaskVoice } from '@/components/desk/NewTaskVoice';
import { TrustAsk } from '@/components/desk/TrustAsk';
import { AppChrome } from '@/components/layout/AppChrome';
import { ContentShell } from '@/components/layout/ContentShell';
import { ScreenAction } from '@/components/layout/ScreenAction';
import { ScreenTop } from '@/components/layout/ScreenTop';
import { useNewTask } from '@/features/desk/useNewTask';
import { useNavBarSpace } from '@/hooks/useNavBarSpace';
import { MAX_W, useGutter, useSidebarSpace } from '@/hooks/useResponsive';
import { COLORS } from '@/theme/colors';

/**
 * New task (docs/desk/screens.md, `NewTask.dc.html`) — the desk tab's left
 * island. Say it, pick where and who, send it to the pc. `?entry=` attaches a
 * thought for the run to pick up.
 *
 * A screen rather than a sheet: the form is taller than a phone once the
 * keyboard is up, and a sheet that cannot scroll hides its own send button.
 */
export default function NewTask() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entry?: string }>();
  const task = useNewTask(params.entry ?? null, () => (router.canGoBack() ? router.back() : router.navigate('/desk')));
  const navBarSpace = useNavBarSpace();
  const gutter = useGutter();
  const sidebar = useSidebarSpace();
  const blocked = !!task.blocker;

  return (
    <View className="flex-1 bg-background">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ marginLeft: sidebar }}
          contentContainerStyle={{ paddingBottom: navBarSpace + 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenTop />
          <ContentShell maxWidth={MAX_W.form}>
            <View className={`gap-6 pt-2 ${gutter}`}>
              <View className="flex-row items-center gap-3">
                <ScreenAction />
                <Text className="min-w-0 flex-1 text-2xl font-bold tracking-tight text-foreground">new task</Text>
                <View className="flex-row items-center gap-1.5">
                  <View
                    className="h-[7px] w-[7px] rounded-full"
                    style={{ backgroundColor: task.online ? COLORS.ok : COLORS.mutedDeep }}
                  />
                  <Text className="text-xs text-muted-foreground">to {task.host}</Text>
                </View>
              </View>

              <NewTaskVoice text={task.text} onText={task.onText} />
              <NewTaskChoices {...task} />
              {task.attached && <AttachedThought {...task.attached} />}

              <View className="gap-2">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`send to ${task.host}`}
                  accessibilityState={{ disabled: blocked }}
                  disabled={blocked}
                  onPress={task.send}
                  className={`h-[52px] items-center justify-center rounded-full active:opacity-80 ${blocked ? 'bg-secondary' : 'bg-foreground'}`}
                >
                  <Text className={`text-base font-semibold ${blocked ? 'text-muted-foreground' : 'text-background'}`}>
                    {task.busy ? 'sending…' : `send to ${task.host}`}
                  </Text>
                </Pressable>
                {!!task.blocker && !task.busy && (
                  <Text className="text-center text-xs text-muted-foreground">{task.blocker}</Text>
                )}
                {!!task.untrusted && <TrustAsk folder={task.untrusted} busy={task.trusting} onTrust={task.onTrust} />}
                {!!task.error && <Text className="text-sm text-destructive-foreground">{task.error}</Text>}
              </View>
            </View>
          </ContentShell>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppChrome />
    </View>
  );
}

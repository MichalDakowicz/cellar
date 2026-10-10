import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ArrowUp } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AttachedThought } from '@/components/desk/AttachedThought';
import { DeskSheet } from '@/components/desk/DeskSheet';
import { NewTaskChoices } from '@/components/desk/NewTaskChoices';
import { NewTaskVoice } from '@/components/desk/NewTaskVoice';
import { TrustAsk } from '@/components/desk/TrustAsk';
import { useNewTask } from '@/features/desk/useNewTask';
import { COLORS } from '@/theme/colors';

/**
 * New task (docs/desk/screens.md, `NewTask.dc.html`) — the desk tab's left
 * island: a sheet over the desk. Say it, pick where and who, send it to the
 * pc. `?entry=` attaches a thought for the run to pick up; `?entries=a,b` the
 * thoughts held on a project and handed off together. The body scrolls and
 * send is pinned under it, so a tall form never hides its own button.
 */
export default function NewTask() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entry?: string; entries?: string }>();
  const ids = useMemo(
    () => (params.entries ?? params.entry ?? '').split(',').filter(Boolean),
    [params.entries, params.entry],
  );
  const close = () => (router.canGoBack() ? router.back() : router.navigate('/desk' as Href));
  const task = useNewTask(ids, close);
  const blocked = !!task.blocker;

  return (
    <DeskSheet
      onClose={close}
      footer={
        <View className="gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={task.sendLabel}
            accessibilityState={{ disabled: blocked }}
            disabled={blocked}
            onPress={task.send}
            className={`h-[52px] flex-row items-center justify-center gap-2 rounded-full active:opacity-80 ${blocked ? 'bg-secondary' : 'bg-foreground'}`}
          >
            <ArrowUp size={18} color={blocked ? COLORS.muted : COLORS.background} strokeWidth={2.2} />
            <Text className={`text-base font-semibold ${blocked ? 'text-muted-foreground' : 'text-background'}`}>
              {task.busy ? 'sending…' : task.sendLabel}
            </Text>
          </Pressable>
          {!!task.blocker && !task.busy && <Text className="text-center text-xs text-muted-foreground">{task.blocker}</Text>}
          {!!task.untrusted && <TrustAsk folder={task.untrusted} busy={task.trusting} onTrust={task.onTrust} />}
          {!!task.error && <Text className="text-sm text-destructive-foreground">{task.error}</Text>}
        </View>
      }
    >
      <View className="flex-row items-center justify-between gap-3">
        <Text className="text-lg font-bold text-foreground">new task</Text>
        <View className="flex-row items-center gap-1.5">
          <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: task.online ? COLORS.ok : COLORS.mutedDeep }} />
          <Text className="text-xs text-muted-foreground">to {task.host}</Text>
        </View>
      </View>
      <NewTaskVoice text={task.text} onText={task.onText} keys={task.keys} />
      <NewTaskChoices {...task} />
      <AttachedThought thoughts={task.attached} onDetach={task.onDetach} split={task.split} onSplit={task.onSplit} />
    </DeskSheet>
  );
}

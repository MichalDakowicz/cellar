import { Pressable, Text, View } from 'react-native';
import type { DeskRun } from '@/lib/deskProtocol';
import type { ManagedPreview, PreviewAction } from '@/lib/deskManagedPreview';
import { RoutePressable } from '@/components/ui/RoutePressable';
import type { Href } from 'expo-router';

export function ManagedPreviewRows({ runs, previews, busy, onAction, onOpen }: {
  runs: DeskRun[]; previews: ManagedPreview[]; busy: boolean;
  onAction: (projectId: string, runId: string, action: PreviewAction['action'], unopened?: boolean) => void;
  onOpen: (port: number) => void;
}) {
  return <View className="gap-3">{runs.map((run) => {
    const preview = previews.find((p) => p.cwd === run.cwd);
    return <View key={run.id} className="gap-2 rounded-xl bg-row p-3">
      <Text className="font-sans text-sm text-foreground">{run.name}</Text>
      <Text className="font-mono text-xs text-muted-foreground">{run.branch ?? 'main'} · {preview?.state ?? 'no preview'}</Text>
      <View className="flex-row flex-wrap gap-3">
        <Pressable disabled={busy} onPress={() => onAction(run.projectId!, run.id, 'start')} className="min-h-11 justify-center"><Text className="text-foreground">start preview</Text></Pressable>
        {preview && <>
          <RoutePressable href={`/desk/preview/${preview.port}` as Href} disabled={preview.state !== 'live'} onPress={() => onOpen(preview.port)} className="min-h-11 justify-center"><Text className="text-foreground">open :{preview.port}</Text></RoutePressable>
          <Pressable disabled={busy} onPress={() => onAction(run.projectId!, run.id, 'checks')} className="min-h-11 justify-center"><Text className="text-foreground">run checks</Text></Pressable>
          <Pressable disabled={busy} onPress={() => onAction(run.projectId!, run.id, 'stop')} className="min-h-11 justify-center"><Text className="text-foreground">stop preview</Text></Pressable>
        </>}
      </View>
    </View>;
  })}</View>;
}

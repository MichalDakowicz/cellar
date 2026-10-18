import { useRouter, type Href } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { ManagedPreviewRows } from '@/components/desk/ManagedPreviewRows';
import { useManagedPreviews } from '@/features/desk/useManagedPreviews';

import { DeskLocalRow } from '@/components/desk/DeskLocalRow';
import { LaterScreen } from '@/features/desk/LaterScreen';
import { useDeskLink } from '@/features/desk/useDeskLink';
import { useDeskLocal } from '@/features/desk/useDeskLocal';

/**
 * Desk › previews (Map › desk): every page the pc is serving, each opening in
 * the preview — sized, checked, deployable. One dev server per worktree comes
 * with W11; until then it is whatever is listening on the pc.
 */
export default function DeskPreviews() {
  const router = useRouter();
  const link = useDeskLink();
  const local = useDeskLocal(link);
  const managed = useManagedPreviews();

  return (
    <LaterScreen
      name="previews"
      overline="previews · phone and desktop"
      title="previews"
      sub="what the pc is serving — open one on any device, then deploy"
      sampleOnly={false}
      waitsOn=""
    >
      {managed.enabled && <ManagedPreviewRows runs={managed.data?.agentRuns ?? []} previews={managed.data?.previews ?? []} busy={managed.busy} onAction={managed.act} onOpen={(p) => router.push(`/desk/preview/${p}` as Href)} />}
      {managed.error && <Text className="text-destructive">{managed.error}</Text>}
      {managed.recover && <Pressable onPress={() => void managed.recover?.()}><Text className="text-foreground">check original preview receipt</Text></Pressable>}
      {!local.pagesAvailable && (
        <Text className="font-sans text-sm text-muted-foreground">{`${link.name} is not on this network — its pages open over the same wi-fi`}</Text>
      )}
      {local.pagesAvailable && local.ports.length === 0 && (
        <Text className="font-sans text-sm text-muted-foreground">nothing is listening on the pc right now</Text>
      )}
      {local.ports.map((port) => (
        <DeskLocalRow
          href={`/desk/preview/${port.port}` as Href}
          key={port.port}
          title={`localhost:${port.port}`}
          detail={port.process ?? `process ${port.pid}`}
          verb="preview"
          busy={false}
          onPress={() => router.push(`/desk/preview/${port.port}` as Href)}
        />
      ))}
    </LaterScreen>
  );
}

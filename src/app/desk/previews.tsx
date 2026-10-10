import { useRouter, type Href } from 'expo-router';
import { Text } from 'react-native';

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

  return (
    <LaterScreen
      name="previews"
      overline="previews · phone and desktop"
      title="previews"
      sub="what the pc is serving — open one on any device, then deploy"
      sampleOnly={false}
      waitsOn=""
    >
      {!local.pagesAvailable && (
        <Text className="text-sm text-muted-foreground">{`${link.name} is not on this network — its pages open over the same wi-fi`}</Text>
      )}
      {local.pagesAvailable && local.ports.length === 0 && (
        <Text className="text-sm text-muted-foreground">nothing is listening on the pc right now</Text>
      )}
      {local.ports.map((port) => (
        <DeskLocalRow
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

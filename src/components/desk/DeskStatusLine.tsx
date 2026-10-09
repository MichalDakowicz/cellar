import { Text } from 'react-native';

import type { DeskVia } from '@/lib/deskLink';
import { longRel } from '@/lib/relTime';

/**
 * Which wire is carrying the conversation with the pc, in one muted line under
 * the heading — because "through the cellar" and "on this network" can do
 * different things, and a missing section should never look like a bug.
 */
export function DeskStatusLine({
  via,
  seenAt,
  checking,
}: {
  via: DeskVia;
  seenAt: string | null;
  checking: boolean;
}) {
  const line =
    via === 'bridge'
      ? 'this pc — phones paired with it can start agents here'
      : via === 'lan'
        ? 'on this network — everything below is live'
        : via === 'cellar'
          ? `away — reaching it through the cellar${seenAt ? `, last heard ${longRel(seenAt)}` : ''}. pages, screen and builds need the same wi-fi`
          : checking
            ? 'looking for it…'
            : seenAt
              ? `not answering — last heard ${longRel(seenAt)}`
              : 'not answering — is cellar open on the pc?';
  return <Text className="mt-1 text-xs text-muted-foreground">{line}</Text>;
}

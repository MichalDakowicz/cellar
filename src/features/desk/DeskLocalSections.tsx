import { DeskLocalRow } from '@/components/desk/DeskLocalRow';
import { DeskSection } from '@/components/desk/DeskSection';
import { longRel } from '@/lib/relTime';

import type { useDeskLocal } from './useDeskLocal';

function megabytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

/**
 * The LAN-only half of the pc screen: its screen, its local pages, and the
 * builds it can drop. One component so the route does not branch three times
 * on the same "are we on the same wi-fi" answer.
 */
export function DeskLocalSections({ local, gutter }: { local: ReturnType<typeof useDeskLocal>; gutter: string }) {
  if (!local.available) return null;
  const busy = local.open.isPending;

  return (
    <>
      <DeskSection title="look at the pc" gutter={gutter}>
        <DeskLocalRow
          title="the screen"
          detail="a live picture of the main display, a few frames a second"
          verb="watch"
          busy={busy}
          onPress={() => local.open.mutate({ kind: 'screen' })}
        />
        {local.ports.map((port) => (
          <DeskLocalRow
            key={port.port}
            title={`localhost:${port.port}`}
            detail={port.process ?? `process ${port.pid}`}
            verb="open"
            busy={busy}
            onPress={() => local.open.mutate({ kind: 'view', port: port.port })}
          />
        ))}
      </DeskSection>

      <DeskSection
        title="builds to install"
        gutter={gutter}
        empty={local.apks.length === 0 ? 'no release build on the pc yet' : null}
      >
        {local.apks.map((apk) => (
          <DeskLocalRow
            key={apk.app}
            title={apk.version ? `${apk.app} ${apk.version}` : apk.file}
            detail={`${megabytes(apk.size)} · built ${longRel(new Date(apk.builtAt).toISOString())}`}
            verb="install"
            busy={busy}
            onPress={() => local.open.mutate({ kind: 'apk', app: apk.app })}
          />
        ))}
      </DeskSection>
    </>
  );
}

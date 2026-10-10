import { useQuery } from '@tanstack/react-query';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { pagePath, previewAddress, type PreviewDeploy, type PreviewLoad, type PreviewSize } from '@/lib/deskPreview';
import { SAMPLE_PREVIEW } from '@/lib/deskSample';
import { readError } from '@/lib/utils';

import { useDeskLink } from './useDeskLink';

/**
 * The preview screen (`Preview.dc.html`): one page the pc serves, framed at a
 * size, with its checks and deploy.
 *
 * A real page is any port the pc lists, reached over the LAN with a one-minute
 * ticket the page spends on its first load. Checks and deploy need the pc to
 * know a project's commands (docs/desk/TASKS.md W11), so on a real page they
 * are drawn and say they are coming; the sample desk's page shows them working,
 * locally.
 */
export function useDeskPreview(param: string) {
  const router = useRouter();
  const link = useDeskLink();
  const sample = param === 'sample';
  const port = sample ? SAMPLE_PREVIEW.port : Number(param);
  const calls = !sample && link.can.local ? link.calls : null;
  // In the pc's own window the page is on this machine: no ticket, just localhost.
  const onPc = !sample && link.via === 'bridge';
  const pageCalls = !sample && link.can.pages ? link.calls : null;

  const [size, setSize] = useState<PreviewSize>('phone');
  const [load, setLoad] = useState<PreviewLoad>('connecting');
  const [path, setPath] = useState(sample ? SAMPLE_PREVIEW.path : '');
  const [reloads, setReloads] = useState(0);
  const [deployingSince, setDeployingSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const ports = useQuery({
    queryKey: ['desk', 'ports'],
    queryFn: () => pageCalls!.ports(),
    enabled: pageCalls !== null,
    staleTime: 15_000,
    retry: false,
  });

  // A ticket is spent on the page's first load; after that the page's own
  // cookie lets reloads through, so it is asked for once per visit.
  const ticket = useQuery({
    queryKey: ['desk', 'preview-ticket', port],
    queryFn: () => calls!.ticket({ kind: 'view', port }),
    enabled: calls !== null && Number.isInteger(port),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
  });

  useEffect(() => {
    if (deployingSince === null) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, [deployingSince]);

  const process = ports.data?.find((candidate) => candidate.port === port)?.process ?? null;
  const deploy: PreviewDeploy = !sample
    ? { kind: 'blocked', reason: "deploy comes once the pc can run this project's $deploy" }
    : deployingSince === null
      ? { kind: 'ready', target: SAMPLE_PREVIEW.deployTarget }
      : { kind: 'deploying', command: SAMPLE_PREVIEW.deployCommand, seconds: Math.max(0, Math.round((now - deployingSince) / 1000)) };

  const unreachable = sample
    ? 'a sample page — a real one loads here from the pc'
    : onPc
      ? null
      : !calls
        ? `${link.name} is not on this network — a page opens over the same wi-fi`
        : ticket.error
          ? readError(ticket.error)
          : null;

  return {
    sample,
    title: 'try it before it ships',
    branch: sample ? SAMPLE_PREVIEW.branch : null,
    meta: sample ? SAMPLE_PREVIEW.meta : [process, `localhost:${port}`].filter(Boolean).join(' · '),
    size,
    onSize: setSize,
    address: previewAddress(link.name, port, path),
    load: sample ? ('live' as const) : unreachable ? ('gone' as const) : load,
    url: onPc ? `http://localhost:${port}` : (ticket.data ?? null),
    unreachable,
    reloads,
    page: {
      onLoadStart: () => setLoad('connecting'),
      onLoad: () => setLoad('live'),
      onError: () => setLoad('gone'),
      onUrl: (url: string) => setPath(pagePath(url)),
    },
    /** A page that loaded reloads itself; one that never did needs a fresh ticket. */
    reload: () => {
      if (sample) return;
      if (load === 'live') setReloads((count) => count + 1);
      else void ticket.refetch();
    },
    host: link.name,
    checks: sample ? SAMPLE_PREVIEW.checks : [],
    checksEmpty: "checks come once the pc runs this project's own check commands",
    deploy,
    onDeploy: () => sample && setDeployingSince(Date.now()),
    /** Back to the run that served it, or a new task when no run did. */
    tellAgent: () =>
      router.push((sample ? `/desk/run/${SAMPLE_PREVIEW.runId}` : '/desk/new') as Href),
  };
}

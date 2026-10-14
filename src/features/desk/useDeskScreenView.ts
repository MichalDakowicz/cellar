import * as ScreenOrientation from 'expo-screen-orientation';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { pagePath } from '@/lib/deskPreview';
import { screenHint, screenStatus, type ScreenLoad, type ScreenMode } from '@/lib/deskScreen';
import type { ScreenAccess, ScreenInput } from '@/lib/deskRemote';
import { useDeskPrefs } from '@/store/deskPrefs';
import { useDeskLink } from './useDeskLink';

export function useDeskScreenView() {
  const link = useDeskLink(); const sample = useDeskPrefs((s) => s.sample);
  const calls = link.can.local && !sample ? link.calls : null;
  const [mode, setMode] = useState<ScreenMode>('touch');
  const [load, setLoad] = useState<ScreenLoad>('connecting');
  const [session, setSession] = useState<{ access: ScreenAccess; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const switchingRef = useRef(false);
  const sequence = useRef(0); const queue = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    return () => { void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); };
  }, []);
  useEffect(() => {
    let active = true; let access: ScreenAccess | null = null;
    setSession(null); setError(null); setLoad('connecting'); sequence.current = 0;
    if (!calls) return;
    void (async () => {
      access = await calls.screenAccess();
      if (!active) { await calls.screenRelease(access.id); return; }
      const url = await calls.ticket({ kind: 'screen', accessId: access.id });
      if (!active) { await calls.screenRelease(access.id); return; }
      setSession({ access, url });
    })().catch((e) => { if (access) void calls.screenRelease(access.id).catch(() => {}); if (active) setError(String(e)); });
    const background = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { active = false; if (access) void calls.screenRelease(access.id).catch(() => {}); setSession(null); setError('Screen ended in background. Leave and reopen it.'); }
    });
    return () => { active = false; background.remove(); if (access) void calls.screenRelease(access.id).catch(() => {}); };
  }, [calls, link.ownerId]);
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => { setSession(null); setError('Screen session expired. Leave and reopen it.'); void calls?.screenRelease(session.access.id).catch(() => {}); }, Math.max(0, session.access.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session, calls]);
  const controls = !!session && !error && !switching && load === 'live';
  async function nextDisplay() {
    if (!calls || !session || switching || !session.access.displays?.length) return;
    const list = session.access.displays; const next = list[(list.findIndex((d) => d.id === session.access.displayId) + 1) % list.length];
    switchingRef.current = true; setSwitching(true); setLoad('connecting');
    try { const access = await calls.screenDisplay(session.access.id, next.id); const url = await calls.ticket({ kind: 'screen', accessId: access.id }); setError(null); setSession({ access, url }); }
    catch (e) { setError(String(e)); setSession(null); void calls.screenRelease(session.access.id).catch(() => {}); }
    finally { switchingRef.current = false; setSwitching(false); }
  }
  function input(input: ScreenInput) {
    if (!calls || !session || !controls) return;
    const id = session.access.id; const next = ++sequence.current;
    queue.current = queue.current.catch(() => {}).then(() => calls.screenInput(id, next, input)).catch((e) => { setError(String(e)); setSession(null); void calls.screenRelease(id).catch(() => {}); });
  }
  const unreachable = error ?? (!calls && !sample ? `${link.name} needs a direct LAN connection for its screen` : null);
  return {
    name: sample ? 'michu-pc · sample desk' : link.name, sample,
    status: screenStatus(sample ? 'live' : unreachable ? 'gone' : load), url: session?.url ?? null,
    unreachable, mode, onMode: setMode, hint: screenHint(mode, controls),
    access: session?.access ?? null, controls, input,
    display: session?.access.displays?.find((d) => d.id === session.access.displayId)?.name, canSwitch: (session?.access.displays?.length ?? 0) > 1, switching, nextDisplay,
    page: { autoPlay: true, onMessage: (message: string) => { if (switchingRef.current) return; try { const row = JSON.parse(message); if (row.type === 'screen-video' && row.state === 'live') setLoad('live'); if (row.type === 'screen-video' && row.state === 'gone') { setLoad('gone'); setError(typeof row.error === 'string' ? row.error : 'Video disconnected.'); } } catch { /* Ignore unrelated page messages. */ } }, onLoadStart: () => {}, onLoad: () => {}, onError: () => { if (switchingRef.current) return; setLoad('gone'); if (session) void calls?.screenRelease(session.access.id).catch(() => {}); }, onUrl: (url: string) => { if (pagePath(url) === '/screen') setLoad('connecting'); } },
  };
}

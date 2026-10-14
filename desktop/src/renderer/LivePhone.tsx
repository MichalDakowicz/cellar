import { useCallback, useEffect, useRef, useState } from 'react';
import type { PhoneAction } from '@/lib/deskRemote';
import { calls } from './client';
import { useHostQuery } from './useHostQuery';
import { useAccountPreferences } from './accountPreferences';
import { PhoneVideo } from './PhoneVideo';

const read = () => calls.phones();
export function LivePhone() {
  const prefs = useAccountPreferences();
  const query = useHostQuery(true, read, 'phones', 3000);
  const [serial, setSerial] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  const [size, setSize] = useState({ width: 1, height: 1 }); const [taps, setTaps] = useState<{ x: number; y: number; at: number }[]>([]);
  const [link, setLink] = useState(''); const [text, setText] = useState(''); const [pkg, setPkg] = useState(''); const [logs, setLogs] = useState('');
  const [apks, setApks] = useState<Awaited<ReturnType<typeof calls.apks>>>([]);
  const [paused, setPaused] = useState(false); const start = useRef<{ x: number; y: number } | null>(null);
  const selected = serial || query.data?.devices.find((d) => d.state === 'device')?.serial || '';
  useEffect(() => { if (!serial && selected) setSerial(selected); }, [serial, selected]);
  useEffect(() => { void calls.apks().then(setApks).catch((e) => setMessage(String(e))); }, []);
  const act = useCallback(async (action: Omit<PhoneAction, 'serial'>) => {
    setBusy(true); setMessage('');
    try { const result = await calls.phoneAction({ ...action, ...(action.action === 'tap' || action.action === 'swipe' ? { frameSize: size } : {}), serial: selected }); setMessage(result.output ?? 'Applied on phone.'); if (action.action === 'driver' || action.action === 'agentAccess') query.refresh(); }
    catch (e) { setMessage(String(e)); } finally { setBusy(false); }
  }, [selected, query, size]);
  const driving = query.data?.driver === 'you';
  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const b = event.currentTarget.getBoundingClientRect();
    return { x: Math.round(Math.max(0, Math.min(1, (event.clientX - b.left) / b.width)) * (size.width - 1)), y: Math.round(Math.max(0, Math.min(1, (event.clientY - b.top) / b.height)) * (size.height - 1)) };
  };
  return <section className="page stack"><header><h1>phone</h1><p className="muted">USB or an already connected wireless ADB device · low-latency video inside Cellar</p></header>
    <div className="chips"><button onClick={query.refresh}>refresh devices</button><button onClick={() => void calls.screenRevoke().then(() => setMessage('PC screen trust revoked.')).catch((e) => setMessage(String(e)))}>revoke PC screen trust</button></div>
    {query.error && <p role="alert">{query.error}</p>}
    <select aria-label="ADB device" value={selected} onChange={(e) => setSerial(e.target.value)}><option value="">choose phone</option>{query.data?.devices.map((d) => <option key={d.serial} value={d.serial} disabled={d.state !== 'device'}>{d.model} · {d.serial} · {d.state}</option>)}</select>
    {message && <p role="status">{message}</p>}
    {!!selected && <div className="device-columns"><section className="stack phone-mirror">
      <div className="segments" role="group" aria-label="phone driver">{(['watch', 'you', 'agent'] as const).map((driver) => <button key={driver} disabled={busy || (driver === 'agent' && !query.data?.agentAccess)} aria-pressed={query.data?.driver === driver} onClick={() => void act({ action: 'driver', value: driver })}>{driver === 'you' ? 'I drive' : driver === 'agent' ? 'agent drives' : 'just watch'}</button>)}</div>
      <label className="row"><input type="checkbox" disabled={prefs.loading || busy} checked={prefs.settings.agentDevice} onChange={(e) => { const enabled = e.target.checked; void prefs.update({ agentDevice: enabled }).then(() => act({ action: 'agentAccess', enabled })).catch((e) => setMessage(String(e))); }} />allow agents to test on phone · account setting</label>
      <div style={{ position: 'relative', width: 300, maxWidth: '100%' }}><PhoneVideo serial={selected} paused={paused} onSize={setSize} onTaps={setTaps} onPointerDown={(e) => { if (!driving || busy) return; e.currentTarget.setPointerCapture(e.pointerId); start.current = point(e); }} onPointerUp={(e) => { if (!driving || !start.current || busy) return; const from = start.current; const to = point(e); start.current = null; void act(Math.hypot(from.x - to.x, from.y - to.y) < 15 ? { action: 'tap', ...to } : { action: 'swipe', ...from, x2: to.x, y2: to.y }); }} />{taps.map((tap) => <span key={tap.at} style={{ position: 'absolute', left: `${tap.x * 100}%`, top: `${tap.y * 100}%`, width: 28, height: 28, border: '3px solid #f59e0b', borderRadius: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />)}</div>
      <div className="chips">{['back', 'home', 'recent', 'power'].map((key) => <button key={key} disabled={!driving || busy} onClick={() => void act({ action: 'key', value: key })}>{key}</button>)}<button onClick={() => setPaused(!paused)}>{paused ? 'resume mirror' : 'pause mirror'}</button></div>
    </section><section className="stack device-tools">
      <h2 className="overline">install newest release</h2>{apks.map((apk) => <div className="settings-row" key={apk.app}><code>{apk.file}</code><button disabled={busy} onClick={() => void act({ action: 'install', value: apk.app })}>install update</button></div>)}
      <div className="row"><input aria-label="phone deep link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="cellar://desk" /><button disabled={busy || !link} onClick={() => void act({ action: 'link', value: link })}>open on phone</button></div>
      <div className="row"><input aria-label="text to type on phone" value={text} onChange={(e) => setText(e.target.value)} /><button disabled={busy || !driving || !text} onClick={() => void act({ action: 'text', value: text })}>type on phone</button></div>
      <h2 className="overline">developer toggles</h2><div className="chips">{['touches', 'bounds', 'awake'].map((value) => <span key={value}>{value} <button disabled={busy} onClick={() => void act({ action: 'toggle', value, enabled: true })}>on</button><button disabled={busy} onClick={() => void act({ action: 'toggle', value, enabled: false })}>off</button></span>)}</div>
      <h2 className="overline">last 200 logcat lines · running package</h2><div className="row"><input aria-label="Android package" value={pkg} onChange={(e) => setPkg(e.target.value)} /><button onClick={() => void calls.phoneLogs(selected, pkg).then((r) => setLogs(r.text)).catch((e) => setMessage(String(e)))}>read logcat</button></div><pre style={{ maxHeight: 320, overflow: 'auto' }}>{logs || 'No logs loaded.'}</pre>
    </section></div>}
  </section>;
}

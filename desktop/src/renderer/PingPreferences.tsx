import { useState } from 'react';
import { DEFAULT_PINGS, parsePingTime, pingTime, type PingPreferences as Preferences } from '@/lib/deskNotificationRouting';
import { supabase } from './auth';
import { useHostQuery } from './useHostQuery';
const load = async () => {
  const result = await supabase.from('cellar_notice_preferences').select('preferences').maybeSingle();
  if (result.error) throw result.error; return { ...DEFAULT_PINGS, utcOffset: -new Date().getTimezoneOffset(), ...result.data?.preferences } as Preferences;
};
export function PingPreferences() {
  const query = useHostQuery(true, load, 'notification-preferences');
  return query.data ? <PingForm key={JSON.stringify(query.data)} preferences={query.data} refresh={query.refresh} /> : <p role="status">{query.error ?? 'Reading notification rules…'}</p>;
}
function PingForm({ preferences, refresh }: { preferences: Preferences; refresh: () => void }) {
  const [start, setStart] = useState(pingTime(preferences.quietStart));
  const [end, setEnd] = useState(pingTime(preferences.quietEnd));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(value: Preferences) {
    setBusy(true);
    try {
      const result = await supabase.from('cellar_notice_preferences').upsert({ preferences: { ...value, utcOffset: -new Date().getTimezoneOffset() } });
      if (result.error) throw result.error; setError(null); refresh();
    } catch (e) { setError(String(e)); } finally { setBusy(false); }
  }
  return <section className="stack">
    {(['approvals', 'questions', 'finished', 'checksFailed'] as const).map((key) => <label className="settings-row" key={key}>{key}<input type="checkbox" disabled={busy} checked={preferences[key]} onChange={(e) => void save({ ...preferences, [key]: e.target.checked })} /></label>)}
    <p className="muted">Quiet hours: only approvals and questions, to phone. Equal times disable quiet hours.</p>
    <div className="row"><input aria-label="quiet start" value={start} onChange={(e) => setStart(e.target.value)} /><input aria-label="quiet end" value={end} onChange={(e) => setEnd(e.target.value)} /><button disabled={busy} onClick={() => {
      const quietStart = parsePingTime(start), quietEnd = parsePingTime(end);
      if (quietStart === null || quietEnd === null) { setError('Use HH:MM, from 00:00 to 23:59.'); return; }
      void save({ ...preferences, quietStart, quietEnd });
    }}>save</button></div>
    {error && <p role="status">{error}</p>}
  </section>;
}

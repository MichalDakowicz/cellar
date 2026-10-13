import { useEffect, useState } from 'react';
import type { NoticePayload } from '@/lib/deskNotificationRouting';
import { notificationAction, noticeRoute } from '@/lib/deskNotificationAction';
import { calls, bridge } from './client';
import { supabase } from './auth';
import { navigate } from './useRoute';
import { useHostQuery } from './useHostQuery';
import type { Host } from './useHost';
import { saveRecord, saved } from './preferences';

type Delivery = { id: string; generation: number; payload?: NoticePayload; expiresAt?: number; dismiss?: boolean };
const load = async () => {
  const reply = await bridge!.request('GET', '/notice-deliveries');
  if (reply.status !== 200) throw new Error((reply.body as { error?: string }).error ?? 'Desk notification delivery unavailable.');
  return (reply.body as { deliveries: Delivery[] }).deliveries;
};
export function NoticeDock({ host }: { host: Host }) {
  const result = useHostQuery(host.live, load, host.key, 3000);
  const [notes, setNotes] = useState<Delivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const rows = result.data ?? [];
    setNotes(rows.filter((r) => !r.dismiss && r.payload));
    for (const row of rows) void bridge?.request('POST', '/notice-ack', { id: row.id, generation: row.generation, ack: row.dismiss ? 'dismissed' : 'shown' });
  }, [result.data]);
  async function act(row: Delivery, actionId: string) {
    const payload = row.payload!;
    const action = notificationAction(payload, actionId);
    const key = `${host.key}:${row.id}:${payload.requestId}:${actionId}`;
    const commandId = saved<Record<string, string>>('desk-notice-actions', 'ids', {})[key] ?? crypto.randomUUID();
    saveRecord('desk-notice-actions', 'ids', key, commandId);
    try {
      if (action.kind === 'approval' && payload.requestId) {
        const receipt = await calls.answerApproval({ commandId, requestId: payload.requestId, decision: action.decision, source: 'pc' });
        if (receipt.state !== 'confirmed') throw new Error(receipt.error ?? 'Decision not confirmed. Check original approval receipt.');
      } else if (action.kind === 'question' && payload.requestId) {
        const question = await supabase.from('cellar_entry_questions').select('options').eq('id', payload.requestId).single();
        if (question.error) throw question.error;
        const option = question.data.options[action.index];
        if (typeof option !== 'string') throw new Error('Question option expired.');
        const answer = await supabase.rpc('cellar_answer_notice_question', { p_command: commandId, p_question: payload.requestId, p_picks: [option], p_note: '' });
        if (answer.error) throw answer.error;
      } else {
        if (['finished', 'checksFailed'].includes(payload.kind)) { const closed = await supabase.rpc('cellar_close_finished_notice', { p_id: row.id }); if (closed.error) throw closed.error; }
        const route = noticeRoute(payload); if (route) navigate(route);
      }
      setError(null); result.refresh();
    } catch (e) { setError(String(e)); }
  }
  if (!host.live || result.error) return null;
  return <aside className="notice-dock stack" aria-label="desk notifications">{notes.filter((n) => n.payload && (n.expiresAt ?? 0) > now).map((row) => <section className="card stack" key={row.id}>
    <small className="overline">{row.payload!.note.head}</small><strong>{row.payload!.note.title}</strong><p>{row.payload!.note.body.join(' · ')}</p>
    <div className="chips">{row.payload!.note.actions.map((a) => <button key={a.id} onClick={() => void act(row, a.id)}>{a.label}</button>)}</div>
  </section>)}{error && <p role="status">{error}</p>}</aside>;
}

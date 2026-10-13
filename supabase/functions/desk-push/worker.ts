import type { SupabaseClient } from '@supabase/supabase-js';
import { questionNote } from '@/lib/deskNotify';
import { notificationTarget, DEFAULT_PINGS, type NoticePayload, type PingPreferences } from '../../../src/lib/deskNotificationRouting.ts';
import { pushWake } from './fcm.ts';

export async function work(client: SupabaseClient) {
  const now = Date.now();
  const questions = await client.from('cellar_entry_questions').select('id,user_id,entry_id,question,options,agent,created_at').is('answered_at', null).is('dismissed_at', null).order('created_at').limit(500);
  if (questions.error) throw questions.error;
  if (questions.data?.length === 500) throw new Error('Question backlog exceeds this worker page; refusing incomplete reconciliation.');
  const existing = await client.from('cellar_notices').select('*').limit(2000);
  if (existing.error) throw existing.error;
  if (existing.data?.length === 2000) throw new Error('Notification backlog exceeds this worker page; refusing incomplete reconciliation.');
  const desks = await client.from('cellar_desks').select('id,user_id,name,runs,seen_at');
  if (desks.error) throw desks.error;
  const updates = new Map<string, { owner: string; id: string; payload: NoticePayload }>();
  for (const q of questions.data ?? []) {
    const desk = desks.data?.find((d) => d.user_id === q.user_id && Array.isArray(d.runs) && d.runs.some((r: { entryIds?: string[]; entryId?: string }) => r.entryIds?.includes(q.entry_id) || r.entryId === q.entry_id));
    const run = desk?.runs.find((r: { entryIds?: string[]; entryId?: string }) => r.entryIds?.includes(q.entry_id) || r.entryId === q.entry_id);
    const id = run ? `run:${desk!.id}:${run.id}` : `entry:${q.entry_id}`;
    if (updates.has(`${q.user_id}:${id}`)) continue;
    const old = existing.data?.find((n) => n.user_id === q.user_id && n.id === id);
    if (old?.payload?.kind === 'approval' && old.payload.active && desk && now - Date.parse(desk.seen_at) < 90_000) continue;
    const note = questionNote({ id: q.id, agent: q.agent, where: desk?.name ?? 'cellar', question: q.question, options: Array.isArray(q.options) ? q.options : [] });
    updates.set(`${q.user_id}:${id}`, { owner: q.user_id, id, payload: { note: { ...note, id }, kind: 'question', active: true, requestId: q.id, entryId: q.entry_id,
      route: run ? `/desk/run/${run.id}` : `/entry/${q.entry_id}`, ...(run ? { deskId: desk!.id, runId: run.id } : {}) } });
  }
  for (const n of existing.data ?? []) {
    if (n.payload?.kind === 'question' && !updates.has(`${n.user_id}:${n.id}`)) {
      updates.set(`${n.user_id}:${n.id}`, { owner: n.user_id, id: n.id, payload: { ...n.payload, active: false, refresh: false } });
    }
  }
  for (const u of updates.values()) {
    const result = await client.rpc('cellar_publish_notice', { p_owner: u.owner, p_id: u.id, p_payload: u.payload }); if (result.error) throw result.error;
  }
  const [notes, devices, preferences, settings] = await Promise.all([
    client.from('cellar_notices').select('*').limit(2000), client.from('cellar_notice_devices').select('*'),
    client.from('cellar_notice_preferences').select('*'), client.from('cellar_settings').select('user_id,notify_questions'),
  ]);
  for (const result of [notes, devices, preferences, settings]) if (result.error) throw result.error;
  let sent = 0;
  for (const n of notes.data ?? []) {
    const payload = n.payload as NoticePayload;
    const prefs: PingPreferences = { ...DEFAULT_PINGS, ...preferences.data?.find((p) => p.user_id === n.user_id)?.preferences };
    if (settings.data?.find((s) => s.user_id === n.user_id)?.notify_questions === false) prefs.questions = false;
    const own = devices.data?.filter((d) => d.user_id === n.user_id) ?? [];
    const target = notificationTarget(payload, Date.parse(n.waiting_since), own.map((d) => ({ id: d.id, kind: d.kind, seenAt: Date.parse(d.seen_at), idleSeconds: d.idle_seconds, locked: d.locked, enabled: d.enabled })), prefs, now);
    const route = await client.rpc('cellar_route_notice', { p_owner: n.user_id, p_id: n.id, p_target: target });
    if (route.error) throw route.error;
    if (!route.data) continue;
    const device = own.find((d) => d.id === route.data.deviceId);
    if (device?.kind === 'phone' && device.token && (!n.last_sent_at || now - Date.parse(n.last_sent_at) >= 30_000)) {
      const outcome = await pushWake(device.token, n.id, route.data.generation);
      if (outcome === 'unregistered') await client.from('cellar_notice_devices').update({ enabled: false, token: null }).eq('user_id', n.user_id).eq('id', device.id);
      else { sent++; await client.from('cellar_notices').update({ last_sent_at: new Date(now).toISOString() }).eq('user_id', n.user_id).eq('id', n.id).eq('generation', route.data.generation); }
    }
  }
  return { sent };
}

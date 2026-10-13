import { createClient } from '@supabase/supabase-js';
import { noticeCategory, type NoticePayload } from '../../../src/lib/deskNotificationRouting.ts';
import { work } from './worker.ts';

const headers = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,apikey,content-type,x-client-info' };
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers });
const hash = async (secret: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (request.method !== 'POST') return reply({ error: 'POST required.' }, 405);
  try {
    const body = await request.json();
    const client = admin();
    if (body.kind === 'worker') {
      const secret = Deno.env.get('CELLAR_PUSH_CRON_SECRET');
      if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return reply({ error: 'Not authorized.' }, 401);
      return reply(await work(client));
    }
    if (['delivery', 'ack'].includes(body.kind)) {
      if (typeof body.secret !== 'string' || body.secret.length < 32 || typeof body.deviceId !== 'string') return reply({ error: 'Not authorized.' }, 401);
      const device = await client.from('cellar_notice_devices').select('user_id,id,enabled').eq('id', body.deviceId).eq('secret_hash', await hash(body.secret)).maybeSingle();
      if (device.error || !device.data) return reply({ error: 'Not authorized.' }, 401);
      if (body.kind === 'delivery' && !device.data.enabled) return reply({ error: 'Device disabled.' }, 403);
      const result = await client.rpc('cellar_notice_delivery', { p_owner: device.data.user_id, p_device: device.data.id, p_id: body.id,
        p_generation: body.generation, p_ack: body.kind === 'ack' ? body.ack : null });
      if (result.error) throw result.error;
      if (!result.data) return reply({ stale: true }, 409);
      const payload = result.data.payload as NoticePayload | undefined;
      return reply(payload ? { ...result.data, category: noticeCategory(payload) } : result.data);
    }
    const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
    if (!token) return reply({ error: 'Sign in first.' }, 401);
    const user = await client.auth.getUser(token);
    if (user.error || !user.data.user) return reply({ error: 'Sign in first.' }, 401);
    const owner = user.data.user.id;
    if (body.kind === 'register') {
      if (typeof body.deviceId !== 'string' || !/^[a-f0-9-]{36}$/i.test(body.deviceId) || typeof body.token !== 'string' || body.token.length > 4096) return reply({ error: 'Invalid push registration.' }, 400);
      // A new secret replaces the previous one; native storage belongs to this account only.
      const secret = `${crypto.randomUUID()}${crypto.randomUUID()}`;
      const result = await client.from('cellar_notice_devices').upsert({ user_id: owner, id: body.deviceId, kind: 'phone', token: body.token,
        secret_hash: await hash(secret), enabled: true, seen_at: new Date().toISOString() }, { onConflict: 'user_id,id' });
      if (result.error) throw result.error;
      const timezone = await client.rpc('cellar_notice_timezone', { p_owner: owner, p_offset: Number.isInteger(body.utcOffset) && Math.abs(body.utcOffset) <= 840 ? body.utcOffset : 0 });
      if (timezone.error) throw timezone.error;
      return reply({ secret, endpoint: `${Deno.env.get('SUPABASE_URL')}/functions/v1/desk-push` });
    }
    if (body.kind === 'desk-delivery' || body.kind === 'desk-ack') {
      if (typeof body.deviceId !== 'string' || !body.deviceId.startsWith('desk:')) return reply({ error: 'Invalid desk device.' }, 400);
      const device = await client.from('cellar_notice_devices').select('id').eq('user_id', owner).eq('id', body.deviceId).eq('kind', 'desk').eq('enabled', true).maybeSingle();
      if (device.error || !device.data) return reply({ error: 'Desk not registered.' }, 403);
      const result = await client.rpc('cellar_notice_delivery', { p_owner: owner, p_device: body.deviceId, p_id: body.id, p_generation: body.generation, p_ack: body.kind === 'desk-ack' ? body.ack : null });
      if (result.error) throw result.error;
      return result.data ? reply(result.data) : reply({ stale: true }, 409);
    }
    return reply({ error: 'Unknown request.' }, 400);
  } catch (error) {
    console.error('Desk push failed', error instanceof Error ? error.message : String(error));
    return reply({ error: 'Push operation failed. Check service configuration and logs.' }, 503);
  }
});

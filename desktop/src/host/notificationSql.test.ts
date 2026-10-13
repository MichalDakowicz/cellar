import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('W14 reruns, owner boundaries, first question answer wins and dismissal fences routing', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001', other = '00000000-0000-4000-8000-000000000002';
  const entry = '00000000-0000-4000-8000-000000000003', question = '00000000-0000-4000-8000-000000000004';
  const command = '00000000-0000-4000-8000-000000000005';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('qa.uid',true),'')::uuid$$;
      grant usage on schema auth to authenticated,service_role; grant execute on function auth.uid() to authenticated,service_role;
      create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}');
      create table public.cellar_entries(id uuid primary key,user_id uuid,state text,agent text);
      create table public.cellar_entry_questions(id uuid primary key,user_id uuid,entry_id uuid,options jsonb,answer text,answer_picks text[],answer_note text,answered_at timestamptz,answered_via text,dismissed_at timestamptz);
      alter table public.cellar_entries enable row level security; alter table public.cellar_entry_questions enable row level security;
      create policy owner on public.cellar_entries for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
      create policy owner on public.cellar_entry_questions for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
      grant select,insert,update on public.cellar_entries,public.cellar_entry_questions to authenticated,service_role;
      insert into public.cellar_entries values('${entry}','${owner}','blocked',null);`);
    const sql = readFileSync(new URL('../../../supabase/desk-w14.sql', import.meta.url), 'utf8');
    await db.exec(sql); await db.exec(sql);
    await db.exec(`set role authenticated; set qa.uid='${owner}'; insert into public.cellar_entry_questions(id,user_id,entry_id,options) values('${question}','${owner}','${entry}','["alpha","beta"]');`);
    const answer = () => db.query('select public.cellar_answer_notice_question($1,$2,$3,$4) receipt', [command, question, '["beta"]', 'keep notes']);
    assert.equal((await answer()).rows.length, 1); assert.equal((await answer()).rows.length, 1);
    assert.deepEqual((await db.query<{ answer_picks: string[] }>('select answer_picks from public.cellar_entry_questions')).rows[0].answer_picks, ['beta']);
    assert.equal((await db.query<{ state: string }>('select state from public.cellar_entries')).rows[0].state, 'open');
    await assert.rejects(db.query('select public.cellar_answer_notice_question($1,$2,$3,$4)', [other, question, '["alpha"]', '']), /settled/);
    await assert.rejects(db.query('select public.cellar_answer_notice_question($1,$2,$3,$4)', [command, question, '["alpha"]', '']), /another choice/);
    await assert.rejects(db.query('select public.cellar_route_notice($1,$2,$3)', [owner, 'test', 'desk:pc']), /permission denied/);
    await assert.rejects(db.query('select public.cellar_publish_notice($1,$2,$3)', ['test', '{}', other]), /owned/);
    await db.exec(`set qa.uid='${other}'`); assert.equal((await db.query('select * from public.cellar_notices')).rows.length, 0);
    await db.exec(`reset role; set role service_role; set qa.uid=''`);
    const payload = JSON.stringify({ active: true, kind: 'approval', requestId: 'ask', note: { title: 'approval' } });
    await db.query('select public.cellar_publish_notice($1,$2,$3)', ['run:pc:abc', payload, owner]);
    const route = async (target: string | null) => (await db.query<{ result: { deviceId: string; generation: number; dismiss: boolean } }>('select public.cellar_route_notice($1,$2,$3) result', [owner, 'run:pc:abc', target])).rows[0].result;
    const deliver = async (device: string, gen: number, ack: string | null = null) => (await db.query<{ result: unknown }>('select public.cellar_notice_delivery($1,$2,$3,$4,$5) result', [owner, device, 'run:pc:abc', gen, ack])).rows[0].result;
    const desk = await route('desk:pc'); assert.equal(desk.deviceId, 'desk:pc');
    assert.ok(await deliver('desk:pc', desk.generation)); await deliver('desk:pc', desk.generation, 'shown');
    const move = await route('phone'); assert.equal(move.deviceId, 'desk:pc'); assert.equal(move.dismiss, true);
    assert.equal(await deliver('phone', move.generation), null); assert.equal(await deliver('desk:pc', desk.generation, 'shown'), null);
    assert.equal((await route('phone')).generation, move.generation);
    await deliver('desk:pc', move.generation, 'dismissed');
    const phone = await route('phone'); assert.equal(phone.deviceId, 'phone'); assert.equal(phone.dismiss, false);
    assert.ok(await deliver('phone', phone.generation)); assert.equal(await deliver('desk:pc', desk.generation), null);
    await deliver('phone', phone.generation, 'shown');
    const back = await route('desk:pc'); assert.equal(back.deviceId, 'phone'); assert.equal(back.dismiss, true);
    await deliver('phone', back.generation, 'dismissed');
    const desktop = await route('desk:pc'); await deliver('desk:pc', desktop.generation); await deliver('desk:pc', desktop.generation, 'shown');
    await db.query("update public.cellar_notices set lease_until=now()-interval '1 second' where id=$1", ['run:pc:abc']);
    assert.equal((await route('phone')).deviceId, 'phone'); // In-app desk lease expired before transfer.
  } finally { await db.close(); }
});

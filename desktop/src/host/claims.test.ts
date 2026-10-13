import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';

test('W3/W4 migrations rerun and claims enforce ownership, project and all-or-nothing reservation', async () => {
  const db = new PGlite();
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const project = '00000000-0000-4000-8000-000000000003';
  const command = '00000000-0000-4000-8000-000000000004';
  const ids = [5, 6, 7].map((id) => `00000000-0000-4000-8000-${String(id).padStart(12, '0')}`);
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('qa.uid',true),'')::uuid $$;
      grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;
      create table public.cellar_entries(id uuid primary key, user_id uuid not null, project_id uuid, state text default 'open', agent text, archived boolean default false);
      create table public.cellar_desks(id text); create table public.cellar_desk_requests(id uuid); create table public.cellar_entry_questions(id uuid, answer text);
      alter table public.cellar_entries enable row level security;
      create policy owner_all on public.cellar_entries for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
      grant select, update on public.cellar_entries to authenticated;`);
    for (let at = 0; at < 2; at++) for (const file of ['desk-w3.sql', 'desk-w4.sql']) {
      await db.exec(readFileSync(new URL(`../../../supabase/${file}`, import.meta.url), 'utf8'));
    }
    const privileges = await db.query<{ allowed: boolean }>("select has_function_privilege('anon','public.cellar_claim_run_entries(uuid[],uuid,text,uuid)','execute') allowed");
    assert.equal(privileges.rows[0].allowed, false);
    for (let at = 0; at < ids.length; at++) await db.query('insert into public.cellar_entries(id,user_id,project_id) values($1,$2,$3)', [ids[at], at === 2 ? other : owner, project]);
    await db.exec(`set role authenticated; set qa.uid='${owner}'`);
    const claim = (entries: string[], cmd = command, proj = project) => db.query('select public.cellar_claim_run_entries($1::uuid[],$2,$3,$4)', [entries, cmd, 'claude', proj]);
    await assert.rejects(claim([ids[0], ids[2]]), /unavailable/);
    assert.equal((await db.query<{ state: string }>('select state from public.cellar_entries where id=$1', [ids[0]])).rows[0].state, 'open');
    await assert.rejects(claim([ids[0], ids[0]]), /distinct/);
    await assert.rejects(claim([ids[0]], command, other), /another project/);
    await db.query("update public.cellar_entries set state='blocked' where id=$1", [ids[1]]);
    await assert.rejects(claim([ids[0], ids[1]]), /blocked/);
    await db.query("update public.cellar_entries set state='open' where id=$1", [ids[1]]);
    // Open entries created by MCP carry an author stamp, not an active claim.
    await db.query("update public.cellar_entries set agent='codex' where id=$1", [ids[0]]);
    await claim(ids.slice(0, 2));
    await claim(ids.slice(0, 2)); // Idempotent same-run claim.
    await assert.rejects(claim([ids[0]], other), /already claimed/);
    await db.query('select public.cellar_release_run_entries($1::uuid[],$2)', [ids.slice(0, 2), other]);
    assert.equal((await db.query<{ state: string }>('select state from public.cellar_entries where id=$1', [ids[0]])).rows[0].state, 'doing');
    await db.query('select public.cellar_release_run_entries($1::uuid[],$2)', [ids.slice(0, 2), command]);
    const rows = await db.query<{ state: string; desk_run_id: string | null }>('select state,desk_run_id from public.cellar_entries order by id');
    assert.ok(rows.rows.every((row) => row.state === 'open' && row.desk_run_id === null));
    assert.equal(rows.rows.length, 2); // Other account's row stays invisible.
    await claim([ids[0]]);
    await db.query("update public.cellar_entries set state='open',agent=null where id=$1", [ids[0]]);
    await claim([ids[0]], other); // A finished/released entry can be explicitly handed off again.
  } finally { await db.close(); }
});

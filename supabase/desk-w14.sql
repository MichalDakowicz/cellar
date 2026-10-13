-- W14 additive, rerunnable notification storage. Apply after schema.sql.
-- Clients operate on their own rows. Delivery coordination runs only as service_role.
begin;
create table if not exists public.cellar_notice_devices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 100),
  kind text not null check (kind in ('desk','phone')),
  token text, secret_hash text,
  seen_at timestamptz not null default now(), idle_seconds integer not null default 0 check (idle_seconds >= 0),
  locked boolean not null default false, enabled boolean not null default true,
  primary key(user_id,id)
);
create table if not exists public.cellar_notice_preferences (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  preferences jsonb not null default '{"approvals":true,"questions":true,"finished":true,"checksFailed":true,"quietStart":1380,"quietEnd":420,"utcOffset":0}'::jsonb
);
create table if not exists public.cellar_notices (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (length(id) between 1 and 150),
  payload jsonb not null check (octet_length(payload::text) <= 16000),
  revision integer not null default 1,
  waiting_since timestamptz not null default now(),
  target text, desired text, generation integer not null default 1,
  phase text not null default 'ready' check (phase in ('ready','delivering','shown','dismissing')),
  delivered_revision integer not null default 0,
  last_sent_at timestamptz,
  lease_until timestamptz,
  primary key(user_id,id)
);
create table if not exists public.cellar_notice_actions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id uuid not null, desk_id text not null, payload jsonb not null,
  receipt jsonb, created_at timestamptz not null default now(),
  primary key(user_id,id)
);
create index if not exists cellar_notice_actions_pending on public.cellar_notice_actions(user_id,desk_id,created_at) where receipt is null;
create index if not exists cellar_notice_devices_secret on public.cellar_notice_devices(secret_hash) where secret_hash is not null;
alter table public.cellar_notice_devices enable row level security;
alter table public.cellar_notice_preferences enable row level security;
alter table public.cellar_notices enable row level security;
alter table public.cellar_notice_actions enable row level security;
drop policy if exists cellar_notice_devices_owner on public.cellar_notice_devices;
create policy cellar_notice_devices_owner on public.cellar_notice_devices for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists cellar_notice_preferences_owner on public.cellar_notice_preferences;
create policy cellar_notice_preferences_owner on public.cellar_notice_preferences for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists cellar_notices_owner on public.cellar_notices;
create policy cellar_notices_owner on public.cellar_notices for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
drop policy if exists cellar_notice_actions_owner on public.cellar_notice_actions;
create policy cellar_notice_actions_owner on public.cellar_notice_actions for all to authenticated
  using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.cellar_notice_devices,public.cellar_notice_preferences,public.cellar_notices,public.cellar_notice_actions to authenticated;
grant all on public.cellar_notice_devices,public.cellar_notice_preferences,public.cellar_notices,public.cellar_notice_actions to service_role;

create or replace function public.cellar_notice_timezone(p_owner uuid,p_offset integer)
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_offset not between -840 and 840 then raise exception 'Invalid timezone offset'; end if;
  insert into public.cellar_notice_preferences(user_id) values(p_owner) on conflict(user_id) do nothing;
  update public.cellar_notice_preferences set preferences=jsonb_set(preferences,'{utcOffset}',to_jsonb(p_offset)) where user_id=p_owner;
end $$;
revoke all on function public.cellar_notice_timezone(uuid,integer) from public,anon,authenticated;
grant execute on function public.cellar_notice_timezone(uuid,integer) to service_role;

create or replace function public.cellar_publish_notice(p_id text,p_payload jsonb,p_owner uuid default auth.uid())
returns void language plpgsql security invoker set search_path='' as $$
begin
  if p_owner is null or (p_owner is distinct from auth.uid() and current_user<>'service_role') then raise exception 'Sign in to publish owned notices'; end if;
  if not coalesce((p_payload->>'active')::boolean,false) and not exists(select 1 from public.cellar_notices where user_id=p_owner and id=p_id) then return; end if;
  if p_payload->>'kind' in ('finished','checksFailed') and exists(select 1 from public.cellar_notices where user_id=p_owner and id=p_id and payload->>'active'='false' and payload->'note'=p_payload->'note') then return; end if;
  insert into public.cellar_notices(user_id,id,payload) values(p_owner,p_id,p_payload)
  on conflict(user_id,id) do update set payload=excluded.payload,revision=cellar_notices.revision+1,generation=cellar_notices.generation+1,
    waiting_since=case when cellar_notices.payload->>'requestId' is distinct from excluded.payload->>'requestId' then now() else cellar_notices.waiting_since end
  where cellar_notices.payload is distinct from excluded.payload;
end $$;
revoke all on function public.cellar_publish_notice(text,jsonb,uuid) from public,anon;
grant execute on function public.cellar_publish_notice(text,jsonb,uuid) to authenticated,service_role;

-- Route transfer cannot assign a new target until the old one acknowledges dismissal.
create or replace function public.cellar_route_notice(p_owner uuid,p_id text,p_target text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.cellar_notices;
begin
  select * into n from public.cellar_notices where user_id=p_owner and id=p_id for update;
  if not found then return null; end if;
  if n.target like 'desk:%' and n.lease_until is not null and n.lease_until<now() then
    n.target:=null; n.delivered_revision:=0; n.phase:='ready';
  end if;
  if n.target is distinct from p_target then
    if n.target is not null and (n.delivered_revision>0 or n.phase in ('delivering','dismissing')) then
      if n.phase <> 'dismissing' then n.generation:=n.generation+1; end if;
      n.desired:=p_target; n.phase:='dismissing';
    else
      n.target:=p_target; n.desired:=p_target; n.generation:=n.generation+1; n.phase:='ready'; n.delivered_revision:=0;
    end if;
  elsif n.phase='dismissing' then n.desired:=p_target;
  elsif n.delivered_revision<n.revision and n.phase='shown' then n.phase:='ready'; n.generation:=n.generation+1;
  end if;
  update public.cellar_notices set target=n.target,desired=n.desired,generation=n.generation,phase=n.phase,delivered_revision=n.delivered_revision where user_id=p_owner and id=p_id;
  if n.target is null or n.phase='shown' then return null; end if;
  return jsonb_build_object('deviceId',n.target,'id',n.id,'generation',n.generation,'dismiss',n.phase='dismissing');
end $$;

create or replace function public.cellar_notice_delivery(p_owner uuid,p_device text,p_id text,p_generation integer,p_ack text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare n public.cellar_notices;
begin
  select * into n from public.cellar_notices where user_id=p_owner and id=p_id for update;
  if not found or n.target is distinct from p_device or n.generation<>p_generation then return null; end if;
  if p_ack='dismissed' then
    update public.cellar_notices set target=case when phase='dismissing' then desired else null end,phase='ready',delivered_revision=0,generation=generation+1,last_sent_at=null,lease_until=null where user_id=p_owner and id=p_id;
    return jsonb_build_object('ok',true);
  elsif p_ack='shown' and n.phase in ('ready','delivering') then
    update public.cellar_notices set phase='shown',delivered_revision=revision where user_id=p_owner and id=p_id;
    return jsonb_build_object('ok',true);
  elsif p_ack is not null then return null;
  elsif n.phase='dismissing' then return jsonb_build_object('dismiss',true);
  elsif n.phase='shown' and p_device like 'desk:%' then
    update public.cellar_notices set lease_until=now()+interval '45 seconds' where user_id=p_owner and id=p_id;
    return jsonb_build_object('dismiss',false,'payload',n.payload,'expiresAt',extract(epoch from now()+interval '45 seconds')*1000);
  elsif n.phase in ('ready','delivering') and (n.payload->>'active')::boolean then
    update public.cellar_notices set phase='delivering',lease_until=case when p_device like 'desk:%' then now()+interval '45 seconds' else null end where user_id=p_owner and id=p_id;
    return jsonb_build_object('dismiss',false,'payload',n.payload,'expiresAt',case when p_device like 'desk:%' then extract(epoch from now()+interval '45 seconds')*1000 else null end);
  end if;
  return null;
end $$;
revoke all on function public.cellar_route_notice(uuid,text,text), public.cellar_notice_delivery(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.cellar_route_notice(uuid,text,text), public.cellar_notice_delivery(uuid,text,text,integer,text) to service_role;

-- One atomic question answer, also used by notification actions. First answer wins.
create or replace function public.cellar_answer_notice_question(p_command uuid,p_question uuid,p_picks jsonb,p_note text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare q public.cellar_entry_questions; old public.cellar_notice_actions; value jsonb; answer_text text;
begin
  if auth.uid() is null then raise exception 'Sign in to answer questions'; end if;
  if p_picks is null or p_note is null or jsonb_typeof(p_picks)<>'array' or jsonb_array_length(p_picks)>8 or length(p_note)>8000 then raise exception 'Invalid answer'; end if;
  if (select count(distinct x) from jsonb_array_elements(p_picks) x)<>jsonb_array_length(p_picks) then raise exception 'Choose distinct options'; end if;
  select * into q from public.cellar_entry_questions where id=p_question and user_id=auth.uid() for update;
  if not found then raise exception 'Question unavailable'; end if;
  select * into old from public.cellar_notice_actions where user_id=auth.uid() and id=p_command;
  value:=jsonb_build_object('questionId',p_question,'picks',p_picks,'note',p_note);
  if found then
    if old.payload is distinct from value then raise exception 'Answer command belongs to another choice'; end if;
    return old.receipt;
  end if;
  if q.answered_at is not null or q.dismissed_at is not null then raise exception 'Question already settled'; end if;
  if exists(select 1 from jsonb_array_elements(p_picks) x where jsonb_typeof(x)<>'string' or not q.options @> jsonb_build_array(x)) then raise exception 'Choose offered options'; end if;
  if jsonb_array_length(p_picks)=0 and btrim(p_note)='' then raise exception 'Answer is empty'; end if;
  select string_agg(x,' + ') into answer_text from jsonb_array_elements_text(p_picks) x;
  answer_text:=coalesce(answer_text,'') || case when btrim(p_note)<>'' then case when answer_text is not null then ' — ' else '' end || btrim(p_note) else '' end;
  update public.cellar_entry_questions set answer=answer_text,answer_picks=array(select jsonb_array_elements_text(p_picks)),answer_note=nullif(btrim(p_note),''),answered_at=now(),answered_via='app' where id=p_question and user_id=auth.uid();
  update public.cellar_entries e set state='open',agent=null where e.id=q.entry_id and e.user_id=auth.uid() and e.state='blocked'
    and not exists(select 1 from public.cellar_entry_questions pending where pending.entry_id=e.id and pending.answered_at is null and pending.dismissed_at is null);
  value:=jsonb_build_object('state','confirmed','questionId',p_question);
  insert into public.cellar_notice_actions(user_id,id,desk_id,payload,receipt) values(auth.uid(),p_command,'question',jsonb_build_object('questionId',p_question,'picks',p_picks,'note',p_note),value);
  return value;
end $$;
revoke all on function public.cellar_answer_notice_question(uuid,uuid,jsonb,text) from public,anon;
grant execute on function public.cellar_answer_notice_question(uuid,uuid,jsonb,text) to authenticated;

create or replace function public.cellar_close_finished_notice(p_id text)
returns void language sql security invoker set search_path='' as $$
  update public.cellar_notices set payload=payload||'{"active":false}'::jsonb,revision=revision+1
    where user_id=auth.uid() and id=p_id and payload->>'kind' in ('finished','checksFailed');
$$;
revoke all on function public.cellar_close_finished_notice(text) from public,anon;
grant execute on function public.cellar_close_finished_notice(text) to authenticated;

create or replace function public.cellar_settle_questions(p_entry uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare changed integer;
begin
  update public.cellar_entries e set state='open',agent=null where id=p_entry and user_id=auth.uid() and state='blocked'
    and not exists(select 1 from public.cellar_entry_questions q where q.entry_id=e.id and q.answered_at is null and q.dismissed_at is null);
  get diagnostics changed=row_count; return changed>0;
end $$;
revoke all on function public.cellar_settle_questions(uuid) from public,anon;
grant execute on function public.cellar_settle_questions(uuid) to authenticated;

-- Instant enqueue, even when no client/host is running. Worker fills the canonical note.
create or replace function public.cellar_question_notice_wake()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.cellar_notices(user_id,id,payload) values(new.user_id,'entry:'||new.entry_id,
    jsonb_build_object('active',false,'kind','question','requestId',new.id,'entryId',new.entry_id,'route','/entry/'||new.entry_id,'refresh',true))
  on conflict(user_id,id) do update set payload=cellar_notices.payload||jsonb_build_object('refresh',true);
  return new;
end $$;
drop trigger if exists cellar_question_notice_wake on public.cellar_entry_questions;
create trigger cellar_question_notice_wake after insert or update on public.cellar_entry_questions for each row execute function public.cellar_question_notice_wake();
revoke all on function public.cellar_question_notice_wake() from public,anon,authenticated;
notify pgrst, 'reload schema';
commit;

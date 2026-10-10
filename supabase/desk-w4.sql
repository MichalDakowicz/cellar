-- W4: additive columns plus owner-scoped, atomic attachment reservations.
begin;
alter table public.cellar_entries add column if not exists desk_run_id uuid;
alter table public.cellar_desks add column if not exists task_protocol integer;
alter table public.cellar_desk_requests add column if not exists payload jsonb;
alter table public.cellar_desk_requests add column if not exists receipt jsonb;

create or replace function public.cellar_claim_run_entries(p_ids uuid[], p_command_id uuid, p_agent text, p_project_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare owner_id uuid := auth.uid();
begin
  if owner_id is null or p_command_id is null or p_project_id is null or p_agent is null or p_agent not in ('claude','codex','agy') then
    raise exception 'Invalid task claim';
  end if;
  if p_ids is null or cardinality(p_ids) > 20 or cardinality(p_ids) <> (select count(distinct id) from unnest(p_ids) id) then
    raise exception 'Attach up to 20 distinct entries';
  end if;
  perform id from public.cellar_entries where id = any(p_ids) and user_id = owner_id order by id for update;
  if (select count(*) from public.cellar_entries where id = any(p_ids) and user_id = owner_id) <> cardinality(p_ids) then
    raise exception 'An attachment is unavailable to this account';
  end if;
  if exists (select 1 from public.cellar_entries where id = any(p_ids) and
    (project_id is distinct from p_project_id or archived or not (
      (state = 'open' and desk_run_id is null) or (state = 'doing' and desk_run_id = p_command_id)))) then
    raise exception 'An attachment belongs to another project, is archived, blocked or already claimed';
  end if;
  update public.cellar_entries set state = 'doing', agent = p_agent, desk_run_id = p_command_id
    where id = any(p_ids) and user_id = owner_id;
end; $$;

create or replace function public.cellar_release_run_entries(p_ids uuid[], p_command_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null or p_command_id is null then raise exception 'Invalid task release'; end if;
  update public.cellar_entries set state = 'open', agent = null, desk_run_id = null
    where id = any(p_ids) and user_id = auth.uid() and desk_run_id = p_command_id and state = 'doing';
end; $$;
create or replace function public.cellar_clear_run_claim()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.state <> 'doing' or new.agent is null then new.desk_run_id := null; end if;
  return new;
end; $$;
drop trigger if exists cellar_entries_clear_run_claim on public.cellar_entries;
create trigger cellar_entries_clear_run_claim before update on public.cellar_entries
  for each row execute function public.cellar_clear_run_claim();
revoke all on function public.cellar_claim_run_entries(uuid[],uuid,text,uuid) from public, anon;
revoke all on function public.cellar_release_run_entries(uuid[],uuid) from public, anon;
grant execute on function public.cellar_claim_run_entries(uuid[],uuid,text,uuid) to authenticated;
grant execute on function public.cellar_release_run_entries(uuid[],uuid) to authenticated;
notify pgrst, 'reload schema';
commit;

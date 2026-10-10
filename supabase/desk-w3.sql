-- W3: additive, rerunnable; existing prose answers and owner RLS stay intact.
begin;
alter table public.cellar_entry_questions add column if not exists answer_picks text[];
alter table public.cellar_entry_questions add column if not exists answer_note text;
notify pgrst, 'reload schema';
commit;

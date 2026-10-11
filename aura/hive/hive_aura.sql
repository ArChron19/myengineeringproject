-- ============================================================================
-- HIVE-6 · Aura's brain: website visitors ask, a bee with a local model answers. No ports opened.
--   1. the website widget calls aura_ask(session, question, sections, history)  → one row, returns its id
--   2. a bee with BEE_AURA on (oci-bee-1 by default) claims the row, answers with its local model, writes the answer
--   3. the widget calls aura_poll(id, session) until status is done (about 3-20 s); aura_status() says if a brain is up
-- The publishable key can ONLY call these three functions (granted in hive_security.sql). It can't read the table.
-- Abuse limits: 500-char questions, 6 questions a minute per visitor session, 40 a minute for the whole site.
-- Rows older than a day are deleted. Idempotent.
-- ============================================================================
create table if not exists public.aura_questions (
  id          uuid primary key default gen_random_uuid(),
  session     text not null,
  question    text not null,
  sections    jsonb not null default '[]'::jsonb,
  history     jsonb not null default '[]'::jsonb,
  page        text not null default '',
  status      text not null default 'pending' check (status in ('pending', 'working', 'done', 'error')),
  answer      text,
  model       text,
  claimed_by  text,
  created_at  timestamptz not null default now(),
  answered_at timestamptz
);
create index if not exists aura_questions_pending on public.aura_questions (created_at) where status = 'pending';
create index if not exists aura_questions_session on public.aura_questions (session, created_at);
alter table public.aura_questions enable row level security;

create table if not exists public.aura_brain (
  device    text primary key,
  model     text,
  last_seen timestamptz not null default now()
);
alter table public.aura_brain enable row level security;

create or replace function public.aura_ask(p_session text, p_question text, p_sections jsonb default '[]'::jsonb,
                                           p_history jsonb default '[]'::jsonb, p_page text default '') returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare rid uuid;
begin
  if coalesce(p_session, '') !~ '^[A-Za-z0-9_-]{8,64}$' then raise exception 'bad session'; end if;
  if length(coalesce(trim(p_question), '')) = 0 or length(p_question) > 500 then raise exception 'question must be 1-500 characters'; end if;
  if jsonb_typeof(coalesce(p_sections, '[]')) <> 'array' or length(p_sections::text) > 1500 then raise exception 'bad sections'; end if;
  if jsonb_typeof(coalesce(p_history, '[]')) <> 'array' or length(p_history::text) > 3000 then raise exception 'history too long'; end if;
  if (select count(*) from aura_questions where session = p_session and created_at > now() - interval '1 minute') >= 6
    then raise exception 'slow down: too many questions this minute'; end if;
  if (select count(*) from aura_questions where created_at > now() - interval '1 minute') >= 40
    then raise exception 'busy: try again in a minute'; end if;
  delete from aura_questions where created_at < now() - interval '1 day';
  insert into aura_questions (session, question, sections, history, page)
  values (p_session, trim(p_question), coalesce(p_sections, '[]'), coalesce(p_history, '[]'), left(coalesce(p_page, ''), 300))
  returning id into rid;
  return rid;
end $$;

create or replace function public.aura_poll(p_id uuid, p_session text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('status', status, 'answer', answer, 'model', model)
                     from aura_questions where id = p_id and session = p_session), jsonb_build_object('status', 'missing'));
$$;

create or replace function public.aura_status() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('up', exists (select 1 from aura_brain where last_seen > now() - interval '90 seconds'),
                            'model', (select model from aura_brain order by last_seen desc limit 1));
$$;

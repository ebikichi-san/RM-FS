-- Diagnosis snapshots (scores, red cards, cognitive gap, raw answers).
-- Run in Supabase SQL editor if the table is not yet in the project.

create table if not exists public.diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  project_id text not null,
  session_id text,
  user_id text,
  department_name text not null default '',
  position_level text not null default 'STAFF',
  overall_score double precision not null default 0,
  overall_status text not null default 'YELLOW',
  gap_index double precision not null default 0,
  role_gap_index double precision not null default 0,
  high_alert boolean not null default false,
  red_card_forced boolean not null default false,
  unknown_count integer not null default 0,
  unknown_rate double precision not null default 0,
  answered_count integer not null default 0,
  answers_json jsonb not null default '[]'::jsonb,
  domains_json jsonb not null default '[]'::jsonb,
  domain_gaps_json jsonb not null default '[]'::jsonb,
  red_cards_json jsonb not null default '[]'::jsonb,
  black_box_risks_json jsonb not null default '[]'::jsonb,
  diagnosis_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists diagnosis_results_project_created_idx
  on public.diagnosis_results (project_id, created_at desc);

create index if not exists diagnosis_results_user_created_idx
  on public.diagnosis_results (user_id, created_at desc);

alter table public.diagnosis_results enable row level security;

drop policy if exists diagnosis_results_select on public.diagnosis_results;
drop policy if exists diagnosis_results_insert on public.diagnosis_results;

create policy diagnosis_results_select
  on public.diagnosis_results
  for select
  to anon, authenticated
  using (true);

create policy diagnosis_results_insert
  on public.diagnosis_results
  for insert
  to anon, authenticated
  with check (true);

grant select, insert on public.diagnosis_results to anon, authenticated;

-- REVIEW DRAFT ONLY — NOT APPLIED TO SUPABASE
-- BASE25 KOMBAT Phase 1 isolated schema.
-- Shared identity: public.players(id). No writes to Billiards/FIFA tables.
-- No triggers, match-write RPCs, Elo calculations, pot accounting or weekly crown logic.

begin;

create table if not exists public.kombat_fighters (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (length(btrim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  image_src text,
  tile_color text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kombat_weeks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open'
    check (status in ('open','final','frozen')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (starts_at)
);

create table if not exists public.kombat_config (
  id smallint primary key default 1 check (id = 1),
  pot_mode text not null default 'soon'
    check (pot_mode in ('live','fixed','soon')),
  fixed_pot_amount bigint not null default 0 check (fixed_pot_amount >= 0),
  pot_per_ranked_match bigint not null default 100 check (pot_per_ranked_match >= 0),
  final_format text not null default 'bo5' check (final_format in ('bo5')),
  qualifying_spots integer not null default 5 check (qualifying_spots > 0),
  fighter_min_sample integer not null default 10 check (fighter_min_sample > 0),
  fighter_s_tier_min numeric(5,2) not null default 75,
  fighter_a_tier_min numeric(5,2) not null default 65,
  fighter_b_tier_min numeric(5,2) not null default 50,
  updated_at timestamptz not null default now(),
  check (fighter_s_tier_min <= 100 and fighter_a_tier_min <= fighter_s_tier_min
    and fighter_b_tier_min <= fighter_a_tier_min)
);

insert into public.kombat_config (id) values (1)
on conflict (id) do nothing;

create table if not exists public.kombat_ratings (
  player_id uuid primary key references public.players(id) on delete restrict,
  all_time_elo integer not null default 1000 check (all_time_elo >= 0),
  weekly_rating integer not null default 1000 check (weekly_rating >= 0),
  ranked_wins integer not null default 0 check (ranked_wins >= 0),
  ranked_losses integer not null default 0 check (ranked_losses >= 0),
  current_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.kombat_matches (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references public.kombat_weeks(id) on delete restrict,
  player_one_id uuid not null references public.players(id) on delete restrict,
  player_two_id uuid not null references public.players(id) on delete restrict,
  fighter_one_id uuid not null references public.kombat_fighters(id) on delete restrict,
  fighter_two_id uuid not null references public.kombat_fighters(id) on delete restrict,
  match_type text not null check (match_type in ('ranked','casual')),
  format text not null check (format in ('bo3','bo5')),
  is_final boolean not null default false,
  winner_id uuid references public.players(id) on delete restrict,
  player_one_games_won smallint,
  player_two_games_won smallint,
  elo_one_before integer,
  elo_two_before integer,
  elo_one_after integer,
  elo_two_after integer,
  pot_contribution bigint not null default 0 check (pot_contribution >= 0),
  created_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  edited_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  created_at timestamptz not null default now(),
  check (player_one_id <> player_two_id),
  check (fighter_one_id <> fighter_two_id),
  check (winner_id is null or winner_id in (player_one_id, player_two_id)),
  check (
    (player_one_games_won is null and player_two_games_won is null)
    or
    (player_one_games_won is not null and player_two_games_won is not null
      and player_one_games_won >= 0 and player_two_games_won >= 0)
  ),
  check ((voided_at is null and void_reason is null) or voided_at is not null)
);

create table if not exists public.kombat_match_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.kombat_matches(id) on delete cascade,
  game_number smallint not null check (game_number between 1 and 5),
  winner_id uuid not null references public.players(id) on delete restrict,
  player_one_rounds smallint check (player_one_rounds is null or player_one_rounds >= 0),
  player_two_rounds smallint check (player_two_rounds is null or player_two_rounds >= 0),
  created_at timestamptz not null default now(),
  unique (match_id, game_number)
);

create table if not exists public.kombat_audit_log (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in
    ('publish_match','edit_match','void_match','change_pot_config','crown_week')),
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists kombat_matches_published_idx
  on public.kombat_matches (published_at desc)
  where published_at is not null and voided_at is null;
create index if not exists kombat_matches_week_idx
  on public.kombat_matches (week_id, published_at desc);
create index if not exists kombat_matches_player_one_idx
  on public.kombat_matches (player_one_id, published_at desc);
create index if not exists kombat_matches_player_two_idx
  on public.kombat_matches (player_two_id, published_at desc);
create index if not exists kombat_match_games_match_idx
  on public.kombat_match_games (match_id, game_number);

-- All tables are protected. Public clients get read-only access only.
alter table public.kombat_fighters enable row level security;
alter table public.kombat_weeks enable row level security;
alter table public.kombat_config enable row level security;
alter table public.kombat_ratings enable row level security;
alter table public.kombat_matches enable row level security;
alter table public.kombat_match_games enable row level security;
alter table public.kombat_audit_log enable row level security;

grant select on public.kombat_fighters, public.kombat_weeks,
  public.kombat_config, public.kombat_ratings, public.kombat_matches,
  public.kombat_match_games to anon, authenticated;

create policy kombat_fighters_public_read on public.kombat_fighters
  for select to anon, authenticated using (enabled);
create policy kombat_weeks_public_read on public.kombat_weeks
  for select to anon, authenticated using (true);
create policy kombat_config_public_read on public.kombat_config
  for select to anon, authenticated using (true);
create policy kombat_ratings_public_read on public.kombat_ratings
  for select to anon, authenticated using (true);
create policy kombat_matches_public_read on public.kombat_matches
  for select to anon, authenticated
  using (published_at is not null and voided_at is null);
create policy kombat_match_games_public_read on public.kombat_match_games
  for select to anon, authenticated
  using (exists (
    select 1 from public.kombat_matches m
    where m.id = match_id and m.published_at is not null and m.voided_at is null
  ));

-- No anon/authenticated policies or grants for audit log.
revoke all on public.kombat_audit_log from anon, authenticated;

commit;

-- REVIEW NOTES / KNOWN PHASE BOUNDARIES:
-- 1) This draft intentionally creates no match-writing RPC or admin write policy.
-- 2) Match/game cross-row validation (game winners belong to match participants,
--    series length/win threshold, final flags) must be enforced atomically in Phase 2 RPC.
-- 3) Role-aware Manager/Owner write policies belong with that RPC, using the
--    trusted private.current_staff_role() helper (not user-editable JWT metadata).
-- 4) Seed the 37-fighter roster only after its exact approved list is confirmed.
-- 5) Weekly snapshots, pot ledger and crown transaction are later-phase schema.

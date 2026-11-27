-- BASE25 KOMBAT schema review draft
-- STATUS: REVIEW ONLY. DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT APPROVAL.
-- Isolation rule: this migration creates ONLY kombat_* objects and references public.players(id)
-- as shared identity. It does not read/write Billiards or FIFA match/rating/pot tables.

begin;

create table public.kombat_fighters (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  image_src text,
  tile_color text,
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kombat_weeks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'open' check (status in ('open','final','frozen')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (starts_at)
);

create table public.kombat_config (
  singleton boolean primary key default true check (singleton),
  pot_mode text not null default 'soon' check (pot_mode in ('live','fixed','soon')),
  fixed_pot_amount bigint not null default 0 check (fixed_pot_amount >= 0),
  pot_per_ranked_match bigint not null default 100 check (pot_per_ranked_match >= 0),
  final_format text not null default 'bo5' check (final_format = 'bo5'),
  qualifying_spots integer not null default 5 check (qualifying_spots between 2 and 32),
  fighter_minimum_matches integer not null default 10 check (fighter_minimum_matches >= 1),
  fighter_tier_s numeric(5,2) not null default 75,
  fighter_tier_a numeric(5,2) not null default 65,
  fighter_tier_b numeric(5,2) not null default 50,
  updated_at timestamptz not null default now(),
  check (fighter_tier_s <= 100 and fighter_tier_a <= 100 and fighter_tier_b <= 100),
  check (fighter_tier_s >= fighter_tier_a and fighter_tier_a >= fighter_tier_b)
);

insert into public.kombat_config (singleton) values (true)
on conflict (singleton) do nothing;

create table public.kombat_ratings (
  player_id uuid primary key references public.players(id) on delete restrict,
  all_time_elo integer not null default 1000 check (all_time_elo >= 0),
  weekly_rating integer not null default 1000 check (weekly_rating >= 0),
  ranked_wins integer not null default 0 check (ranked_wins >= 0),
  ranked_losses integer not null default 0 check (ranked_losses >= 0),
  current_streak integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.kombat_matches (
  id uuid primary key default gen_random_uuid(),
  week_id uuid references public.kombat_weeks(id) on delete restrict,
  player_one_id uuid not null references public.players(id) on delete restrict,
  player_two_id uuid not null references public.players(id) on delete restrict,
  fighter_one_id uuid not null references public.kombat_fighters(id) on delete restrict,
  fighter_two_id uuid not null references public.kombat_fighters(id) on delete restrict,
  match_type text not null check (match_type in ('ranked','casual')),
  match_format text not null check (match_format in ('bo3','bo5')),
  is_final boolean not null default false,
  winner_id uuid references public.players(id) on delete restrict,
  player_one_games_won smallint,
  player_two_games_won smallint,
  player_one_elo_before integer,
  player_two_elo_before integer,
  player_one_elo_after integer,
  player_two_elo_after integer,
  pot_contribution bigint not null default 0 check (pot_contribution >= 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  published_at timestamptz,
  edited_at timestamptz,
  voided_at timestamptz,
  void_reason text,
  check (player_one_id <> player_two_id),
  check (fighter_one_id <> fighter_two_id),
  check (winner_id is null or winner_id in (player_one_id, player_two_id)),
  check (not is_final or match_format = 'bo5'),
  check (
    published_at is null or (
      winner_id is not null and
      player_one_games_won is not null and
      player_two_games_won is not null and
      player_one_games_won <> player_two_games_won
    )
  ),
  check (voided_at is null or nullif(trim(void_reason), '') is not null)
);

create table public.kombat_match_games (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.kombat_matches(id) on delete cascade,
  game_number smallint not null check (game_number between 1 and 5),
  winner_id uuid not null references public.players(id) on delete restrict,
  player_one_rounds smallint check (player_one_rounds is null or player_one_rounds >= 0),
  player_two_rounds smallint check (player_two_rounds is null or player_two_rounds >= 0),
  created_at timestamptz not null default now(),
  unique (match_id, game_number)
);

create table public.kombat_audit_log (
  id bigint generated always as identity primary key,
  match_id uuid references public.kombat_matches(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('publish','edit','void','pot_config_change','crown_week')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index kombat_matches_week_published_idx
  on public.kombat_matches (week_id, published_at desc)
  where published_at is not null and voided_at is null;
create index kombat_matches_player_one_idx on public.kombat_matches (player_one_id, created_at desc);
create index kombat_matches_player_two_idx on public.kombat_matches (player_two_id, created_at desc);
create index kombat_matches_winner_idx on public.kombat_matches (winner_id, created_at desc);
create index kombat_match_games_match_idx on public.kombat_match_games (match_id, game_number);
create index kombat_audit_log_match_idx on public.kombat_audit_log (match_id, created_at desc);

alter table public.kombat_fighters enable row level security;
alter table public.kombat_weeks enable row level security;
alter table public.kombat_config enable row level security;
alter table public.kombat_ratings enable row level security;
alter table public.kombat_matches enable row level security;
alter table public.kombat_match_games enable row level security;
alter table public.kombat_audit_log enable row level security;

-- Public read: only the public roster/config and published, non-voided competition records.
create policy kombat_fighters_public_read on public.kombat_fighters
  for select to anon, authenticated using (enabled);
create policy kombat_weeks_public_read on public.kombat_weeks
  for select to anon, authenticated using (true);
create policy kombat_config_public_read on public.kombat_config
  for select to anon, authenticated using (true);
create policy kombat_ratings_public_read on public.kombat_ratings
  for select to anon, authenticated using (true);
create policy kombat_matches_public_read on public.kombat_matches
  for select to anon, authenticated using (published_at is not null and voided_at is null);
create policy kombat_match_games_public_read on public.kombat_match_games
  for select to anon, authenticated using (
    exists (
      select 1 from public.kombat_matches m
      where m.id = match_id and m.published_at is not null and m.voided_at is null
    )
  );

-- Staff can inspect all Kombat rows, including unpublished records.
-- There are intentionally NO direct client INSERT/UPDATE/DELETE policies in Phase 1.
create policy kombat_fighters_staff_read on public.kombat_fighters
  for select to authenticated using ((select private.current_staff_role()) in ('owner','manager'));
create policy kombat_weeks_staff_read on public.kombat_weeks
  for select to authenticated using ((select private.current_staff_role()) in ('owner','manager'));
create policy kombat_config_staff_read on public.kombat_config
  for select to authenticated using ((select private.current_staff_role()) in ('owner','manager'));
create policy kombat_ratings_staff_read on public.kombat_ratings
  for select to authenticated using ((select private.current_staff_role()) in ('owner','manager'));
create policy kombat_matches_staff_read on public.kombat_matches
  for select to authenticated using ((select private.current_staff_role()) in ('owner','manager'));
create policy kombat_match_games_staff_read on public.kombat_match_games
  for select to authenticated using ((select private.current_staff_role()) in ('owner','manager'));
create policy kombat_audit_log_staff_read on public.kombat_audit_log
  for select to authenticated using ((select private.current_staff_role()) in ('owner','manager'));

commit;

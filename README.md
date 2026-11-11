# BASE25 PRO V1

A lean public competition board for BASE25. Public visitors can view rankings, profiles and match history. Only approved admins can register players and record/correct results.

## Stack
Next.js 15, React 19, Supabase Postgres/Auth/RLS.

## Environment
Copy .env.example to .env.local. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to the project URL and publishable key. Never expose a Supabase secret/service-role key in the browser.

## Admin setup
Create an Auth user in Supabase, then insert its UUID into public.admin_users using the SQL editor: insert into public.admin_users(user_id) values ('AUTH-USER-UUID'); Sign in at /admin.

## ELO
Players start at 1000. Standard Elo with K=32. Match corrections/deletions recalculate rating history. Balls remaining are recorded but do not affect ELO.

No player accounts, matchmaking, challenges, stakes, tournament registration or player-side score submission in V1.
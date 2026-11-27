-- BASE25 PRO — Mortal Kombat 11 fighter seed draft
-- REVIEW ONLY. Do not run against production without explicit approval.
-- Starting groups preserve the user's reference classification.
-- Dynamic fighter performance tiers are calculated separately from match data.
-- Re-running this seed updates only name/group metadata; it does not overwrite
-- enabled state, images, tile colors, or sort order.

insert into public.kombat_fighters (name, slug, starting_group)
values
  ('Cetrion', 'cetrion', 'A'),
  ('Jacqui Briggs', 'jacqui-briggs', 'A'),
  ('Liu Kang', 'liu-kang', 'A'),
  ('The Joker', 'the-joker', 'A'),
  ('Fujin', 'fujin', 'A'),
  ('Geras', 'geras', 'A'),
  ('Jade', 'jade', 'A'),
  ('Sub-Zero', 'sub-zero', 'B'),
  ('Shang Tsung', 'shang-tsung', 'B'),
  ('Kabal', 'kabal', 'B'),
  ('Kung Lao', 'kung-lao', 'B'),
  ('Erron Black', 'erron-black', 'B'),
  ('Kano', 'kano', 'B'),
  ('Noob Saibot', 'noob-saibot', 'B'),
  ('Cassie Cage', 'cassie-cage', 'B'),
  ('Johnny Cage', 'johnny-cage', 'B'),
  ('Kotal Kahn', 'kotal-kahn', 'B'),
  ('Spawn', 'spawn', 'B'),
  ('Sheeva', 'sheeva', 'C'),
  ('Raiden', 'raiden', 'C'),
  ('Jax', 'jax', 'C'),
  ('Kollector', 'kollector', 'C'),
  ('Terminator', 'terminator', 'C'),
  ('Scorpion', 'scorpion', 'C'),
  ('D’Vorah', 'dvorah', 'C'),
  ('Baraka', 'baraka', 'C'),
  ('Nightwolf', 'nightwolf', 'C'),
  ('Rain', 'rain', 'C'),
  ('Sindel', 'sindel', 'C'),
  ('Frost', 'frost', 'C'),
  ('Mileena', 'mileena', 'C'),
  ('Sonya Blade', 'sonya-blade', 'C'),
  ('Kitana', 'kitana', 'C'),
  ('Skarlet', 'skarlet', 'C'),
  ('RoboCop', 'robocop', 'C'),
  ('Shao Kahn', 'shao-kahn', 'D'),
  ('Rambo', 'rambo', 'D')
on conflict (slug) do update
set name = excluded.name,
    starting_group = excluded.starting_group,
    updated_at = now();

-- Expected roster count: 37 (A=7, B=11, C=17, D=2).

-- Add gender and deficit_kcal to profiles
alter table profiles
  add column if not exists gender text check (gender in ('male', 'female')),
  add column if not exists deficit_kcal integer default 500,
  add column if not exists full_name text;

-- Add note to body_weight_log
alter table body_weight_log
  add column if not exists note text;

-- Add unique constraint for upsert on body_weight_log
alter table body_weight_log
  drop constraint if exists body_weight_log_user_date_unique;
alter table body_weight_log
  add constraint body_weight_log_user_date_unique unique (user_id, date);

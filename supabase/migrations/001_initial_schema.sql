-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  name text not null,
  age integer not null,
  height_cm numeric not null,
  current_weight numeric not null,
  target_weight numeric not null,
  goal text not null check (goal in ('cut', 'bulk', 'maintain', 'recomp')),
  activity_level text not null check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  tdee integer not null,
  protein_target integer not null,
  carbs_target integer not null,
  fat_target integer not null,
  calorie_target integer not null,
  created_at timestamptz default now() not null
);

-- Food log
create table if not exists food_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  food_name text not null,
  brand text default '',
  kcal integer not null,
  protein numeric not null,
  carbs numeric not null,
  fat numeric not null,
  serving_g numeric not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  is_saved_meal boolean default false,
  created_at timestamptz default now() not null
);

-- Saved meals
create table if not exists saved_meals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  items jsonb not null default '[]',
  total_kcal integer not null,
  total_protein numeric not null,
  total_carbs numeric not null,
  total_fat numeric not null,
  created_at timestamptz default now() not null
);

-- Workouts
create table if not exists workouts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  name text not null,
  duration_min integer default 0,
  kcal_burned integer default 0,
  source text not null check (source in ('manual', 'apple_health')),
  apple_health_id text,
  created_at timestamptz default now() not null
);

-- Exercises
create table if not exists exercises (
  id uuid primary key default uuid_generate_v4(),
  workout_id uuid references workouts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  muscle_group text not null,
  sets jsonb not null default '[]',
  created_at timestamptz default now() not null
);

-- Body weight log
create table if not exists body_weight_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  weight_kg numeric not null,
  created_at timestamptz default now() not null
);

-- Indexes
create index if not exists food_log_user_date on food_log(user_id, date);
create index if not exists workouts_user_date on workouts(user_id, date);
create index if not exists body_weight_log_user_date on body_weight_log(user_id, date);

-- Enable RLS
alter table profiles enable row level security;
alter table food_log enable row level security;
alter table saved_meals enable row level security;
alter table workouts enable row level security;
alter table exercises enable row level security;
alter table body_weight_log enable row level security;

-- RLS Policies
create policy "Users can manage own profile" on profiles for all using (auth.uid() = user_id);
create policy "Users can manage own food_log" on food_log for all using (auth.uid() = user_id);
create policy "Users can manage own saved_meals" on saved_meals for all using (auth.uid() = user_id);
create policy "Users can manage own workouts" on workouts for all using (auth.uid() = user_id);
create policy "Users can manage own exercises" on exercises for all using (auth.uid() = user_id);
create policy "Users can manage own body_weight_log" on body_weight_log for all using (auth.uid() = user_id);

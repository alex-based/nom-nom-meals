create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table public.ingredient_categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.ingredient_catalog (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  category_id uuid references public.ingredient_categories(id) on delete set null,
  name text not null,
  normalized_name text not null,
  default_unit text not null,
  created_at timestamptz not null default now(),
  unique (household_id, normalized_name, default_unit)
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  meal_type text not null,
  base_servings numeric(10,2) not null default 1,
  prep_time_minutes integer not null default 0,
  cook_time_minutes integer not null default 0,
  calories_per_serving integer not null default 0,
  difficulty text not null default 'Easy',
  vegetarian boolean not null default false,
  high_protein boolean not null default false,
  budget_friendly boolean not null default false,
  comments text not null default '',
  instructions text not null default '',
  tags text[] not null default '{}',
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_catalog_id uuid references public.ingredient_catalog(id) on delete set null,
  category_id uuid references public.ingredient_categories(id) on delete set null,
  name text not null,
  quantity numeric(10,2) not null,
  unit text not null,
  note text not null default ''
);

create table public.weekly_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  iso_year integer not null,
  iso_week integer not null,
  created_at timestamptz not null default now(),
  unique (household_id, iso_year, iso_week)
);

create table public.weekly_plan_entries (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  entry_date date not null,
  meal_slot text not null,
  recipe_id uuid references public.recipes(id) on delete set null,
  planned_servings numeric(10,2) not null default 1,
  notes text not null default '',
  cooked boolean not null default false
);

create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  weekly_plan_id uuid not null references public.weekly_plans(id) on delete cascade,
  ingredient_catalog_id uuid references public.ingredient_catalog(id) on delete set null,
  category_id uuid references public.ingredient_categories(id) on delete set null,
  source_type text not null,
  name text not null,
  quantity numeric(10,2) not null,
  unit text not null,
  note text not null default '',
  bought boolean not null default false
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  ingredient_catalog_id uuid references public.ingredient_catalog(id) on delete set null,
  category_id uuid references public.ingredient_categories(id) on delete set null,
  name text not null,
  normalized_name text not null,
  quantity numeric(10,2) not null default 0,
  unit text not null,
  updated_at timestamptz not null default now(),
  unique (household_id, normalized_name, unit)
);

create table public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  pantry_item_id uuid references public.pantry_items(id) on delete set null,
  category_id uuid references public.ingredient_categories(id) on delete set null,
  transaction_type text not null,
  item_name text not null,
  quantity numeric(10,2) not null,
  unit text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create index weekly_plans_household_week_idx on public.weekly_plans (household_id, iso_year, iso_week);
create index weekly_plan_entries_plan_idx on public.weekly_plan_entries (weekly_plan_id, meal_slot, entry_date);
create index shopping_items_week_idx on public.shopping_items (weekly_plan_id, bought);
create index pantry_items_household_idx on public.pantry_items (household_id, normalized_name, unit);
create index inventory_transactions_household_idx on public.inventory_transactions (household_id, created_at desc);

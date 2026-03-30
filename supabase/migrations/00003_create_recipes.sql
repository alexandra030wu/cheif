create table public.recipes (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text,
  cuisine text,
  servings integer,
  prep_time_minutes integer,
  cook_time_minutes integer,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  ingredients jsonb not null,
  steps jsonb not null,
  nutrition_estimate jsonb,
  tags text[],
  generated_by text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.recipes enable row level security;

create policy "Recipes readable by authenticated users"
  on public.recipes for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = created_by);

create index recipes_created_by_idx on public.recipes(created_by);
create index recipes_tags_idx on public.recipes using gin(tags);

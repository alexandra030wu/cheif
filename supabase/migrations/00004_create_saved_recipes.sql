create table public.saved_recipes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  recipe_id uuid references public.recipes(id) on delete cascade not null,
  saved_at timestamptz default now(),
  unique (user_id, recipe_id)
);

alter table public.saved_recipes enable row level security;

create policy "Users can manage own saved recipes"
  on public.saved_recipes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index saved_recipes_user_id_idx on public.saved_recipes(user_id);

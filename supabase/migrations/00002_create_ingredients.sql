create table public.ingredients (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  category text not null,
  quantity numeric,
  unit text,
  expiry_date date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.ingredients enable row level security;

create policy "Users can manage own ingredients"
  on public.ingredients for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index ingredients_user_id_idx on public.ingredients(user_id);
create index ingredients_category_idx on public.ingredients(category);
create index ingredients_expiry_date_idx on public.ingredients(expiry_date);

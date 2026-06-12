-- Run once in Supabase → SQL Editor (matches backend/models.py)

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  github_url text,
  created_at timestamptz default now()
);

create table if not exists interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  github_meta jsonb,
  interview_type text default 'swe',
  status text default 'in_progress',
  score int,
  feedback text,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  interview_id uuid references interviews(id) not null,
  role text not null,
  content text not null,
  created_at timestamptz default now()
);

create index if not exists idx_messages_interview on messages(interview_id);
create index if not exists idx_interviews_user on interviews(user_id);

-- Sync Google sign-ins from auth.users → public.users automatically.
-- Run this after the tables above. Supabase Auth manages auth.users;
-- this trigger keeps public.users in sync so the interviews FK works.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

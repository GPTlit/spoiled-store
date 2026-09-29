create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.grant_admin_for_owner() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and lower(new.email) = 'salemmoustapha15@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id,'admin') on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger on_auth_user_created_grant_admin after insert on auth.users for each row execute function public.grant_admin_for_owner();
create trigger on_auth_user_confirmed_grant_admin after update of email_confirmed_at on auth.users for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null) execute function public.grant_admin_for_owner();

create table public.apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  tagline text,
  description text,
  category text default 'Apps',
  version text default '1.0.0',
  icon_url text,
  screenshots text[] not null default '{}',
  apk_url text,
  ipa_url text,
  source_type text not null default 'upload',
  source_url text,
  build_status text not null default 'ready',
  build_log text,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.apps to anon, authenticated;
grant insert, update, delete on public.apps to authenticated;
grant all on public.apps to service_role;
alter table public.apps enable row level security;
create policy "published apps public" on public.apps for select using (published = true or public.has_role(auth.uid(),'admin'));
create policy "admin insert apps" on public.apps for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update apps" on public.apps for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete apps" on public.apps for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references public.apps(id) on delete cascade,
  user_id uuid not null,
  author_name text,
  rating int not null default 5,
  comment text not null,
  created_at timestamptz not null default now()
);
grant select on public.feedback to anon, authenticated;
grant insert, delete on public.feedback to authenticated;
grant all on public.feedback to service_role;
alter table public.feedback enable row level security;
create policy "feedback public" on public.feedback for select using (true);
create policy "own feedback insert" on public.feedback for insert to authenticated with check (user_id = auth.uid() and rating between 1 and 5 and char_length(comment) between 1 and 1000);
create policy "own or admin delete" on public.feedback for delete to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
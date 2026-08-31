-- Um Milhão de Pixels Brasil — Etapa 2
-- Execute no SQL Editor do Supabase. O conector REST não executa DDL.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$'),
  display_name text,
  avatar_emoji text not null default '✦',
  avatar_path text,
  social_network text check (social_network in ('instagram', 'tiktok', 'youtube')),
  social_handle text,
  website text,
  bio text check (char_length(bio) <= 160),
  city text,
  consent_terms boolean not null default false,
  consent_privacy boolean not null default false,
  consent_marketing boolean not null default false,
  consent_public_profile boolean not null default false,
  consent_public_social boolean not null default false,
  consent_terms_at timestamptz,
  consent_privacy_at timestamptz,
  consent_marketing_at timestamptz,
  consent_public_profile_at timestamptz,
  consent_public_social_at timestamptz,
  consent_terms_version text,
  consent_privacy_version text,
  consent_marketing_version text,
  consent_public_profile_version text,
  consent_public_social_version text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_required_consents check (consent_terms and consent_privacy),
  constraint profiles_avatar_owner_path check (
    avatar_path is null or avatar_path like id::text || '/%'
  ),
  constraint profiles_social_pair check (
    (social_network is null and social_handle is null)
    or (social_network is not null and social_handle is not null and char_length(trim(social_handle)) between 1 and 80)
  )
);

alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists social_network text;
alter table public.profiles add column if not exists social_handle text;
alter table public.profiles add column if not exists consent_public_profile boolean not null default false;
alter table public.profiles add column if not exists consent_public_social boolean not null default false;
alter table public.profiles add column if not exists consent_terms_at timestamptz;
alter table public.profiles add column if not exists consent_privacy_at timestamptz;
alter table public.profiles add column if not exists consent_marketing_at timestamptz;
alter table public.profiles add column if not exists consent_public_profile_at timestamptz;
alter table public.profiles add column if not exists consent_public_social_at timestamptz;
alter table public.profiles add column if not exists consent_terms_version text;
alter table public.profiles add column if not exists consent_privacy_version text;
alter table public.profiles add column if not exists consent_marketing_version text;
alter table public.profiles add column if not exists consent_public_profile_version text;
alter table public.profiles add column if not exists consent_public_social_version text;

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_social_pair'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_social_pair check (
      (social_network is null and social_handle is null)
      or (social_network is not null and social_handle is not null and char_length(trim(social_handle)) between 1 and 80)
    );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_social_network_allowed'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_social_network_allowed check (
      social_network is null or social_network in ('instagram', 'tiktok', 'youtube')
    );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_public_social_requires_profile'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_public_social_requires_profile check (
      not consent_public_social or consent_public_profile
    );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_avatar_owner_path'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles add constraint profiles_avatar_owner_path check (
      avatar_path is null or avatar_path like id::text || '/%'
    );
  end if;
end;
$$;

create table if not exists public.pixel_blocks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  x integer not null check (x between 0 and 999),
  y integer not null check (y between 0 and 999),
  width integer not null check (width between 1 and 1000),
  height integer not null check (height between 1 and 1000),
  pixel_count integer generated always as (width * height) stored,
  artwork_path text,
  message text,
  instagram text,
  website text,
  status text not null default 'available' check (status in ('available', 'reserved', 'purchased', 'published', 'demo')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint pixel_blocks_inside_wall check (x + width <= 1000 and y + height <= 1000)
);

create table if not exists public.pixel_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pixel_block_id uuid not null references public.pixel_blocks(id) on delete restrict,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'BRL' check (currency = 'BRL'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  provider_reference text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.pixel_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  pixel_block_id uuid not null references public.pixel_blocks(id) on delete restrict,
  expires_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'converted', 'expired', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists active_pixel_reservation_key
  on public.pixel_reservations (pixel_block_id)
  where status = 'active';

create table if not exists public.pixel_likes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  pixel_block_id uuid not null references public.pixel_blocks(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, pixel_block_id)
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('profile_completed', 'pixel_reserved', 'pixel_purchased', 'pixel_published', 'like_added')),
  pixel_block_id uuid references public.pixel_blocks(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  icon text not null default '✦',
  unlocked_at timestamptz
);

create or replace function public.set_profile_consent_metadata()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());

  if tg_op = 'INSERT' then
    new.consent_terms_at = case when new.consent_terms then timezone('utc', now()) else null end;
    new.consent_terms_version = case when new.consent_terms then 'terms-v1' else null end;
    new.consent_privacy_at = case when new.consent_privacy then timezone('utc', now()) else null end;
    new.consent_privacy_version = case when new.consent_privacy then 'privacy-v1' else null end;
    new.consent_marketing_at = case when new.consent_marketing then timezone('utc', now()) else null end;
    new.consent_marketing_version = case when new.consent_marketing then 'marketing-v1' else null end;
    new.consent_public_profile_at = case when new.consent_public_profile then timezone('utc', now()) else null end;
    new.consent_public_profile_version = case when new.consent_public_profile then 'public-profile-v1' else null end;
    new.consent_public_social_at = case when new.consent_public_social then timezone('utc', now()) else null end;
    new.consent_public_social_version = case when new.consent_public_social then 'public-social-v1' else null end;
  else
    if new.consent_terms is distinct from old.consent_terms then
      new.consent_terms_at = case when new.consent_terms then timezone('utc', now()) else null end;
      new.consent_terms_version = case when new.consent_terms then 'terms-v1' else null end;
    end if;
    if new.consent_privacy is distinct from old.consent_privacy then
      new.consent_privacy_at = case when new.consent_privacy then timezone('utc', now()) else null end;
      new.consent_privacy_version = case when new.consent_privacy then 'privacy-v1' else null end;
    end if;
    if new.consent_marketing is distinct from old.consent_marketing then
      new.consent_marketing_at = case when new.consent_marketing then timezone('utc', now()) else null end;
      new.consent_marketing_version = case when new.consent_marketing then 'marketing-v1' else null end;
    end if;
    if new.consent_public_profile is distinct from old.consent_public_profile then
      new.consent_public_profile_at = case when new.consent_public_profile then timezone('utc', now()) else null end;
      new.consent_public_profile_version = case when new.consent_public_profile then 'public-profile-v1' else null end;
    end if;
    if new.consent_public_social is distinct from old.consent_public_social then
      new.consent_public_social_at = case when new.consent_public_social then timezone('utc', now()) else null end;
      new.consent_public_social_version = case when new.consent_public_social then 'public-social-v1' else null end;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_set_metadata on public.profiles;
create trigger profiles_set_metadata
before insert or update on public.profiles
for each row execute function public.set_profile_consent_metadata();

create or replace view public.public_profiles as
select
  id,
  username,
  display_name,
  avatar_emoji,
  case when consent_public_profile then avatar_path else null end as avatar_path,
  case when consent_public_social then social_network else null end as social_network,
  case when consent_public_social then social_handle else null end as social_handle,
  website,
  bio,
  city
from public.profiles
where onboarding_completed
  and consent_public_profile;

alter table public.profiles enable row level security;
alter table public.pixel_blocks enable row level security;
alter table public.pixel_purchases enable row level security;
alter table public.pixel_reservations enable row level security;
alter table public.pixel_likes enable row level security;
alter table public.activity_events enable row level security;
alter table public.achievements enable row level security;

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;
revoke all on table public.public_profiles from public;
grant select on table public.public_profiles to anon, authenticated;

drop policy if exists "profiles are publicly readable without email" on public.profiles;
drop policy if exists "users can read their own profile" on public.profiles;
create policy "users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "users can create their own profile" on public.profiles;
create policy "users can create their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "published blocks are public" on public.pixel_blocks;
create policy "published blocks are public"
  on public.pixel_blocks for select to anon, authenticated
  using (status in ('published', 'demo'));

drop policy if exists "owners can read their blocks" on public.pixel_blocks;
create policy "owners can read their blocks"
  on public.pixel_blocks for select to authenticated
  using (auth.uid() = owner_id);

drop policy if exists "authenticated users can create their blocks" on public.pixel_blocks;
create policy "authenticated users can create their blocks"
  on public.pixel_blocks for insert to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "owners can update their blocks" on public.pixel_blocks;
create policy "owners can update their blocks"
  on public.pixel_blocks for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "users can read their purchases" on public.pixel_purchases;
create policy "users can read their purchases"
  on public.pixel_purchases for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can read their reservations" on public.pixel_reservations;
create policy "users can read their reservations"
  on public.pixel_reservations for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can read their likes" on public.pixel_likes;
create policy "users can read their likes"
  on public.pixel_likes for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can manage their likes" on public.pixel_likes;
create policy "users can manage their likes"
  on public.pixel_likes for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users can remove their likes" on public.pixel_likes;
create policy "users can remove their likes"
  on public.pixel_likes for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "users can read their activity" on public.activity_events;
create policy "users can read their activity"
  on public.activity_events for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "achievements are public" on public.achievements;
create policy "achievements are public"
  on public.achievements for select to anon, authenticated
  using (true);

-- Storage privado por padrão. O bucket fica público apenas para os arquivos
-- de avatar, que só são vinculados ao perfil público quando há consentimento.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users can upload their profile avatar" on storage.objects;
create policy "users can upload their profile avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "users can update their profile avatar" on storage.objects;
create policy "users can update their profile avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-avatars'
    and owner_id = (select auth.uid())
  )
  with check (
    bucket_id = 'profile-avatars'
    and owner_id = (select auth.uid())
  );

drop policy if exists "users can delete their profile avatar" on storage.objects;
create policy "users can delete their profile avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-avatars'
    and owner_id = (select auth.uid())
  );
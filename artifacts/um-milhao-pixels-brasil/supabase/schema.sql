-- Um Milhão de Pixels Brasil — Supabase foundation
-- Apply this migration in the Supabase SQL editor before saving profiles.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (username = lower(username) and username ~ '^[a-z0-9_]{3,24}$'),
  display_name text,
  avatar_emoji text not null default '✦',
  instagram text,
  website text,
  bio text check (char_length(bio) <= 160),
  city text,
  consent_terms boolean not null default false,
  consent_privacy boolean not null default false,
  consent_marketing boolean not null default false,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint profiles_required_consents check (consent_terms and consent_privacy)
);

create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

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

alter table public.profiles enable row level security;
alter table public.pixel_blocks enable row level security;
alter table public.pixel_purchases enable row level security;
alter table public.pixel_reservations enable row level security;
alter table public.pixel_likes enable row level security;
alter table public.activity_events enable row level security;
alter table public.achievements enable row level security;

drop policy if exists "profiles are publicly readable without email" on public.profiles;
create policy "profiles are publicly readable without email"
  on public.profiles for select
  using (true);

drop policy if exists "users can create their own profile" on public.profiles;
create policy "users can create their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "users can update their own profile" on public.profiles;
create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "published blocks are public" on public.pixel_blocks;
create policy "published blocks are public"
  on public.pixel_blocks for select
  using (status in ('published', 'demo'));

drop policy if exists "owners can read their blocks" on public.pixel_blocks;
create policy "owners can read their blocks"
  on public.pixel_blocks for select
  using (auth.uid() = owner_id);

drop policy if exists "authenticated users can create their blocks" on public.pixel_blocks;
create policy "authenticated users can create their blocks"
  on public.pixel_blocks for insert
  with check (auth.uid() = owner_id);

drop policy if exists "owners can update their blocks" on public.pixel_blocks;
create policy "owners can update their blocks"
  on public.pixel_blocks for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "users can read their purchases" on public.pixel_purchases;
create policy "users can read their purchases"
  on public.pixel_purchases for select
  using (auth.uid() = user_id);

drop policy if exists "users can read their reservations" on public.pixel_reservations;
create policy "users can read their reservations"
  on public.pixel_reservations for select
  using (auth.uid() = user_id);

drop policy if exists "users can read their likes" on public.pixel_likes;
create policy "users can read their likes"
  on public.pixel_likes for select
  using (auth.uid() = user_id);

drop policy if exists "users can manage their likes" on public.pixel_likes;
create policy "users can manage their likes"
  on public.pixel_likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "users can remove their likes" on public.pixel_likes;
create policy "users can remove their likes"
  on public.pixel_likes for delete
  using (auth.uid() = user_id);

drop policy if exists "users can read their activity" on public.activity_events;
create policy "users can read their activity"
  on public.activity_events for select
  using (auth.uid() = user_id);

drop policy if exists "achievements are public" on public.achievements;
create policy "achievements are public"
  on public.achievements for select
  using (true);
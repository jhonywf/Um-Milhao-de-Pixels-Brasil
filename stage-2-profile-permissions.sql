-- Etapa 2 — corrigir permissão para salvar/editar perfil
-- Seguro para executar mais de uma vez no SQL Editor do Supabase.

-- O REST/PostgREST precisa de privilégio no schema e na tabela antes de aplicar RLS.
grant usage on schema public to authenticated;
grant select, insert, update on table public.profiles to authenticated;

-- O e-mail nunca é exposto por esta view; ela contém apenas campos públicos filtrados.
grant select on table public.public_profiles to anon, authenticated;

alter table public.profiles enable row level security;

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

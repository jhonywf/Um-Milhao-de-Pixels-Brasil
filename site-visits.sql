-- =========================================================
-- UM MILHÃO DE PIXELS BRASIL
-- Analytics de visitas - V1
-- =========================================================

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  path text not null default '/',
  referrer text,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx
  on public.site_visits (created_at desc);

create index if not exists site_visits_session_id_idx
  on public.site_visits (session_id);

alter table public.site_visits enable row level security;

-- Nenhuma leitura/escrita pública diretamente pelo navegador.
-- O registro e a leitura serão feitos pelo backend usando Service Role.

revoke all on table public.site_visits from anon;
revoke all on table public.site_visits from authenticated;

comment on table public.site_visits is
  'Sessões/visitas registradas pelo backend para métricas administrativas.';

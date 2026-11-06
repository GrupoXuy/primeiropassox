-- Primeiro Passo X — Esquema inicial (Supabase Postgres)
-- Idempotente: seguro rodar mais de uma vez (IF NOT EXISTS / CREATE OR REPLACE).
-- Como aplicar: supabase SQL Editor (colar e executar) OU via connection string
--   psql "$SUPABASE_DB_URL" -f supabase/schema.sql
-- Segurança (RLS): todas as tabelas com RLS ATIVADO e SEM policies.
--   O papel `anon`/`authenticated` não lê nada; o back-end usa a chave
--   `service_role`, que ignora RLS. NUNCA exponha a service_role no cliente.

begin;

create table if not exists public.candidatos (
  id bigint generated always as identity primary key,
  nome text not null,
  nascimento date not null,
  email text not null,
  telefone text not null,
  pais_residencia text not null,
  cidade text not null,
  nacionalidade text not null,
  experiencia text not null,
  area text not null,
  historico text,
  escolaridade text not null,
  habilidades text,
  idiomas text not null,
  ingles text not null,
  linkedin text,
  paises_interesse jsonb not null default '[]'::jsonb,
  disponibilidade_mudanca text not null,
  disponibilidade_inicio text not null,
  interesse_vendas text not null,
  interesse_outras text not null,
  vaga_interesse text,
  cv_filename text,
  cv_original_name text,
  status text not null default 'novo'
    check (status in ('novo','analise','aprovado','processo','entrevista','selecionado','nao_selecionado','banco')),
  consent_lgpd boolean not null default false,
  consent_versao text not null,
  consent_em timestamptz not null default now(),
  contato_autorizado boolean not null default false,
  novidades_opt_in boolean not null default false,
  ip text,
  user_agent text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists idx_candidatos_status on public.candidatos(status);
create index if not exists idx_candidatos_criado on public.candidatos(criado_em desc);
create index if not exists idx_candidatos_area on public.candidatos(area);
create index if not exists idx_candidatos_pais on public.candidatos(pais_residencia);

create table if not exists public.candidato_observacoes (
  id bigint generated always as identity primary key,
  candidato_id bigint not null references public.candidatos(id) on delete cascade,
  autor text not null,
  texto text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_obs_candidato on public.candidato_observacoes(candidato_id);

create table if not exists public.candidato_historico (
  id bigint generated always as identity primary key,
  candidato_id bigint not null references public.candidatos(id) on delete cascade,
  acao text not null,
  detalhes text,
  autor text not null,
  criado_em timestamptz not null default now()
);
create index if not exists idx_hist_candidato on public.candidato_historico(candidato_id);

create table if not exists public.admin_users (
  id bigint generated always as identity primary key,
  nome text not null,
  email text not null unique,
  senha_hash text not null,
  papel text not null default 'admin' check (papel = 'admin'),
  criado_em timestamptz not null default now()
);

create table if not exists public.admin_logs (
  id bigint generated always as identity primary key,
  admin_id bigint references public.admin_users(id) on delete set null,
  acao text not null,
  detalhes text,
  candidato_id bigint,
  ip text,
  criado_em timestamptz not null default now()
);
create index if not exists idx_logs_criado on public.admin_logs(criado_em desc);

/* Módulos futuros — fundação apenas (Fases 5/7) */
create table if not exists public.vagas (
  id bigint generated always as identity primary key,
  titulo text not null,
  pais text not null,
  cidade text,
  area text not null,
  tipo text,
  status text not null default 'rascunho' check (status in ('rascunho','aberta','pausada','encerrada')),
  criada_em timestamptz not null default now()
);

create table if not exists public.candidaturas (
  id bigint generated always as identity primary key,
  candidato_id bigint not null references public.candidatos(id) on delete cascade,
  vaga_id bigint not null references public.vagas(id) on delete cascade,
  status text not null default 'inscrito',
  criada_em timestamptz not null default now(),
  unique (candidato_id, vaga_id)
);

/* ---------- atualizado_em automático ---------- */
create or replace function public.set_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists trg_candidatos_atualizado on public.candidatos;
create trigger trg_candidatos_atualizado
  before update on public.candidatos
  for each row execute function public.set_atualizado_em();

/* ---------- Transações atômicas (cadastro e anotações) ---------- */
create or replace function public.cadastrar_candidato(p_dados jsonb, p_cv_filename text, p_cv_original_name text, p_ip text, p_user_agent text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  insert into public.candidatos (
    nome, nascimento, email, telefone, pais_residencia, cidade, nacionalidade,
    experiencia, area, historico, escolaridade, habilidades, idiomas, ingles, linkedin,
    paises_interesse, disponibilidade_mudanca, disponibilidade_inicio,
    interesse_vendas, interesse_outras, vaga_interesse,
    cv_filename, cv_original_name,
    consent_lgpd, consent_versao, consent_em, contato_autorizado, novidades_opt_in,
    ip, user_agent
  ) values (
    p_dados->>'nome', (p_dados->>'nascimento')::date, p_dados->>'email', p_dados->>'telefone',
    p_dados->>'pais_residencia', p_dados->>'cidade', p_dados->>'nacionalidade',
    p_dados->>'experiencia', p_dados->>'area', p_dados->>'historico',
    p_dados->>'escolaridade', p_dados->>'habilidades', p_dados->>'idiomas', p_dados->>'ingles', p_dados->>'linkedin',
    coalesce(p_dados->'paises_interesse', '[]'::jsonb), p_dados->>'disponibilidade_mudanca', p_dados->>'disponibilidade_inicio',
    p_dados->>'interesse_vendas', p_dados->>'interesse_outras', p_dados->>'vaga_interesse',
    p_cv_filename, p_cv_original_name,
    (p_dados->>'consent_lgpd')::boolean, p_dados->>'consent_versao', now(),
    (p_dados->>'contato_autorizado')::boolean, (p_dados->>'novidades_opt_in')::boolean,
    p_ip, p_user_agent
  ) returning id into v_id;

  insert into public.candidato_historico (candidato_id, acao, detalhes, autor)
  values (v_id, 'criado', 'Cadastro no banco de talentos', 'candidato');

  return v_id;
end $$;

create or replace function public.registrar_status(p_id bigint, p_status text, p_autor text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old text;
begin
  select status into v_old from public.candidatos where id = p_id for update;
  if not found then return false; end if;
  if v_old = p_status then return true; end if;
  update public.candidatos set status = p_status where id = p_id;
  insert into public.candidato_historico (candidato_id, acao, detalhes, autor)
  values (p_id, 'status', 'Status: ' || v_old || ' → ' || p_status, p_autor);
  return true;
end $$;

create or replace function public.registrar_observacao(p_id bigint, p_autor text, p_texto text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.candidatos where id = p_id) then return false; end if;
  insert into public.candidato_observacoes (candidato_id, autor, texto) values (p_id, p_autor, p_texto);
  insert into public.candidato_historico (candidato_id, acao, detalhes, autor)
  values (p_id, 'observacao', 'Observação interna adicionada', p_autor);
  return true;
end $$;

/* ---------- Permissões das funções ----------
   Só a service_role (back-end) pode executar as transações;
   anon/authenticated não alcançam as funções (defesa em profundidade com RLS). */
revoke all on function public.cadastrar_candidato(jsonb, text, text, text, text) from public, anon, authenticated;
revoke all on function public.registrar_status(bigint, text, text) from public, anon, authenticated;
revoke all on function public.registrar_observacao(bigint, text, text) from public, anon, authenticated;
grant execute on function public.cadastrar_candidato(jsonb, text, text, text, text) to service_role;
grant execute on function public.registrar_status(bigint, text, text) to service_role;
grant execute on function public.registrar_observacao(bigint, text, text) to service_role;

/* ---------- RLS: tudo ativado, nenhuma policy ----------
   Só a chave service_role (back-end) acessa os dados. */
alter table public.candidatos enable row level security;
alter table public.candidato_observacoes enable row level security;
alter table public.candidato_historico enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_logs enable row level security;
alter table public.vagas enable row level security;
alter table public.candidaturas enable row level security;

commit;


/* ---------- Bucket privado para currículos ---------- */
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('curriculos', 'curriculos', false, 4194304, array['application/pdf']::text[])
on conflict (id) do update set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

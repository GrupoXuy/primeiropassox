begin;
alter table public.candidatos
  add column if not exists email_status text not null default 'pendente',
  add column if not exists email_enviado_em timestamptz,
  add column if not exists email_erro text;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'candidatos_email_status_check') then
    alter table public.candidatos add constraint candidatos_email_status_check
      check (email_status in ('pendente','enviado','falhou'));
  end if;
end $$;
alter table public.admin_users
  add column if not exists setup_token_hash text,
  add column if not exists setup_token_expires_at timestamptz,
  add column if not exists senha_definida_em timestamptz;
update public.admin_users
set senha_definida_em = coalesce(senha_definida_em, criado_em, now())
where senha_definida_em is null;
commit;

-- Foto obrigatória para novos cadastros, armazenada em bucket privado.
-- Pré-requisito: executar ti-tabelas.sql para criar ti_funcionarios e
-- ti_e_coordenador().

alter table public.ti_funcionarios
  add column if not exists foto_path text;

alter table public.ti_funcionarios
  add column if not exists id_funcionarios text;

alter table public.ti_funcionarios
  alter column ra drop not null;

create unique index if not exists ti_funcionarios_id_funcionarios_uidx
  on public.ti_funcionarios (id_funcionarios)
  where id_funcionarios is not null;

create sequence if not exists public.ti_id_funcionarios_seq
  start with 100
  increment by 1
  minvalue 100
  no maxvalue
  cache 1;

create or replace function public.ti_gerar_id_funcionarios()
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id text;
  v_tentativa integer;
begin
  for v_tentativa in 1..100 loop
    v_id := 'UC' || lpad(
      nextval('public.ti_id_funcionarios_seq')::text,
      4,
      '0'
    );

    if not exists (
      select 1
        from public.ti_funcionarios as f
       where f.id_funcionarios = v_id
    ) then
      return v_id;
    end if;
  end loop;

  raise exception 'Não foi possível gerar um ID de crachá único. Verifique a sequência e tente novamente.';
end;
$$;

revoke all on function public.ti_gerar_id_funcionarios() from public, anon;
grant execute on function public.ti_gerar_id_funcionarios() to authenticated;

alter table public.ti_funcionarios
  alter column id_funcionarios set default public.ti_gerar_id_funcionarios();

update public.ti_funcionarios
   set id_funcionarios = public.ti_gerar_id_funcionarios()
 where id_funcionarios is null;

alter table public.ti_funcionarios
  alter column id_funcionarios set not null;

comment on column public.ti_funcionarios.foto_path is
  'Caminho da foto de perfil no bucket privado ti-fotos-funcionarios.';
comment on column public.ti_funcionarios.id_funcionarios is
  'Identificador impresso no crachá do funcionário.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'ti-fotos-funcionarios',
  'ti-fotos-funcionarios',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  name = excluded.name,
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists ti_fotos_funcionarios_insert
  on storage.objects;
create policy ti_fotos_funcionarios_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'ti-fotos-funcionarios'
    and name like 'perfis/%'
    and public.ti_e_coordenador()
  );

drop policy if exists ti_fotos_funcionarios_select
  on storage.objects;
create policy ti_fotos_funcionarios_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'ti-fotos-funcionarios'
    and (
      public.ti_e_coordenador()
      or (
        public.ti_e_funcionario()
        and name = (
          select f.foto_path
            from public.ti_funcionarios as f
           where f.id = public.ti_meu_id()
        )
      )
    )
  );

drop policy if exists ti_fotos_funcionarios_delete
  on storage.objects;
create policy ti_fotos_funcionarios_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'ti-fotos-funcionarios'
    and public.ti_e_coordenador()
  );

-- A conta Auth deve ser criada antes em Supabase > Authentication > Users.
-- Esta função localiza a conta pelo e-mail e cadastra o funcionário sem expor
-- auth.users ao navegador nem usar n8n/service_role no cliente.
drop function if exists public.ti_criar_funcionario_com_foto(text, text, text, text);
drop function if exists public.ti_criar_funcionario_com_foto(text, text, text, text, text);
drop function if exists public.ti_criar_funcionario_com_foto(text, text, text, text, text, text);
create function public.ti_criar_funcionario_com_foto(
  p_nome text,
  p_email text,
  p_setor text,
  p_foto_path text
)
returns table (
  funcionario_id uuid,
  foto_path text,
  id_funcionarios text
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_user_id uuid;
  v_funcionario_id uuid;
  v_id_funcionarios text;
  v_email text := lower(trim(p_email));
begin
  if not public.ti_e_coordenador() then
    raise exception 'Somente a coordenação de TI pode cadastrar funcionários.';
  end if;

  if p_nome is null or length(trim(p_nome)) < 3 then
    raise exception 'Informe o nome completo do funcionário.';
  end if;

  if v_email is null or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Informe um e-mail válido.';
  end if;

  if p_setor is null or p_setor not in (
    'infraestrutura', 'dev_frontend', 'dev_backend', 'full_stack',
    'banco_de_dados', 'power_bi'
  ) then
    raise exception 'Setor inválido.';
  end if;

  if p_foto_path is null or p_foto_path !~
    '^perfis/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
  then
    raise exception 'Uma foto válida é obrigatória para cadastrar o funcionário.';
  end if;

  if not exists (
    select 1
      from storage.objects as o
     where o.bucket_id = 'ti-fotos-funcionarios'
       and o.name = p_foto_path
  ) then
    raise exception 'A foto não foi localizada no armazenamento privado.';
  end if;

  select u.id
    into v_auth_user_id
    from auth.users as u
   where lower(u.email) = v_email
   limit 1;

  if v_auth_user_id is null then
    raise exception 'Crie primeiro a conta com este e-mail em Supabase Authentication.';
  end if;

  insert into public.ti_funcionarios (
    auth_user_id,
    nome,
    email,
    setor,
    papel,
    ativo,
    criado_por,
    foto_path
  )
  values (
    v_auth_user_id,
    trim(p_nome),
    v_email,
    p_setor,
    'especialista',
    true,
    public.ti_meu_id(),
    p_foto_path
  )
  returning id, id_funcionarios
    into v_funcionario_id, v_id_funcionarios;

  return query
    select v_funcionario_id, p_foto_path, v_id_funcionarios;
end;
$$;

revoke all on function public.ti_criar_funcionario_com_foto(text, text, text, text)
  from public, anon;
grant execute on function public.ti_criar_funcionario_com_foto(text, text, text, text)
  to authenticated;

notify pgrst, 'reload schema';

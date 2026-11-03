-- Ponto com ID do crachá, conferência facial no cliente e horário do servidor.
-- Pré-requisitos: ti-tabelas.sql e ti-fotos-funcionarios.sql já executados.

alter table public.ti_funcionarios
  add column if not exists id_funcionarios text;

alter table public.ti_funcionarios
  alter column ra drop not null;

create unique index if not exists ti_funcionarios_id_funcionarios_uidx
  on public.ti_funcionarios (id_funcionarios)
  where id_funcionarios is not null;

create table if not exists public.ti_ponto_trabalho (
  id uuid primary key default gen_random_uuid(),
  funcionario_id uuid not null
    references public.ti_funcionarios(id) on delete restrict,
  data_local date not null,
  tipo text not null check (
    tipo in ('entrada', 'inicio_intervalo', 'fim_intervalo', 'saida')
  ),
  registrado_em timestamptz not null default clock_timestamp(),
  foto_path text,
  criado_em timestamptz not null default now()
);

alter table public.ti_ponto_trabalho
  add column if not exists foto_path text;

alter table public.ti_ponto_trabalho
  alter column foto_path drop not null;

alter table public.ti_ponto_trabalho
  add column if not exists origem text not null default 'funcionario';

alter table public.ti_ponto_trabalho
  add column if not exists justificativa text;

alter table public.ti_ponto_trabalho
  add column if not exists registrado_por uuid
    references public.ti_funcionarios(id);

alter table public.ti_ponto_trabalho
  drop constraint if exists ti_ponto_origem_valida;
alter table public.ti_ponto_trabalho
  add constraint ti_ponto_origem_valida
  check (origem in ('funcionario', 'coordenador'));

alter table public.ti_ponto_trabalho
  drop constraint if exists ti_ponto_ajuste_justificado;
alter table public.ti_ponto_trabalho
  add constraint ti_ponto_ajuste_justificado
  check (
    origem <> 'coordenador'
    or length(trim(coalesce(justificativa, ''))) >= 10
  );

alter table public.ti_ponto_trabalho
  drop constraint if exists ti_ponto_foto_path_formato;

create index if not exists ti_ponto_funcionario_data_idx
  on public.ti_ponto_trabalho (funcionario_id, data_local, registrado_em);

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'ti_ponto_trabalho'
  ) then
    alter publication supabase_realtime
      add table public.ti_ponto_trabalho;
  end if;
end;
$$;

alter table public.ti_ponto_trabalho enable row level security;
revoke all on public.ti_ponto_trabalho from anon, authenticated;
grant select on public.ti_ponto_trabalho to authenticated;

drop policy if exists ti_ponto_leitura on public.ti_ponto_trabalho;
create policy ti_ponto_leitura
  on public.ti_ponto_trabalho
  for select
  to authenticated
  using (
    funcionario_id = public.ti_meu_id()
    or public.ti_e_coordenador()
  );

drop policy if exists ti_fotos_ponto_insert on storage.objects;
drop policy if exists ti_fotos_ponto_select on storage.objects;
drop policy if exists ti_fotos_ponto_delete on storage.objects;

drop function if exists public.ti_buscar_funcionario_ponto(text);
create function public.ti_buscar_funcionario_ponto(p_id_funcionarios text)
returns table (
  funcionario_id uuid,
  nome text,
  id_funcionarios text,
  foto_path text
)
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_funcionario_id uuid;
  v_nome text;
  v_id_funcionarios text;
  v_foto_path text;
begin
  v_funcionario_id := public.ti_meu_id();

  if v_funcionario_id is null or not public.ti_e_funcionario() then
    raise exception 'Sessão de funcionário ativa não encontrada.';
  end if;

  select f.nome, f.id_funcionarios, f.foto_path
    into v_nome, v_id_funcionarios, v_foto_path
    from public.ti_funcionarios as f
   where f.id = v_funcionario_id
     and f.id_funcionarios = trim(p_id_funcionarios)
     and f.ativo;

  if v_id_funcionarios is null then
    raise exception 'O ID do crachá não corresponde ao funcionário autenticado.';
  end if;

  if v_foto_path is null then
    raise exception 'Foto de referência ausente. Peça à coordenação para cadastrar a foto antes de bater o ponto.';
  end if;

  if not exists (
    select 1
      from storage.objects as o
     where o.bucket_id = 'ti-fotos-funcionarios'
       and o.name = v_foto_path
  ) then
    raise exception 'A foto de referência não foi encontrada no armazenamento.';
  end if;

  return query select v_funcionario_id, v_nome, v_id_funcionarios, v_foto_path;
end;
$$;

drop function if exists public.registrar_ponto(text, text, text);
drop function if exists public.registrar_ponto(text, text);
create function public.registrar_ponto(
  p_id_funcionarios text,
  p_tipo text
)
returns table (
  id uuid,
  registrado_em timestamptz,
  tipo text
)
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $$
declare
  v_funcionario_id uuid;
  v_id_funcionarios text;
  v_foto_path text;
  v_agora timestamptz := clock_timestamp();
  v_data_local date;
  v_ultimo_tipo text;
  v_ultimo_horario timestamptz;
  v_horario_local time;
  v_id uuid;
begin
  v_funcionario_id := public.ti_meu_id();
  if v_funcionario_id is null or not public.ti_e_funcionario() then
    raise exception 'Sessão de funcionário ativa não encontrada.';
  end if;

  select f.id_funcionarios, f.foto_path
    into v_id_funcionarios, v_foto_path
    from public.ti_funcionarios as f
   where f.id = v_funcionario_id
     and f.id_funcionarios = trim(p_id_funcionarios)
     and f.ativo;

  if v_id_funcionarios is null then
    raise exception 'O ID do crachá não corresponde ao funcionário autenticado.';
  end if;

  if v_foto_path is null or not exists (
    select 1
      from storage.objects as o
     where o.bucket_id = 'ti-fotos-funcionarios'
       and o.name = v_foto_path
  ) then
    raise exception 'Foto de referência ausente. Peça à coordenação para cadastrar a foto antes de bater o ponto.';
  end if;

  if p_tipo is null or p_tipo not in (
    'entrada', 'inicio_intervalo', 'fim_intervalo', 'saida'
  ) then
    raise exception 'Tipo de batida inválido.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_funcionario_id::text, 0));
  v_data_local := (v_agora at time zone 'America/Sao_Paulo')::date;
  v_horario_local := (v_agora at time zone 'America/Sao_Paulo')::time;

  select p.tipo
       , p.registrado_em
    into v_ultimo_tipo
       , v_ultimo_horario
    from public.ti_ponto_trabalho as p
   where p.funcionario_id = v_funcionario_id
     and p.data_local = v_data_local
   order by p.registrado_em desc, p.criado_em desc
   limit 1;

  if p_tipo = 'entrada' and v_ultimo_tipo is not null then
    raise exception 'Já existe uma batida registrada hoje.';
  elsif p_tipo = 'entrada' and (
    v_horario_local < time '06:00'
    or v_horario_local > time '13:15'
  ) then
    raise exception 'A entrada normal é permitida entre 06:00 e 13:15. Procure a coordenação para registrar com justificativa.';
  elsif p_tipo = 'inicio_intervalo'
        and (v_ultimo_tipo is null or v_ultimo_tipo not in ('entrada', 'fim_intervalo')) then
    raise exception 'Registre a entrada ou o retorno do intervalo antes de iniciar outro intervalo.';
  elsif p_tipo = 'inicio_intervalo' and v_horario_local not in (
    time '11:00', time '12:00', time '13:00', time '14:00'
  ) then
    raise exception 'A saída para almoço só pode ser registrada às 11:00, 12:00, 13:00 ou 14:00.';
  elsif p_tipo = 'fim_intervalo' and v_ultimo_tipo is distinct from 'inicio_intervalo' then
    raise exception 'Não há intervalo iniciado para finalizar.';
  elsif p_tipo = 'fim_intervalo'
        and v_agora < v_ultimo_horario + interval '1 hour' then
    raise exception 'O intervalo precisa ter pelo menos 1 hora.';
  elsif p_tipo = 'saida'
        and (v_ultimo_tipo is null or v_ultimo_tipo not in ('entrada', 'fim_intervalo')) then
    raise exception 'Registre a entrada e finalize o intervalo antes da saída.';
  end if;

  insert into public.ti_ponto_trabalho (
    funcionario_id,
    data_local,
    tipo,
    registrado_em,
    registrado_por
  )
  values (
    v_funcionario_id,
    v_data_local,
    p_tipo,
    v_agora,
    v_funcionario_id
  )
  returning ti_ponto_trabalho.id into v_id;

  return query select v_id, v_agora, p_tipo;
end;
$$;

revoke all on function public.ti_buscar_funcionario_ponto(text) from public, anon;
grant execute on function public.ti_buscar_funcionario_ponto(text) to authenticated;
revoke all on function public.registrar_ponto(text, text) from public, anon;
grant execute on function public.registrar_ponto(text, text) to authenticated;

drop function if exists public.ti_ponto_registrar_ajuste(text, date, text, timestamp without time zone, text);
create function public.ti_ponto_registrar_ajuste(
  p_id_funcionarios text,
  p_data_local date,
  p_tipo text,
  p_horario_local timestamp without time zone,
  p_motivo text
)
returns table (
  id uuid,
  funcionario_id uuid,
  data_local date,
  tipo text,
  registrado_em timestamptz,
  justificativa text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_coordenador_id uuid;
  v_funcionario_id uuid;
  v_registrado_em timestamptz;
  v_id uuid;
  v_motivo text := trim(coalesce(p_motivo, ''));
begin
  v_coordenador_id := public.ti_meu_id();
  if v_coordenador_id is null or not public.ti_e_coordenador() then
    raise exception 'Somente a coordenação de TI pode lançar ajustes de ponto.';
  end if;

  if p_id_funcionarios is null or trim(p_id_funcionarios) = '' then
    raise exception 'Informe o ID do crachá do funcionário.';
  end if;
  if p_data_local is null or p_horario_local is null
     or p_horario_local::date <> p_data_local then
    raise exception 'A data e o horário do ajuste não são válidos.';
  end if;
  if p_horario_local > (clock_timestamp() at time zone 'America/Sao_Paulo') then
    raise exception 'Não é permitido lançar uma batida futura.';
  end if;
  if p_tipo is null or p_tipo not in ('entrada', 'inicio_intervalo', 'fim_intervalo', 'saida') then
    raise exception 'Tipo de batida inválido.';
  end if;
  if length(v_motivo) < 10 then
    raise exception 'A justificativa deve ter pelo menos 10 caracteres.';
  end if;

  select f.id
    into v_funcionario_id
    from public.ti_funcionarios as f
   where f.id_funcionarios = upper(trim(p_id_funcionarios));
  if v_funcionario_id is null then
    raise exception 'Não foi encontrado funcionário com esse ID de crachá.';
  end if;

  v_registrado_em := p_horario_local at time zone 'America/Sao_Paulo';
  insert into public.ti_ponto_trabalho (
    funcionario_id,
    data_local,
    tipo,
    registrado_em,
    origem,
    justificativa,
    registrado_por
  )
  values (
    v_funcionario_id,
    p_data_local,
    p_tipo,
    v_registrado_em,
    'coordenador',
    v_motivo,
    v_coordenador_id
  )
  returning ti_ponto_trabalho.id into v_id;

  insert into public.ti_auditoria (
    funcionario_id,
    acao,
    alvo_tipo,
    alvo_id,
    detalhes
  )
  values (
    v_coordenador_id,
    'ponto.ajuste_manual',
    'ponto',
    v_id,
    jsonb_build_object(
      'funcionario_id', v_funcionario_id,
      'id_funcionarios', upper(trim(p_id_funcionarios)),
      'data_local', p_data_local,
      'tipo', p_tipo,
      'registrado_em', v_registrado_em,
      'justificativa', v_motivo
    )
  );

  return query
  select p.id, p.funcionario_id, p.data_local, p.tipo,
         p.registrado_em, p.justificativa
    from public.ti_ponto_trabalho as p
   where p.id = v_id;
end;
$$;

revoke all on function public.ti_ponto_registrar_ajuste(text, date, text, timestamp without time zone, text)
  from public, anon;
grant execute on function public.ti_ponto_registrar_ajuste(text, date, text, timestamp without time zone, text)
  to authenticated;

notify pgrst, 'reload schema';

-- =============================================================================
-- UniChamada — módulo de TI
-- Arquivo: ti/banco-de-dados/ti-tabelas.sql
--
-- O que este arquivo cria (tudo com o prefixo "ti_"):
--   ti_funcionarios         equipe de TI (nome, RA, e-mail, setor, papel)
--   ti_chamados             chamados (infraestrutura, acesso, erro no sistema...)
--   ti_chamados_comentarios conversa do chamado, com nota interna
--   ti_demandas             mudanças no sistema (quadro do desenvolvedor)
--   ti_revisoes             revisões e autorizações de deploy da coordenação
--   ti_auditoria            registro de quem fez o quê
--
-- Como usar: Supabase > SQL Editor > colar tudo > Run.
-- Pode ser executado mais de uma vez (usa "if not exists" / "drop ... if exists").
--
-- SEGURANÇA: o login do TI usa o Supabase Auth (e-mail + senha). As tabelas abaixo
-- NÃO são acessíveis pela chave "anon" (a usada por professores/coordenadores no site).
-- Só quem está logado e cadastrado em ti_funcionarios consegue ler/escrever.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1) TABELAS
-- -----------------------------------------------------------------------------

-- Equipe de TI. Quem cria as contas é o fluxo do n8n (chave de administrador fica
-- só no servidor), nunca o navegador.
create table if not exists public.ti_funcionarios (
  id            uuid primary key default gen_random_uuid(),
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  nome          text not null,
  ra            text not null unique,
  email         text not null unique,
  setor         text not null check (setor in (
                  'coordenacao', 'infraestrutura', 'dev_frontend', 'dev_backend',
                  'full_stack', 'banco_de_dados', 'power_bi')),
  papel         text not null default 'especialista'
                  check (papel in ('coordenador_ti', 'especialista')),
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  criado_por    uuid references public.ti_funcionarios (id)
);

-- Chamados: algo quebrou ou foi pedido (projetor, rede, acesso, erro no sistema...).
create table if not exists public.ti_chamados (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint generated always as identity,
  codigo            text not null unique,                 -- CH-0001 (preenchido por gatilho)
  titulo            text not null,
  descricao         text,
  categoria         text not null check (categoria in (
                      'acesso_login', 'erro_sistema', 'notificacoes_email',
                      'turmas_vinculos', 'duvida_uso', 'infraestrutura')),
  prioridade        text not null default 'media'
                      check (prioridade in ('baixa', 'media', 'alta')),
  status            text not null default 'aberto' check (status in (
                      'aberto', 'em_atendimento', 'aguardando_usuario',
                      'com_coordenacao', 'resolvido', 'fechado')),
  -- para onde a triagem direcionou (null = ainda não triado)
  grupo_destino     text check (grupo_destino in (
                      'infraestrutura', 'desenvolvimento', 'banco_de_dados', 'power_bi')),
  responsavel_id    uuid references public.ti_funcionarios (id),
  -- quem abriu (professores e coordenadores ficam em outras tabelas, sem Supabase Auth)
  solicitante_tipo  text not null check (solicitante_tipo in ('professor', 'coordenador', 'ti')),
  solicitante_id    uuid,
  solicitante_nome  text not null,
  local_texto       text,                                  -- ex.: "Sala 12, bloco A"
  patrimonio        text,                                  -- ex.: "N45"
  contexto          jsonb not null default '{}'::jsonb,    -- tela, navegador... capturado automático
  prazo_em          timestamptz,                           -- SLA
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  resolvido_em      timestamptz
);

create index if not exists ti_chamados_status_idx      on public.ti_chamados (status);
create index if not exists ti_chamados_responsavel_idx on public.ti_chamados (responsavel_id);
create index if not exists ti_chamados_grupo_idx       on public.ti_chamados (grupo_destino);

-- Conversa do chamado. "interno = true" é a nota que só o TI vê.
create table if not exists public.ti_chamados_comentarios (
  id           uuid primary key default gen_random_uuid(),
  chamado_id   uuid not null references public.ti_chamados (id) on delete cascade,
  autor_tipo   text not null check (autor_tipo in ('ti', 'professor', 'coordenador', 'sistema')),
  autor_id     uuid,
  autor_nome   text not null,
  texto        text not null,
  interno      boolean not null default false,
  criado_em    timestamptz not null default now()
);

create index if not exists ti_comentarios_chamado_idx on public.ti_chamados_comentarios (chamado_id);

-- Demandas: mudanças no sistema (aumentar a logo, tela nova, relatório...).
create table if not exists public.ti_demandas (
  id                uuid primary key default gen_random_uuid(),
  numero            bigint generated always as identity,
  codigo            text not null unique,                 -- DEM-0001 (preenchido por gatilho)
  titulo            text not null,
  descricao         text,
  area              text,                                  -- ex.: "Painel do professor"
  prioridade        text not null default 'media'
                      check (prioridade in ('baixa', 'media', 'alta')),
  status            text not null default 'backlog' check (status in (
                      'backlog', 'desenvolvendo', 'em_revisao', 'aprovado', 'no_ar', 'cancelado')),
  grupo_destino     text check (grupo_destino in (
                      'desenvolvimento', 'banco_de_dados', 'power_bi')),
  responsavel_id    uuid references public.ti_funcionarios (id),
  solicitante_tipo  text not null check (solicitante_tipo in ('professor', 'coordenador', 'ti')),
  solicitante_id    uuid,
  solicitante_nome  text not null,
  aprovado_por      uuid references public.ti_funcionarios (id),
  aprovado_em       timestamptz,
  no_ar_em          timestamptz,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

create index if not exists ti_demandas_status_idx      on public.ti_demandas (status);
create index if not exists ti_demandas_responsavel_idx on public.ti_demandas (responsavel_id);
create index if not exists ti_demandas_grupo_idx       on public.ti_demandas (grupo_destino);

-- Revisões da coordenação (pedir ajustes ou aprovar). Guarda o checklist usado.
create table if not exists public.ti_revisoes (
  id          uuid primary key default gen_random_uuid(),
  demanda_id  uuid not null references public.ti_demandas (id) on delete cascade,
  revisor_id  uuid not null references public.ti_funcionarios (id),
  decisao     text not null check (decisao in ('ajustes', 'aprovada')),
  checklist   jsonb not null default '[]'::jsonb,         -- [{"item":"...","ok":true}]
  comentario  text,
  criado_em   timestamptz not null default now()
);

create index if not exists ti_revisoes_demanda_idx on public.ti_revisoes (demanda_id);

-- Auditoria: quem fez o quê e quando.
create table if not exists public.ti_auditoria (
  id              uuid primary key default gen_random_uuid(),
  funcionario_id  uuid references public.ti_funcionarios (id),
  acao            text not null,                           -- ex.: "chamado.assumido"
  alvo_tipo       text,                                    -- ex.: "chamado"
  alvo_id         uuid,
  detalhes        jsonb not null default '{}'::jsonb,
  criado_em       timestamptz not null default now()
);

create index if not exists ti_auditoria_criado_idx on public.ti_auditoria (criado_em desc);


-- -----------------------------------------------------------------------------
-- 2) FUNÇÕES AUXILIARES (dizem "quem sou eu" para as regras de acesso)
--    security definer = rodam com permissão do dono, assim conseguem ler
--    ti_funcionarios sem depender das regras de quem chama.
-- -----------------------------------------------------------------------------

create or replace function public.ti_meu_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from public.ti_funcionarios
  where auth_user_id = auth.uid() and ativo
  limit 1;
$$;

create or replace function public.ti_e_funcionario()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.ti_funcionarios
    where auth_user_id = auth.uid() and ativo
  );
$$;

create or replace function public.ti_e_coordenador()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.ti_funcionarios
    where auth_user_id = auth.uid() and ativo and papel = 'coordenador_ti'
  );
$$;

-- Grupo de trabalho da pessoa: junta front-end, back-end e full stack em "desenvolvimento".
create or replace function public.ti_meu_grupo()
returns text
language sql stable security definer set search_path = public
as $$
  select case setor
           when 'infraestrutura'                        then 'infraestrutura'
           when 'dev_frontend'                          then 'desenvolvimento'
           when 'dev_backend'                           then 'desenvolvimento'
           when 'full_stack'                            then 'desenvolvimento'
           when 'banco_de_dados'                        then 'banco_de_dados'
           when 'power_bi'                              then 'power_bi'
           else 'coordenacao'
         end
  from public.ti_funcionarios
  where auth_user_id = auth.uid() and ativo
  limit 1;
$$;

revoke all on function public.ti_meu_id()         from public, anon;
revoke all on function public.ti_e_funcionario()  from public, anon;
revoke all on function public.ti_e_coordenador()  from public, anon;
revoke all on function public.ti_meu_grupo()      from public, anon;
grant execute on function public.ti_meu_id()        to authenticated;
grant execute on function public.ti_e_funcionario() to authenticated;
grant execute on function public.ti_e_coordenador() to authenticated;
grant execute on function public.ti_meu_grupo()     to authenticated;


-- -----------------------------------------------------------------------------
-- 3) GATILHOS (regras automáticas)
-- -----------------------------------------------------------------------------

-- Gera o código bonito: CH-0001, DEM-0001...
create or replace function public.ti_definir_codigo()
returns trigger
language plpgsql
as $$
begin
  new.codigo := tg_argv[0] || '-' || lpad(new.numero::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists ti_chamados_codigo on public.ti_chamados;
create trigger ti_chamados_codigo
  before insert on public.ti_chamados
  for each row execute function public.ti_definir_codigo('CH');

drop trigger if exists ti_demandas_codigo on public.ti_demandas;
create trigger ti_demandas_codigo
  before insert on public.ti_demandas
  for each row execute function public.ti_definir_codigo('DEM');

-- Atualiza "atualizado_em" a cada alteração.
create or replace function public.ti_tocar_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists ti_chamados_atualizado on public.ti_chamados;
create trigger ti_chamados_atualizado
  before update on public.ti_chamados
  for each row execute function public.ti_tocar_atualizado_em();

drop trigger if exists ti_demandas_atualizado on public.ti_demandas;
create trigger ti_demandas_atualizado
  before update on public.ti_demandas
  for each row execute function public.ti_tocar_atualizado_em();

-- Marca a data de resolução do chamado.
create or replace function public.ti_chamados_regras()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'resolvido' and old.status is distinct from 'resolvido' then
    new.resolvido_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists ti_chamados_regras_trg on public.ti_chamados;
create trigger ti_chamados_regras_trg
  before update on public.ti_chamados
  for each row execute function public.ti_chamados_regras();

-- Regra de ouro das demandas: só a coordenação de TI aprova e publica ("no ar").
-- (Quando não há usuário logado — ex.: SQL Editor ou n8n com chave de servidor —
--  a regra não bloqueia, para você poder fazer ajustes manuais.)
create or replace function public.ti_demandas_regras()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null
     and new.status is distinct from old.status
     and new.status in ('aprovado', 'no_ar')
     and not public.ti_e_coordenador() then
    raise exception 'Somente a coordenação de TI pode aprovar ou publicar uma demanda.';
  end if;

  if new.status = 'aprovado' and old.status is distinct from 'aprovado' then
    new.aprovado_por := coalesce(public.ti_meu_id(), new.aprovado_por);
    new.aprovado_em  := now();
  end if;

  if new.status = 'no_ar' and old.status is distinct from 'no_ar' then
    new.no_ar_em := now();
  end if;

  return new;
end;
$$;

drop trigger if exists ti_demandas_regras_trg on public.ti_demandas;
create trigger ti_demandas_regras_trg
  before update on public.ti_demandas
  for each row execute function public.ti_demandas_regras();


-- -----------------------------------------------------------------------------
-- 4) PERMISSÕES (RLS — Row Level Security)
-- -----------------------------------------------------------------------------

alter table public.ti_funcionarios         enable row level security;
alter table public.ti_chamados             enable row level security;
alter table public.ti_chamados_comentarios enable row level security;
alter table public.ti_demandas             enable row level security;
alter table public.ti_revisoes             enable row level security;
alter table public.ti_auditoria            enable row level security;

-- A chave "anon" (a do site público) não toca em nada do TI.
revoke all on public.ti_funcionarios, public.ti_chamados, public.ti_chamados_comentarios,
              public.ti_demandas, public.ti_revisoes, public.ti_auditoria from anon;

grant select, insert, update, delete on
  public.ti_funcionarios, public.ti_chamados, public.ti_chamados_comentarios,
  public.ti_demandas, public.ti_revisoes, public.ti_auditoria
to authenticated;

-- ---- ti_funcionarios: todo o TI vê a equipe; só a coordenação altera ----
drop policy if exists ti_func_select on public.ti_funcionarios;
create policy ti_func_select on public.ti_funcionarios
  for select to authenticated
  using (public.ti_e_funcionario());

drop policy if exists ti_func_escrita on public.ti_funcionarios;
create policy ti_func_escrita on public.ti_funcionarios
  for all to authenticated
  using (public.ti_e_coordenador())
  with check (public.ti_e_coordenador());

-- ---- ti_chamados ----
-- Vê: a coordenação (tudo), o responsável, e quem é do grupo para onde o chamado foi direcionado.
drop policy if exists ti_cham_select on public.ti_chamados;
create policy ti_cham_select on public.ti_chamados
  for select to authenticated
  using (
    public.ti_e_coordenador()
    or responsavel_id = public.ti_meu_id()
    or grupo_destino = public.ti_meu_grupo()
  );

drop policy if exists ti_cham_insert on public.ti_chamados;
create policy ti_cham_insert on public.ti_chamados
  for insert to authenticated
  with check (public.ti_e_funcionario());

-- Altera: coordenação, o responsável, ou alguém do grupo assumindo um chamado sem dono.
drop policy if exists ti_cham_update on public.ti_chamados;
create policy ti_cham_update on public.ti_chamados
  for update to authenticated
  using (
    public.ti_e_coordenador()
    or responsavel_id = public.ti_meu_id()
    or (responsavel_id is null and grupo_destino = public.ti_meu_grupo())
  )
  with check (
    public.ti_e_coordenador()
    or responsavel_id = public.ti_meu_id()
  );

-- (Sem policy de DELETE em chamados: o histórico nunca se apaga.)
revoke delete on public.ti_chamados from authenticated;

-- ---- ti_chamados_comentarios: acompanha a visibilidade do chamado ----
drop policy if exists ti_coment_select on public.ti_chamados_comentarios;
create policy ti_coment_select on public.ti_chamados_comentarios
  for select to authenticated
  using (exists (select 1 from public.ti_chamados c where c.id = chamado_id));

drop policy if exists ti_coment_insert on public.ti_chamados_comentarios;
create policy ti_coment_insert on public.ti_chamados_comentarios
  for insert to authenticated
  with check (
    autor_tipo = 'ti'
    and autor_id = public.ti_meu_id()
    and exists (select 1 from public.ti_chamados c where c.id = chamado_id)
  );

revoke update, delete on public.ti_chamados_comentarios from authenticated;

-- ---- ti_demandas ----
drop policy if exists ti_dem_select on public.ti_demandas;
create policy ti_dem_select on public.ti_demandas
  for select to authenticated
  using (
    public.ti_e_coordenador()
    or responsavel_id = public.ti_meu_id()
    or grupo_destino = public.ti_meu_grupo()
  );

drop policy if exists ti_dem_insert on public.ti_demandas;
create policy ti_dem_insert on public.ti_demandas
  for insert to authenticated
  with check (public.ti_e_funcionario());

drop policy if exists ti_dem_update on public.ti_demandas;
create policy ti_dem_update on public.ti_demandas
  for update to authenticated
  using (
    public.ti_e_coordenador()
    or responsavel_id = public.ti_meu_id()
    or (responsavel_id is null and grupo_destino = public.ti_meu_grupo())
  )
  with check (
    public.ti_e_coordenador()
    or responsavel_id = public.ti_meu_id()
  );

revoke delete on public.ti_demandas from authenticated;

-- ---- ti_revisoes: o time vê; só a coordenação registra ----
drop policy if exists ti_rev_select on public.ti_revisoes;
create policy ti_rev_select on public.ti_revisoes
  for select to authenticated
  using (exists (select 1 from public.ti_demandas d where d.id = demanda_id));

drop policy if exists ti_rev_insert on public.ti_revisoes;
create policy ti_rev_insert on public.ti_revisoes
  for insert to authenticated
  with check (public.ti_e_coordenador() and revisor_id = public.ti_meu_id());

revoke update, delete on public.ti_revisoes from authenticated;

-- ---- ti_auditoria: qualquer funcionário registra a própria ação; só a coordenação lê ----
drop policy if exists ti_aud_select on public.ti_auditoria;
create policy ti_aud_select on public.ti_auditoria
  for select to authenticated
  using (public.ti_e_coordenador());

drop policy if exists ti_aud_insert on public.ti_auditoria;
create policy ti_aud_insert on public.ti_auditoria
  for insert to authenticated
  with check (public.ti_e_funcionario() and funcionario_id = public.ti_meu_id());

revoke update, delete on public.ti_auditoria from authenticated;


-- -----------------------------------------------------------------------------
-- 5) TEMPO REAL (opcional): a fila atualiza sozinha na tela do TI.
--    Se der erro dizendo que a tabela "já faz parte" da publicação, é só ignorar.
-- -----------------------------------------------------------------------------
-- alter publication supabase_realtime add table public.ti_chamados;
-- alter publication supabase_realtime add table public.ti_demandas;


-- -----------------------------------------------------------------------------
-- 6) PRIMEIRO COORDENADOR DE TI (rodar UMA vez, depois de criar a conta)
--
--   a) Supabase > Authentication > Users > Add user > "Create new user"
--      Informe e-mail e senha (marque "Auto Confirm User").
--   b) Rode o comando abaixo trocando os 3 valores:
--
-- insert into public.ti_funcionarios (auth_user_id, nome, ra, email, setor, papel)
-- select id, 'SEU NOME COMPLETO', 'SEU_RA', email, 'coordenacao', 'coordenador_ti'
-- from auth.users
-- where email = 'seu-email@exemplo.com';
--
--   As demais pessoas da equipe serão cadastradas pela tela "Equipe de TI"
--   (via n8n), nunca direto no banco.
-- -----------------------------------------------------------------------------

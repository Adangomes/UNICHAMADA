-- Agenda UniChamada sem dependência do Supabase Auth.
-- Títulos, descrições e notas chegam cifrados pelo navegador.
-- Owner IDs e os metadados de calendário não são segredo.
-- As políticas anon são abertas: sem autenticação não há isolamento contra
-- leitura, alteração ou exclusão dos registros cifrados por outros clientes.

create table if not exists public.unichamada_agenda_cofres (
  owner_id text primary key check (owner_id ~ '^[0-9a-f]{64}$'),
  kdf_salt text not null check (kdf_salt ~ '^[0-9a-f]{32}$'),
  verificador_cifrado text not null,
  criado_em timestamptz not null default now()
);

create table if not exists public.unichamada_agenda_itens (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null check (owner_id ~ '^[0-9a-f]{64}$'),
  tipo text not null check (tipo in ('tarefa', 'nota', 'compromisso')),
  conteudo_cifrado text not null check (length(conteudo_cifrado) >= 40),
  status text check (status is null or status in (
    'a_fazer', 'em_andamento', 'aguardando', 'concluida', 'cancelada'
  )),
  prioridade text check (prioridade is null or prioridade in ('baixa', 'normal', 'alta', 'urgente')),
  inicio_em timestamptz,
  fim_em timestamptz,
  prazo_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint unichamada_agenda_datas_validas check (
    fim_em is null or inicio_em is not null and fim_em > inicio_em
  ),
  constraint unichamada_agenda_tipo_campos check (
    (tipo = 'nota' and inicio_em is null and fim_em is null and prazo_em is null
      and status is null and prioridade is null)
    or (tipo = 'tarefa' and inicio_em is null and fim_em is null
      and status is not null and prioridade is not null)
    or (tipo = 'compromisso' and inicio_em is not null and prazo_em is null
      and prioridade is null)
  )
);

create index if not exists unichamada_agenda_owner_prazo_idx
  on public.unichamada_agenda_itens(owner_id, prazo_em);
create index if not exists unichamada_agenda_owner_inicio_idx
  on public.unichamada_agenda_itens(owner_id, inicio_em);

create or replace function public.unichamada_agenda_atualizar_em()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.atualizado_em := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists unichamada_agenda_atualizado_em
  on public.unichamada_agenda_itens;
create trigger unichamada_agenda_atualizado_em
before update on public.unichamada_agenda_itens
for each row execute function public.unichamada_agenda_atualizar_em();

alter table public.unichamada_agenda_cofres enable row level security;
alter table public.unichamada_agenda_itens enable row level security;

revoke all on public.unichamada_agenda_cofres from public, anon, authenticated;
revoke all on public.unichamada_agenda_itens from public, anon, authenticated;
grant select, insert on public.unichamada_agenda_cofres to anon, authenticated;
grant select, insert, update, delete on public.unichamada_agenda_itens to anon, authenticated;

drop policy if exists unichamada_agenda_cofre_ler on public.unichamada_agenda_cofres;
create policy unichamada_agenda_cofre_ler
  on public.unichamada_agenda_cofres
  for select to anon, authenticated using (true);

drop policy if exists unichamada_agenda_cofre_criar on public.unichamada_agenda_cofres;
create policy unichamada_agenda_cofre_criar
  on public.unichamada_agenda_cofres
  for insert to anon, authenticated with check (true);

drop policy if exists unichamada_agenda_item_ler on public.unichamada_agenda_itens;
create policy unichamada_agenda_item_ler
  on public.unichamada_agenda_itens
  for select to anon, authenticated using (true);

drop policy if exists unichamada_agenda_item_criar on public.unichamada_agenda_itens;
create policy unichamada_agenda_item_criar
  on public.unichamada_agenda_itens
  for insert to anon, authenticated with check (true);

drop policy if exists unichamada_agenda_item_editar on public.unichamada_agenda_itens;
create policy unichamada_agenda_item_editar
  on public.unichamada_agenda_itens
  for update to anon, authenticated using (true) with check (true);

drop policy if exists unichamada_agenda_item_apagar on public.unichamada_agenda_itens;
create policy unichamada_agenda_item_apagar
  on public.unichamada_agenda_itens
  for delete to anon, authenticated using (true);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'unichamada_agenda_itens'
  ) then
    alter publication supabase_realtime
      add table public.unichamada_agenda_itens;
  end if;
end;
$$;

notify pgrst, 'reload schema';

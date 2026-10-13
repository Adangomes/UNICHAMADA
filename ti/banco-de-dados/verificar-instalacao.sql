-- =============================================================================
-- UniChamada — módulo de TI
-- Arquivo: ti/banco-de-dados/verificar-instalacao.sql
--
-- Rode no SQL Editor do Supabase DEPOIS de rodar o ti-tabelas.sql.
-- Cada linha mostra OK ou REVISAR. Se aparecer REVISAR, me mande o resultado inteiro.
-- (Se der o erro "relation ... does not exist", o ti-tabelas.sql ainda não foi executado.)
-- Este arquivo só LÊ: não altera nada.
-- =============================================================================

with checagens as (
  select 1 as ordem, 'Tabelas ti_ criadas (esperado 6)' as item, 6 as esperado,
         (select count(*) from information_schema.tables
           where table_schema = 'public' and table_name like 'ti\_%' and table_type = 'BASE TABLE')::int as encontrado
  union all
  select 2, 'Tabelas ti_ com regras de acesso (RLS) ligadas (esperado 6)', 6,
         (select count(*) from pg_tables
           where schemaname = 'public' and tablename like 'ti\_%' and rowsecurity)::int
  union all
  select 3, 'Regras de acesso (policies) nas tabelas ti_ (esperado 14)', 14,
         (select count(*) from pg_policies
           where schemaname = 'public' and tablename like 'ti\_%')::int
  union all
  select 4, 'Funções ti_ (esperado 8)', 8,
         (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'ti\_%')::int
  union all
  select 5, 'Gatilhos (triggers) das tabelas ti_ (esperado 6)', 6,
         (select count(*) from pg_trigger t
            join pg_class c on c.oid = t.tgrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relname like 'ti\_%' and not t.tgisinternal)::int
  union all
  select 6, 'Permissões da chave anon (site público) nas tabelas ti_ (esperado 0)', 0,
         (select count(*) from information_schema.role_table_grants
           where table_schema = 'public' and table_name like 'ti\_%' and grantee = 'anon')::int
  union all
  select 7, 'Coordenadores de TI ativos (esperado 1 ou mais)', 1,
         (select count(*) from public.ti_funcionarios where papel = 'coordenador_ti' and ativo)::int
)
select item as verificacao,
       esperado,
       encontrado,
       case when (ordem = 7 and encontrado >= esperado)
              or (ordem <> 7 and encontrado = esperado) then 'OK' else 'REVISAR' end as situacao
from checagens
order by ordem;

-- -----------------------------------------------------------------------------
-- O que o SQL não enxerga (confira no painel do Supabase, em Authentication):
--   [ ] URL Configuration > Site URL e Redirect URLs com o endereço da pasta ti/
--   [ ] Sign In / Providers > Email ligado, e "Confirm email" conforme você quer
--   [ ] Sign In / Providers > cadastro público desligado ("Allow new users to sign up" desligado),
--       para ninguém criar conta sozinho; funcionários entram só por convite
--   [ ] Users: a sua conta de coordenador existe
--   [ ] SMTP próprio, se for convidar mais que uns poucos funcionários por hora
-- -----------------------------------------------------------------------------

-- =============================================================================
-- UniChamada — módulo de TI
-- Arquivo: ti/banco-de-dados/verificar-instalacao.sql
--
-- Rode no SQL Editor do Supabase DEPOIS de rodar ti-tabelas.sql,
-- ti-fotos-funcionarios.sql e ti-ponto.sql.
-- Cada linha mostra OK ou REVISAR. Se aparecer REVISAR, me mande o resultado inteiro.
-- (Se der o erro "relation ... does not exist", o ti-tabelas.sql ainda não foi executado.)
-- Este arquivo só LÊ: não altera nada.
-- =============================================================================

with checagens as (
  select 1 as ordem, 'Tabelas necessárias presentes (esperado 8)' as item, 8 as esperado,
         (select count(*) from information_schema.tables
           where table_schema = 'public' and table_type = 'BASE TABLE'
             and table_name in (
               'ti_funcionarios', 'ti_sessoes_legadas', 'ti_chamados',
               'ti_chamados_comentarios', 'ti_demandas', 'ti_revisoes',
               'ti_auditoria', 'ti_ponto_trabalho'
             ))::int as encontrado
  union all
  select 2, 'Tabelas necessárias com RLS ligado (esperado 8)', 8,
         (select count(*) from pg_tables
           where schemaname = 'public' and rowsecurity
             and tablename in (
               'ti_funcionarios', 'ti_sessoes_legadas', 'ti_chamados',
               'ti_chamados_comentarios', 'ti_demandas', 'ti_revisoes',
               'ti_auditoria', 'ti_ponto_trabalho'
             ))::int
  union all
  select 3, 'Regras de acesso necessárias (esperado 15)', 15,
         (select count(*) from pg_policies
           where schemaname = 'public'
             and policyname in (
               'ti_func_select', 'ti_func_escrita',
               'ti_cham_select', 'ti_cham_insert', 'ti_cham_update',
               'ti_coment_select', 'ti_coment_insert',
               'ti_dem_select', 'ti_dem_insert', 'ti_dem_update',
               'ti_rev_select', 'ti_rev_insert',
               'ti_aud_select', 'ti_aud_insert',
               'ti_ponto_leitura'
             ))::int
  union all
  select 4, 'Funções necessárias (esperado 14)', 14,
         (select count(distinct p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in (
             'ti_meu_id', 'ti_e_funcionario', 'ti_e_coordenador', 'ti_meu_grupo',
             'ti_meu_funcionario', 'ti_vincular_sessao_legada',
             'ti_definir_codigo', 'ti_tocar_atualizado_em',
             'ti_chamados_regras', 'ti_demandas_regras',
             'ti_gerar_id_funcionarios', 'ti_criar_funcionario_com_foto',
             'ti_buscar_funcionario_ponto', 'ti_ponto_registrar_ajuste'
           ))::int
  union all
  select 5, 'Gatilhos (triggers) das tabelas ti_ (esperado 6)', 6,
         (select count(*) from pg_trigger t
            join pg_class c on c.oid = t.tgrelid
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and not t.tgisinternal
             and t.tgname in (
               'ti_chamados_codigo', 'ti_demandas_codigo',
               'ti_chamados_atualizado', 'ti_demandas_atualizado',
               'ti_chamados_regras_trg', 'ti_demandas_regras_trg'
             ))::int
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
--   [ ] Authentication > Settings > "Allow anonymous sign-ins" ligado para o login legado
--   [ ] Users: a sua conta de coordenador existe
--   [ ] SMTP próprio, se for convidar mais que uns poucos funcionários por hora
-- -----------------------------------------------------------------------------

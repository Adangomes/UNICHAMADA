Patch Notes e Fix no Banco de Dados (Supabase / Postgres)
Data: 25/09/2026

Contexto: Sincronização do total de disciplinas no painel do professor

O Problema
A interface do painel estava cravando 0 disciplina(s) para os professores.

Analisando a estrutura, o JS do front até tentava fazer a contagem na mão rodando filtro em memória, mas dava erro porque os identificadores divergiam (UUID vs RA) e a tabela professores não tinha um campo próprio armazenando o consolidado dessas disciplinas.

A Solução
1. Ajuste de Schema na tabela professores
Dropamos a coluna antiga que estava incorreta como UUID e recriamos a coluna disciplinas como tipo numérico INT4 (com valor padrao 0).

2. Backfill (Carga Inicial dos Dados)
Executamos um UPDATE na tabela para calcular a quantidade real de disciplinas que cada professor já tinha cadastradas até o momento:

SQL
UPDATE public.professores p
SET disciplinas = (
    SELECT COUNT(*) 
    FROM public.disciplinas d 
    WHERE d.professor_id = p.id
);
3. Automação no Postgres (Trigger e Function)
Para não ter que atualizar a contagem via código no backend/frontend toda vez que alguém cria, edita ou deleta uma matéria, delegamos essa responsabilidade diretamente para o banco.

Criamos uma Function e uma Trigger que escuta os eventos de INSERT, UPDATE e DELETE na tabela disciplinas e recalcula o total de forma automática na tabela de professores:

SQL
-- Função que recomputa a contagem do professor afetado
CREATE OR REPLACE FUNCTION atualizar_qtd_disciplinas_professor()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        UPDATE public.professores
        SET disciplinas = (SELECT COUNT(*) FROM public.disciplinas WHERE professor_id = OLD.professor_id)
        WHERE id = OLD.professor_id;
        RETURN OLD;
    ELSE
        UPDATE public.professores
        SET disciplinas = (SELECT COUNT(*) FROM public.disciplinas WHERE professor_id = NEW.professor_id)
        WHERE id = NEW.professor_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger ativada no ciclo de vida da tabela disciplinas
CREATE OR REPLACE TRIGGER trg_atualizar_disciplinas_professor
AFTER INSERT OR UPDATE OR DELETE ON public.disciplinas
FOR EACH ROW
EXECUTE FUNCTION atualizar_qtd_disciplinas_professor();

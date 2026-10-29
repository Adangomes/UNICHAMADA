-- =============================================================================
-- UniChamada — prazos (SLA) dos chamados de TI
--
-- Rode no Supabase SQL Editor depois de ti-tabelas.sql.
-- Define prazo_em para chamados criados pelo site, por RPC ou pelo painel de TI.
-- SLA contado em horas corridas desde criado_em:
--   alta = 4 h, media = 24 h, baixa = 72 h.
-- Chamados existentes sem prazo recebem o prazo correspondente à prioridade.
-- Prazos já definidos são preservados.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.ti_definir_prazo_chamado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  duracao_sla interval;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.prioridade IS NOT DISTINCT FROM OLD.prioridade THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND NEW.prazo_em IS NOT NULL THEN
    RETURN NEW;
  END IF;

  duracao_sla := CASE COALESCE(NEW.prioridade, 'media')
    WHEN 'alta' THEN interval '4 hours'
    WHEN 'baixa' THEN interval '72 hours'
    ELSE interval '24 hours'
  END;

  NEW.prazo_em := COALESCE(NEW.criado_em, now()) + duracao_sla;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ti_chamados_definir_prazo ON public.ti_chamados;
CREATE TRIGGER ti_chamados_definir_prazo
BEFORE INSERT OR UPDATE OF prioridade ON public.ti_chamados
FOR EACH ROW
EXECUTE FUNCTION public.ti_definir_prazo_chamado();

UPDATE public.ti_chamados
SET prazo_em = criado_em + CASE prioridade
  WHEN 'alta' THEN interval '4 hours'
  WHEN 'baixa' THEN interval '72 hours'
  ELSE interval '24 hours'
END
WHERE prazo_em IS NULL;

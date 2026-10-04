-- =========================================================
-- UniChamada - CHAT coordenador <-> professor (Supabase)
-- Rode no SQL Editor do Supabase.
-- Pressupõe as tabelas "coordenadores" e "professores"
-- com colunas "id" e "nome". Se os nomes forem outros,
-- troque abaixo (busca e substitui).
-- =========================================================

-- 1) CONVERSAS: uma por par coordenador/professor
-- (o tipo do id é detectado automaticamente: uuid, bigint, etc.)
DO $$
DECLARE
  t_coord text;
  t_prof  text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO t_coord
    FROM pg_attribute a WHERE a.attrelid = 'public.coordenadores'::regclass AND a.attname = 'id';
  SELECT format_type(a.atttypid, a.atttypmod) INTO t_prof
    FROM pg_attribute a WHERE a.attrelid = 'public.professores'::regclass AND a.attname = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS public.chat_conversas (
      id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      coordenador_id       %s NOT NULL REFERENCES public.coordenadores(id) ON DELETE CASCADE,
      professor_id         %s NOT NULL REFERENCES public.professores(id)   ON DELETE CASCADE,
      ultima_mensagem      text,
      ultima_mensagem_em   timestamptz,
      created_at           timestamptz NOT NULL DEFAULT now(),
      UNIQUE (coordenador_id, professor_id)
    )$f$, t_coord, t_prof);
END $$;

-- 2) MENSAGENS
CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     uuid NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  remetente_tipo  text NOT NULL CHECK (remetente_tipo IN ('coordenador','professor')),
  conteudo        text NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 2000),
  lida            boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_conversa ON public.chat_mensagens (conversa_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_msg_nao_lidas ON public.chat_mensagens (conversa_id) WHERE lida = false;
CREATE INDEX IF NOT EXISTS idx_chat_conv_prof ON public.chat_conversas (professor_id);

-- 3) Trigger: atualiza "última mensagem" da conversa a cada envio
CREATE OR REPLACE FUNCTION public.chat_atualiza_ultima_mensagem()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.chat_conversas
     SET ultima_mensagem = left(NEW.conteudo, 120),
         ultima_mensagem_em = NEW.created_at
   WHERE id = NEW.conversa_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_ultima_mensagem ON public.chat_mensagens;
CREATE TRIGGER trg_chat_ultima_mensagem
AFTER INSERT ON public.chat_mensagens
FOR EACH ROW EXECUTE FUNCTION public.chat_atualiza_ultima_mensagem();

-- 4) REALTIME (para as mensagens chegarem na hora)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5) RLS
-- O sistema usa login próprio (não Supabase Auth), então as policies liberam
-- a chave anon, igual ao resto do projeto. Para produção, o ideal é migrar
-- para Supabase Auth e restringir por auth.uid().
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_conversas_all ON public.chat_conversas;
CREATE POLICY chat_conversas_all ON public.chat_conversas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS chat_mensagens_all ON public.chat_mensagens;
CREATE POLICY chat_mensagens_all ON public.chat_mensagens
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- =========================================================
-- SEED (dados de teste) - cria conversas e mensagens de exemplo
-- entre o 1º coordenador e os 2 primeiros professores
-- =========================================================
INSERT INTO public.chat_conversas (coordenador_id, professor_id)
SELECT c.id, p.id
  FROM (SELECT id FROM public.coordenadores ORDER BY id LIMIT 1) c,
       (SELECT id FROM public.professores   ORDER BY id LIMIT 2) p
ON CONFLICT (coordenador_id, professor_id) DO NOTHING;

INSERT INTO public.chat_mensagens (conversa_id, remetente_tipo, conteudo, lida)
SELECT cv.id, 'coordenador', 'Olá professor, sobre o conteúdo da prova de amanhã, pode confirmar a inclusão do capítulo 5?', true
  FROM public.chat_conversas cv
 WHERE NOT EXISTS (SELECT 1 FROM public.chat_mensagens m WHERE m.conversa_id = cv.id);

INSERT INTO public.chat_mensagens (conversa_id, remetente_tipo, conteudo, lida)
SELECT cv.id, 'professor', 'Olá Coordenador. Sim, está confirmado, conforme conversamos.', false
  FROM public.chat_conversas cv
 WHERE (SELECT count(*) FROM public.chat_mensagens m WHERE m.conversa_id = cv.id) = 1;

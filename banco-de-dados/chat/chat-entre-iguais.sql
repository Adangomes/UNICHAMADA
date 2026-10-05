-- =========================================================
-- UniChamada - CHAT parte 3
-- Conversas entre iguais: professor <-> professor e
-- coordenador <-> coordenador (além de coordenador <-> professor).
-- Rode DEPOIS do chat-config.sql. Pode rodar mais de uma vez.
-- =========================================================

-- 1) Conversas: tipo + segundo participante
--    misto       = coordenador_id + professor_id        (como já era)
--    prof_prof   = professor_id + professor2_id
--    coord_coord = coordenador_id + coordenador2_id
-- (o tipo do id - uuid, bigint etc. - é detectado automaticamente)
DO $$
DECLARE
  t_coord text;
  t_prof  text;
BEGIN
  SELECT format_type(a.atttypid, a.atttypmod) INTO t_coord
    FROM pg_attribute a WHERE a.attrelid = 'public.coordenadores'::regclass AND a.attname = 'id';
  SELECT format_type(a.atttypid, a.atttypmod) INTO t_prof
    FROM pg_attribute a WHERE a.attrelid = 'public.professores'::regclass AND a.attname = 'id';

  EXECUTE format('ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS coordenador2_id %s REFERENCES public.coordenadores(id) ON DELETE CASCADE', t_coord);
  EXECUTE format('ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS professor2_id %s REFERENCES public.professores(id) ON DELETE CASCADE', t_prof);
END $$;

ALTER TABLE public.chat_conversas ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'misto';
ALTER TABLE public.chat_conversas ALTER COLUMN coordenador_id DROP NOT NULL;
ALTER TABLE public.chat_conversas ALTER COLUMN professor_id   DROP NOT NULL;

ALTER TABLE public.chat_conversas DROP CONSTRAINT IF EXISTS chat_conversas_tipo_valido;
ALTER TABLE public.chat_conversas ADD CONSTRAINT chat_conversas_tipo_valido CHECK (
  (tipo = 'misto'
     AND coordenador_id IS NOT NULL AND professor_id IS NOT NULL
     AND coordenador2_id IS NULL AND professor2_id IS NULL)
  OR
  (tipo = 'prof_prof'
     AND professor_id IS NOT NULL AND professor2_id IS NOT NULL AND professor_id <> professor2_id
     AND coordenador_id IS NULL AND coordenador2_id IS NULL)
  OR
  (tipo = 'coord_coord'
     AND coordenador_id IS NOT NULL AND coordenador2_id IS NOT NULL AND coordenador_id <> coordenador2_id
     AND professor_id IS NULL AND professor2_id IS NULL)
);

-- 2) Uma conversa por par (a ordem do par é fixada pelo trigger abaixo)
CREATE UNIQUE INDEX IF NOT EXISTS chat_conv_prof_prof_uk
  ON public.chat_conversas (professor_id, professor2_id) WHERE tipo = 'prof_prof';
CREATE UNIQUE INDEX IF NOT EXISTS chat_conv_coord_coord_uk
  ON public.chat_conversas (coordenador_id, coordenador2_id) WHERE tipo = 'coord_coord';
CREATE INDEX IF NOT EXISTS idx_chat_conv_prof2  ON public.chat_conversas (professor2_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_coord2 ON public.chat_conversas (coordenador2_id);

-- Guarda sempre o menor id primeiro: (A,B) e (B,A) viram a mesma conversa
CREATE OR REPLACE FUNCTION public.chat_conversas_ordenar_par()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.tipo = 'prof_prof' AND NEW.professor_id > NEW.professor2_id THEN
    SELECT NEW.professor2_id, NEW.professor_id INTO NEW.professor_id, NEW.professor2_id;
  ELSIF NEW.tipo = 'coord_coord' AND NEW.coordenador_id > NEW.coordenador2_id THEN
    SELECT NEW.coordenador2_id, NEW.coordenador_id INTO NEW.coordenador_id, NEW.coordenador2_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_conversas_ordenar_par ON public.chat_conversas;
CREATE TRIGGER trg_chat_conversas_ordenar_par
BEFORE INSERT ON public.chat_conversas
FOR EACH ROW EXECUTE FUNCTION public.chat_conversas_ordenar_par();

-- 3) Mensagens: quem enviou (dois professores têm o mesmo "tipo", então precisa do id)
ALTER TABLE public.chat_mensagens ADD COLUMN IF NOT EXISTS remetente_id text;

-- Preenche as mensagens antigas
UPDATE public.chat_mensagens m
   SET remetente_id = CASE WHEN m.remetente_tipo = 'coordenador'
                           THEN cv.coordenador_id::text
                           ELSE cv.professor_id::text END
  FROM public.chat_conversas cv
 WHERE cv.id = m.conversa_id AND m.remetente_id IS NULL;

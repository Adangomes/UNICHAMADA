-- =========================================================
-- UniChamada - CHAT usando o login do sistema (RA + e-mail)
-- Rode DEPOIS do chat.sql. Pode rodar mais de uma vez.
-- Se você já rodou o chat-auth.sql, este arquivo desfaz as
-- regras do Supabase Auth e deixa o chat igual ao resto do sistema.
-- =========================================================

-- 1) Remove as regras do Supabase Auth (se existirem)
DROP POLICY IF EXISTS chat_conv_select ON public.chat_conversas;
DROP POLICY IF EXISTS chat_conv_insert ON public.chat_conversas;
DROP POLICY IF EXISTS chat_msg_select  ON public.chat_mensagens;
DROP POLICY IF EXISTS chat_msg_insert  ON public.chat_mensagens;
DROP POLICY IF EXISTS chat_msg_update  ON public.chat_mensagens;
DROP POLICY IF EXISTS chat_ler_coordenadores ON public.coordenadores;
DROP POLICY IF EXISTS chat_ler_professores   ON public.professores;
DROP FUNCTION IF EXISTS public.chat_papel_na_conversa(uuid);

-- 2) Devolve as permissões para a chave anon
GRANT ALL ON public.chat_conversas, public.chat_mensagens TO anon, authenticated;

-- 3) Regras abertas (mesmo modelo do restante do sistema)
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_conversas_all ON public.chat_conversas;
CREATE POLICY chat_conversas_all ON public.chat_conversas
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS chat_mensagens_all ON public.chat_mensagens;
CREATE POLICY chat_mensagens_all ON public.chat_mensagens
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 4) Tempo real
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

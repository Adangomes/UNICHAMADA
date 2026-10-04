-- =========================================================
-- UniChamada - CHAT com SUPABASE AUTH
-- Rode DEPOIS do chat.sql. Troca as policies abertas (anon)
-- por regras de verdade: cada pessoa só vê as próprias conversas.
-- Pressupõe a coluna "email" em coordenadores e professores.
-- =========================================================

-- 1) Vínculo: conta de login (auth.users) <-> coordenador/professor
ALTER TABLE public.coordenadores
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.professores
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Liga automaticamente pelo e-mail (rode de novo sempre que criar usuários novos)
UPDATE public.coordenadores c SET auth_user_id = u.id
  FROM auth.users u WHERE lower(u.email) = lower(c.email) AND c.auth_user_id IS NULL;
UPDATE public.professores p SET auth_user_id = u.id
  FROM auth.users u WHERE lower(u.email) = lower(p.email) AND p.auth_user_id IS NULL;

-- 2) Função: "quem sou eu nesta conversa?" ('coordenador', 'professor' ou NULL)
CREATE OR REPLACE FUNCTION public.chat_papel_na_conversa(conv uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM public.chat_conversas cv
                   JOIN public.coordenadores c ON c.id = cv.coordenador_id
                  WHERE cv.id = conv AND c.auth_user_id = auth.uid()) THEN 'coordenador'
    WHEN EXISTS (SELECT 1 FROM public.chat_conversas cv
                   JOIN public.professores p ON p.id = cv.professor_id
                  WHERE cv.id = conv AND p.auth_user_id = auth.uid()) THEN 'professor'
  END
$$;
GRANT EXECUTE ON FUNCTION public.chat_papel_na_conversa(uuid) TO authenticated;

-- O trigger de "última mensagem" precisa rodar com permissão total
CREATE OR REPLACE FUNCTION public.chat_atualiza_ultima_mensagem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversas
     SET ultima_mensagem = left(NEW.conteudo, 120), ultima_mensagem_em = NEW.created_at
   WHERE id = NEW.conversa_id;
  RETURN NEW;
END $$;

-- 3) Remove as policies abertas e bloqueia o anon
DROP POLICY IF EXISTS chat_conversas_all ON public.chat_conversas;
DROP POLICY IF EXISTS chat_mensagens_all ON public.chat_mensagens;
REVOKE ALL ON public.chat_conversas, public.chat_mensagens FROM anon;

-- 4) Permissões de coluna: mensagens só podem ter "lida" alterada
REVOKE UPDATE ON public.chat_mensagens FROM authenticated;
GRANT UPDATE (lida) ON public.chat_mensagens TO authenticated;
REVOKE UPDATE, DELETE ON public.chat_conversas FROM authenticated;

-- 5) CONVERSAS: ver e criar só as minhas
DROP POLICY IF EXISTS chat_conv_select ON public.chat_conversas;
CREATE POLICY chat_conv_select ON public.chat_conversas FOR SELECT TO authenticated
  USING (public.chat_papel_na_conversa(id) IS NOT NULL);

DROP POLICY IF EXISTS chat_conv_insert ON public.chat_conversas;
CREATE POLICY chat_conv_insert ON public.chat_conversas FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.coordenadores c WHERE c.id = coordenador_id AND c.auth_user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.professores p WHERE p.id = professor_id AND p.auth_user_id = auth.uid())
  );

-- 6) MENSAGENS: ler as das minhas conversas, enviar como eu mesmo, marcar como lida só as recebidas
DROP POLICY IF EXISTS chat_msg_select ON public.chat_mensagens;
CREATE POLICY chat_msg_select ON public.chat_mensagens FOR SELECT TO authenticated
  USING (public.chat_papel_na_conversa(conversa_id) IS NOT NULL);

DROP POLICY IF EXISTS chat_msg_insert ON public.chat_mensagens;
CREATE POLICY chat_msg_insert ON public.chat_mensagens FOR INSERT TO authenticated
  WITH CHECK (public.chat_papel_na_conversa(conversa_id) = remetente_tipo);

DROP POLICY IF EXISTS chat_msg_update ON public.chat_mensagens;
CREATE POLICY chat_msg_update ON public.chat_mensagens FOR UPDATE TO authenticated
  USING (public.chat_papel_na_conversa(conversa_id) IS NOT NULL
         AND remetente_tipo <> public.chat_papel_na_conversa(conversa_id))
  WITH CHECK (true);

-- 7) Lista de contatos: usuário logado pode ler nomes de coordenadores e professores
DROP POLICY IF EXISTS chat_ler_coordenadores ON public.coordenadores;
CREATE POLICY chat_ler_coordenadores ON public.coordenadores FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS chat_ler_professores ON public.professores;
CREATE POLICY chat_ler_professores ON public.professores FOR SELECT TO authenticated USING (true);

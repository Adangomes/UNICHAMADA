-- =========================================================
-- UniChamada - CHAT parte 2
-- Editar/apagar mensagem, apagar conversa, fotos e arquivos
-- (com visualização única) e atualização em tempo real.
-- Rode DEPOIS do chat.sql e do chat-sem-auth.sql.
-- Pode rodar mais de uma vez.
-- =========================================================

-- 1) Colunas novas em chat_mensagens
ALTER TABLE public.chat_mensagens
  ADD COLUMN IF NOT EXISTS tipo               text        NOT NULL DEFAULT 'texto',
  ADD COLUMN IF NOT EXISTS editada_em         timestamptz,
  ADD COLUMN IF NOT EXISTS apagada            boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS arquivo_path       text,
  ADD COLUMN IF NOT EXISTS arquivo_nome       text,
  ADD COLUMN IF NOT EXISTS arquivo_mime       text,
  ADD COLUMN IF NOT EXISTS arquivo_tamanho    integer,
  ADD COLUMN IF NOT EXISTS visualizacao_unica boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS visualizada_em     timestamptz;

ALTER TABLE public.chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_tipo_check;
ALTER TABLE public.chat_mensagens
  ADD CONSTRAINT chat_mensagens_tipo_check CHECK (tipo IN ('texto', 'imagem', 'arquivo'));

-- Anexo e mensagem apagada podem ter conteúdo vazio; texto continua de 1 a 2000 caracteres
ALTER TABLE public.chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_conteudo_check;
ALTER TABLE public.chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_conteudo_valido;
ALTER TABLE public.chat_mensagens
  ADD CONSTRAINT chat_mensagens_conteudo_valido CHECK (
    char_length(conteudo) <= 2000
    AND (apagada OR tipo <> 'texto' OR char_length(conteudo) >= 1)
  );

-- 2) Trigger: a "última mensagem" da lista acompanha envio, edição e exclusão
CREATE OR REPLACE FUNCTION public.chat_atualiza_ultima_mensagem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m public.chat_mensagens%ROWTYPE;
BEGIN
  SELECT * INTO m FROM public.chat_mensagens
   WHERE conversa_id = NEW.conversa_id
   ORDER BY created_at DESC LIMIT 1;

  UPDATE public.chat_conversas SET
    ultima_mensagem = CASE
      WHEN m.apagada          THEN 'Mensagem apagada'
      WHEN m.tipo = 'imagem'  THEN '📷 Foto'
      WHEN m.tipo = 'arquivo' THEN '📎 ' || coalesce(m.arquivo_nome, 'Arquivo')
      ELSE left(m.conteudo, 120)
    END,
    ultima_mensagem_em = m.created_at
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_ultima_mensagem ON public.chat_mensagens;
CREATE TRIGGER trg_chat_ultima_mensagem
AFTER INSERT OR UPDATE OF conteudo, apagada ON public.chat_mensagens
FOR EACH ROW EXECUTE FUNCTION public.chat_atualiza_ultima_mensagem();

-- 3) Tempo real: mensagens já estavam; conversas entram para avisar quando uma é apagada
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversas;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Storage: bucket PRIVADO para fotos e arquivos (limite de 10 MB por arquivo)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-arquivos', 'chat-arquivos', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760;

-- Mesmo modelo do resto do sistema (chave anon): acesso só a este bucket
DROP POLICY IF EXISTS chat_arquivos_acesso ON storage.objects;
CREATE POLICY chat_arquivos_acesso ON storage.objects
  FOR ALL TO anon, authenticated
  USING (bucket_id = 'chat-arquivos')
  WITH CHECK (bucket_id = 'chat-arquivos');

-- Se o passo 4 der erro de permissão, crie o bucket pelo painel
-- (Storage > New bucket > nome "chat-arquivos", privado) e a policy em
-- Storage > Policies, com a mesma regra acima.

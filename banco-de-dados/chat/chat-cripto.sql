-- =========================================================
-- UniChamada - CHAT parte 4: criptografia das mensagens
-- Rode DEPOIS do chat-entre-iguais.sql. Pode rodar mais de uma vez.
-- Os textos passam a ser cifrados NO NAVEGADOR (js/chat/cripto/criptografia.js);
-- o banco só guarda texto embaralhado. O banco não consegue mais "copiar" o texto
-- da última mensagem para a lista, então isso passa a ser decifrado na tela.
-- =========================================================

-- 1) Texto cifrado é mais longo que o original (base64 + IV + etiqueta de segurança).
--    O limite de 2000 caracteres do texto original agora é garantido pela tela (maxlength).
ALTER TABLE public.chat_mensagens DROP CONSTRAINT IF EXISTS chat_mensagens_conteudo_valido;
ALTER TABLE public.chat_mensagens
  ADD CONSTRAINT chat_mensagens_conteudo_valido CHECK (
    char_length(conteudo) <= 12000
    AND (apagada OR tipo <> 'texto' OR char_length(conteudo) >= 1)
  );

-- 2) O trigger deixa de copiar o texto para a lista (seria texto puro no banco).
--    Ele só mantém a data da última mensagem, usada para ordenar as conversas.
CREATE OR REPLACE FUNCTION public.chat_atualiza_ultima_mensagem()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.chat_conversas SET
    ultima_mensagem = NULL,
    ultima_mensagem_em = (SELECT max(created_at) FROM public.chat_mensagens WHERE conversa_id = NEW.conversa_id)
  WHERE id = NEW.conversa_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_ultima_mensagem ON public.chat_mensagens;
CREATE TRIGGER trg_chat_ultima_mensagem
AFTER INSERT OR UPDATE OF conteudo, apagada ON public.chat_mensagens
FOR EACH ROW EXECUTE FUNCTION public.chat_atualiza_ultima_mensagem();

-- 3) Apaga as prévias antigas, que estavam em texto puro
UPDATE public.chat_conversas SET ultima_mensagem = NULL WHERE ultima_mensagem IS NOT NULL;

-- 4) View com a última mensagem de cada conversa (a tela decifra e mostra na lista)
CREATE OR REPLACE VIEW public.chat_ultimas_mensagens
  WITH (security_invoker = true) AS
SELECT DISTINCT ON (conversa_id) *
  FROM public.chat_mensagens
 ORDER BY conversa_id, created_at DESC;

GRANT SELECT ON public.chat_ultimas_mensagens TO anon, authenticated;

-- 5) DEPOIS de subir os arquivos do site: para cifrar também as mensagens ANTIGAS que
--    ainda estão em texto puro, abra o site logado, aperte F12 > Console e rode:
--        await ChatDados.migrarMensagensAntigas()
--    (ele devolve quantas mensagens cifrou. Pode rodar de novo, não repete.)

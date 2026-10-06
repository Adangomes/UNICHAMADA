# Criptografia do chat

`criptografia.js` cifra no **navegador**, antes de mandar para o Supabase:
- o **texto** das mensagens;
- o **nome** e o **conteúdo** de fotos e arquivos (o caminho no Storage também não revela o nome).

Algoritmo: AES-256-GCM (WebCrypto). Uma chave por conversa (derivada do segredo + id da conversa)
e um IV aleatório por mensagem. A mensagem fica amarrada à conversa: copiar o texto cifrado para
outra conversa não abre. Mensagens antigas (sem cifra) continuam aparecendo.

## O que protege
Quem abrir o Table Editor ou o Storage do Supabase, um backup ou um vazamento do banco vê só texto embaralhado.

## O que NÃO protege
O segredo precisa estar no código do site para o navegador ler as mensagens, e o GitHub Pages é público.
Quem tem o código do site consegue ler. Sigilo de verdade entre as pessoas exige login com Supabase Auth
e uma chave por usuário (próximo passo).

## O que continua visível no banco
Quem fala com quem, data e hora, se foi lida, tipo (texto/foto/arquivo), tamanho e tipo do arquivo (ex.: image/jpeg).

## Trocar o segredo
Não troque o `SEGREDOS[1]` (as mensagens já gravadas deixariam de abrir). Adicione `2: '...'`
(gere com `ChatCripto.gerarSegredo()` no console) e mude `VERSAO_ATUAL` para `2`.

## Mensagens antigas
Depois de subir tudo, logado, no console (F12): `await ChatDados.migrarMensagensAntigas()`.
Arquivos antigos ficam como estão; só os novos saem cifrados.

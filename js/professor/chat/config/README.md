# Chat do Professor — pasta `config/`

Recursos extras do chat, um arquivo por assunto (para facilitar a manutenção).
Os arquivos desta pasta são **idênticos** aos da pasta irmã (`js/coordenador/chat/config/`) e
protegidos contra carregar duas vezes, então os dois painéis podem usar qualquer cópia.

| Arquivo | O que faz | Estilo |
|---|---|---|
| `menu-contexto.js` | Menu "Editar / Excluir": botão direito (PC) ou segurar o dedo (celular/tablet) | `css/chat/config/menu-contexto.css` |
| `editar_msg.js` | Editar uma mensagem de texto que você enviou (aparece "editada") | `css/chat/config/editar_msg.css` |
| `excluir.js` | Apagar mensagem ("Mensagem apagada") e apagar a conversa inteira | `css/chat/config/excluir.css` |
| `emojis.js` | Seletor de emojis (lista editável no topo do arquivo) | `css/chat/config/emojis.css` |
| `fotos-e-arquivos.js` | Enviar foto/arquivo, visualização única, baixar arquivo | `css/chat/config/fotos-e-arquivos.css` |

## Como usar no chat
- **Editar:** botão direito (ou segurar) na **sua** mensagem de texto → *Editar*. Enter salva, Esc cancela.
- **Excluir mensagem:** botão direito (ou segurar) na sua mensagem → *Excluir* → confirmar. Para os dois aparece "Mensagem apagada"; o texto e o arquivo saem do banco.
- **Apagar conversa:** botão direito (ou segurar) no contato da lista (coordenadores) → *Apagar conversa* → *Sim, apagar*. Apaga mensagens e arquivos do banco para os dois.
- **Foto/arquivo:** botão 📎. Fotos são reduzidas antes de subir. Marque *Visualização única* para a pessoa abrir uma vez só; a foto é apagada do servidor na hora.
- **Emojis:** botão 😊.
- **Online/Offline:** bolinha verde no avatar e texto no cabeçalho da conversa (Supabase Realtime Presence, em `js/data/chat.js`).

## Ajustes rápidos
- Limites e tipos bloqueados de arquivo: `CFG` no topo de `fotos-e-arquivos.js` (o limite de 10 MB também está no bucket, no SQL).
- Tempo limite para editar: `LIMITE_MINUTOS` em `editar_msg.js` (0 = sem limite).
- Emojis: lista `CATEGORIAS` em `emojis.js`.

## Dependências
- `js/data/chat.js` (toda a comunicação com o Supabase) e `banco-de-dados/chat/chat-config.sql` rodado no Supabase.
- Ordem no `index.html`: `js/data/chat.js` → arquivos de `config/` → `chat.js` da tela.

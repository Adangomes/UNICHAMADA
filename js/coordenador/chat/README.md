# Chat do Coordenador (UniChamada)

Chat em tempo real entre **coordenador** e **professors**, com Supabase (Postgres + Realtime + Auth).

## Arquivos
- `coordenador/chat/chat.js` – interface (só tela, sem consultas ao banco)
- `css/chat/coordenador.css` – estilo
- `data/chat.js` – consultas ao Supabase (compartilhado)
- `auth/chat_auth.js` – login do chat (compartilhado)
- `banco-de-dados/chat.sql` e `chat-auth.sql` – tabelas e regras de acesso

## index.html (nesta ordem)
```html
<link rel="stylesheet" href="css/chat/coordenador.css">

<div id="chat-coordenador-root"></div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="data/db.js"></script>
<script src="auth/auth.js"></script>
<script src="auth/chat_auth.js"></script>
<script src="data/chat.js"></script>
<script src="coordenador/chat/chat.js"></script>
<script>
  // ao abrir a aba "Chat":
  iniciarChatCoordenador('chat-coordenador-root');
</script>
```

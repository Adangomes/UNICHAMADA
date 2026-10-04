# Chat do Professor (UniChamada)

Chat em tempo real entre **professor** e **coordenadors**, com Supabase (Postgres + Realtime + Auth).

## Arquivos
- `professor/chat/chat.js` – interface (só tela, sem consultas ao banco)
- `css/chat/professor.css` – estilo
- `data/chat.js` – consultas ao Supabase (compartilhado)
- `auth/chat_auth.js` – login do chat (compartilhado)
- `banco-de-dados/chat.sql` e `chat-auth.sql` – tabelas e regras de acesso

## index.html (nesta ordem)
```html
<link rel="stylesheet" href="css/chat/professor.css">

<div id="chat-professor-root"></div>

<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="data/db.js"></script>
<script src="auth/auth.js"></script>
<script src="auth/chat_auth.js"></script>
<script src="data/chat.js"></script>
<script src="professor/chat/chat.js"></script>
<script>
  // ao abrir a aba "Chat":
  iniciarChatProfessor('chat-professor-root');
</script>
```

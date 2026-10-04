# Auth do Chat (Supabase Auth)

- `auth/auth.js` – login do sistema (RA + e-mail), já existente
- `auth/chat_auth.js` – login do chat (e-mail + senha, Supabase Auth)

O `chat_auth.js` reaproveita `SUPABASE_URL` e `SUPABASE_KEY` do `data/db.js` e cria um cliente
separado (`window.chatClient`) com sessão própria em `sessionStorage`. O resto do sistema
continua usando o cliente anônimo do `db.js`, sem mudanças.

Cada conta do chat precisa existir em *Authentication → Users* e estar ligada ao registro
em `coordenadores`/`professores` (coluna `auth_user_id`, feito pelo `banco-de-dados/chat-auth.sql`).

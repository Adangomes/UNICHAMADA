# Acesso da equipe e Auth do Chat

- `auth/auth.js` – valida o RA e o e-mail do coordenador/professor no cadastro acadêmico. Não envia código nem usa Supabase Auth.
- `auth/chat_auth.js` – login do chat (e-mail + senha, Supabase Auth)

O `chat_auth.js` reaproveita `SUPABASE_URL` e `SUPABASE_KEY` do `data/db.js` e cria um cliente
separado (`window.chatClient`) com sessão própria em `sessionStorage`. O resto do sistema
continua usando o cliente anônimo do `db.js`, sem mudanças.

O login principal por RA + e-mail é adequado apenas para demonstração. Ele não verifica a identidade da pessoa e não deve ser usado para proteger dados reais sem autenticação e políticas RLS apropriadas.

Cada conta do chat precisa existir em *Authentication → Users* e estar ligada ao registro
em `coordenadores`/`professores` (coluna `auth_user_id`, feito pelo `banco-de-dados/chat-auth.sql`).

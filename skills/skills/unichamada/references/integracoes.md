# Integrações

## Supabase

- **PostgreSQL:** persistência relacional (cursos, professores, alunos, disciplinas, turmas, matrículas, chamadas e presenças).
- **Auth:** sessão e identificação do usuário; rotas protegidas pelo estado de autenticação.
- **Realtime:** o painel do professor assina mudanças para exibir presenças ao vivo.
- **RLS:** Row Level Security nas tabelas; o front-end usa apenas a chave pública (anon).
- **Acesso único:** tudo passa por `js/data/db.js`.

## Notificações por e-mail (Supabase → n8n → Gmail)

```
Coordenador cria notificação no sistema
        │  insert na tabela de notificações (Supabase)
        ▼
Webhook do Supabase ──► n8n
                          │ busca todos os professores no Supabase
                          ▼
                    Gmail: um e-mail para cada destinatário
```

1. O front-end **só grava** a notificação no Supabase; não envia e-mail.
2. Um webhook do banco chama o fluxo do n8n.
3. O n8n consulta o Supabase para obter todos os professores e envia o e-mail a cada um via Gmail.

**Desenvolvimento local:** o n8n roda localmente e é exposto com ngrok para receber o webhook. A URL do ngrok muda; atualize o webhook ao reiniciar e **não commite** essa URL.

## Checklist de segurança das integrações

- [ ] Webhook protegido por segredo/cabeçalho.
- [ ] Credenciais do Gmail e do Supabase (service role) apenas no n8n.
- [ ] Nenhuma URL de webhook ou chave secreta no repositório.

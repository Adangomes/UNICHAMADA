# Arquitetura do UniChamada

## Visão geral

SPA em Vanilla JavaScript servida como arquivos estáticos (GitHub Pages). Não há servidor próprio: o navegador conversa diretamente com o **Supabase** (PostgreSQL, Auth e Realtime). Notificações por e-mail são disparadas por **webhook do Supabase** para o **n8n**.

```
Navegador (SPA, GitHub Pages)
   │  supabase-js (via js/data/db.js)
   ▼
Supabase ── PostgreSQL (tabelas + RLS) ── Realtime (lista de presença ao vivo)
   │
   └── Webhook (insert em notificações) ──► n8n ──► Gmail (e-mails reais)
```

## Princípios

1. **No-build:** módulos ES nativos, HTML/CSS/JS entregues como estão.
2. **Camada de abstração (`db.js`):** única porta de entrada para o banco (Data Mapper); facilita testes e migração.
3. **Segurança por padrão:** proteção de rotas por estado de autenticação e Row Level Security (RLS) no banco.
4. **Presença com múltiplos fatores:** QR + identificação + face-id + geolocalização + token rotativo.
5. **UI produtiva:** layout responsivo e modo "Telão" para sala de aula.

## Camadas do front-end

| Camada | Pasta | Responsabilidade |
| --- | --- | --- |
| Entrada | `index.html`, `js/main.js` | SPA, roteamento e orquestração |
| Dados | `js/data/db.js` | Consultas e CRUD no Supabase |
| Autenticação | `js/auth/auth.js` | Sessão e contexto do usuário (coordenador, professor, aluno) |
| Utilitários | `js/utils/` | `helpers.js`, `camera.js`, `cabecalho.js` |
| Coordenador | `js/coordenador/` | Cursos, professores, alunos, disciplinas, turmas, matrículas |
| Professor | `js/professor/` | Chamada, histórico, telão |
| Aluno | `js/aluno/` | Pipeline de confirmação de presença |
| Estilos | `css/` | `base.css`, `login.css`, `painel.css` |
| Banco | `banco-de-dados/` | Scripts e definições do banco |

## Decisões de projeto

- **Modelo relacional:** dados organizados em tabelas com chaves estrangeiras (cursos, turmas, matrículas, presenças) no PostgreSQL do Supabase.
- **Token rotativo no estilo TOTP:** o QR Code e o código de 6 caracteres expiram com o tempo, dificultando fraude por compartilhamento.
- **Tempo real:** o painel do professor assina mudanças via Realtime em vez de fazer polling.
- **n8n para e-mail:** o front-end não envia e-mail; apenas grava a notificação, e a automação cuida do envio.

Detalhes do fluxo em `skills/unichamada/references/`.

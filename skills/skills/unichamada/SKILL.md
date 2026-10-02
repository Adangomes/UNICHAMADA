---
name: unichamada
description: Documentação do UniChamada, sistema de gestão acadêmica e frequência inteligente (QR Code com token rotativo, face-id e geolocalização) em Vanilla JavaScript com Supabase. Use ao explicar, manter, depurar, documentar ou estender o projeto, ou ao responder dúvidas sobre o fluxo de chamada, perfis, estrutura de pastas e integrações.
---

# UniChamada

Sistema de gestão acadêmica focado em **registrar presença em tempo real** com QR Code, face-id e geolocalização. Front-end em **Vanilla JavaScript (SPA, sem build)**, dados no **Supabase (PostgreSQL)**, hospedagem no **GitHub Pages**.

- Documentação: https://adangomes.github.io/UNICHAMADA/
- Código: https://github.com/Adangomes/UNICHAMADA
- Autores: Adalberto e Diego (Análise e Desenvolvimento de Sistemas)

## Quando usar esta skill

- Explicar como o sistema funciona (fluxo de chamada, perfis, segurança).
- Criar ou alterar módulos em `js/coordenador/`, `js/professor/` ou `js/aluno/`.
- Mexer na camada de dados (`js/data/db.js`) ou na autenticação (`js/auth/auth.js`).
- Documentar, apresentar ou revisar o projeto (README, slides, entrevistas).

## Regras que nunca mudam

1. **Sem framework e sem build.** Módulos ES nativos; o que está no repositório é o que vai ao ar.
2. **Dados só por `js/data/db.js`.** Nenhuma tela chama o SDK do Supabase diretamente.
3. **Segredos fora do Git.** Só a chave pública (anon) no front-end, protegida por RLS. Nada de `service_role`, URL de webhook ou credenciais do n8n.
4. **Presença exige todas as etapas** do fluxo do aluno (veja abaixo). Não crie atalhos que pulem uma delas.
5. **Dados de alunos são sensíveis** (RA, e-mail, foto): não use dados reais em exemplos.

## Perfis

| Perfil | O que faz |
| --- | --- |
| Coordenador | CRUD de cursos, professores, alunos (com foto), disciplinas, turmas e matrículas; envia notificações |
| Professor | Gerencia turmas atribuídas, abre e encerra a chamada, projeta o telão, ajusta o histórico de presenças |
| Aluno | Confirma presença pelo fluxo de validação |

## Fluxo da chamada (resumo)

**Professor:** abre a chamada → o sistema gera QR Code e código de 6 caracteres que mudam em loop → projeta o **Telão** → acompanha a lista de presenças ao vivo → encerra e, se preciso, ajusta o histórico com justificativa.

**Aluno:** 1) lê o QR Code → 2) informa RA e e-mail (aluno vinculado ao curso) → 3) captura o rosto (face-id) → 4) autoriza a geolocalização (precisa estar a até **100 m** do computador que gerou a chamada) → 5) digita o código que está mudando no telão.

Detalhes e pontos de falha: [references/fluxo-chamada.md](references/fluxo-chamada.md).

## Mapa rápido do código

```
index.html            SPA (entrada)
css/                  base.css, login.css, painel.css
js/main.js            roteamento e orquestração
js/data/db.js         camada de dados (Data Mapper) sobre o Supabase
js/auth/auth.js       sessão e contexto do usuário
js/utils/             helpers.js, camera.js, cabecalho.js
js/coordenador/       cursos, professores, alunos, disciplinas, turmas, matriculas, coordenador
js/professor/         chamada, historico, telao, professor
js/aluno/             confirmar-presenca.js
banco-de-dados/       scripts e definições do banco
```

Mapa completo: [references/modulos.md](references/modulos.md).

## Integrações

- **Supabase:** PostgreSQL, Auth, Realtime (lista de presença ao vivo) e RLS.
- **n8n + e-mail:** o sistema grava a notificação no Supabase; um webhook aciona o n8n, que busca os destinatários (ex.: todos os professores) e envia o e-mail via Gmail.

Detalhes: [references/integracoes.md](references/integracoes.md).

## Como responder

- Responda em português, com exemplos curtos do código real do projeto.
- Ao propor mudança, indique o arquivo e respeite as regras acima.
- Se algo não estiver documentado aqui, consulte o repositório antes de afirmar.

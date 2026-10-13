# UniChamada — Módulo de TI

Painel de chamados e demandas da equipe de TI. Tudo fica na pasta `ti/` do repositório.
O `index.html` só carrega scripts: as telas são montadas por JavaScript.

## Como colocar para funcionar (nesta ordem)

1. **Banco de dados.** No Supabase, abra o **SQL Editor**, cole o conteúdo de
   `banco-de-dados/ti-tabelas.sql` e clique em **Run**. Depois rode `banco-de-dados/verificar-instalacao.sql`:
   todas as linhas devem mostrar **OK** (a última só passa depois do passo 2).
2. **Sua conta de coordenador.**
   - Supabase > **Authentication > Users > Add user**, com e-mail e senha (marque "Auto Confirm User").
   - Rode, no SQL Editor, o comando que está comentado no final do `ti-tabelas.sql`
     (troque nome, RA e e-mail pelos seus). Isso vira você o primeiro **coordenador de TI**.
3. **Configuração.** Abra `js/config/supabase-config.js` e preencha:
   - `supabaseUrl` e `supabaseAnonKey` (Supabase > Project Settings > API). **Só a chave anon.**
   - `n8nCriarFuncionarioUrl` (depois de montar o fluxo do passo 5).
4. **Endereços de retorno.** Supabase > **Authentication > URL Configuration**:
   coloque o endereço da pasta `ti/` (ex.: `https://SEU-USUARIO.github.io/UNICHAMADA/ti/`)
   em **Site URL** e em **Redirect URLs**. É para onde o link de convite e o "esqueci minha senha" voltam.
5. **Fluxo do n8n** que cadastra funcionários: veja `docs/n8n-criar-funcionario.md`.
6. **Publicar.** Suba a pasta `ti/` no GitHub. Abra `.../ti/` e entre com e-mail e senha.

## Documentos

| Arquivo | O que tem |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | como o módulo é organizado, quem vê o quê e o **mapa de todos os arquivos** |
| [CONTRIBUTING.md](CONTRIBUTING.md) | como rodar, regras do código e receitas (tela nova, tabela nova) |
| [CHANGELOG.md](CHANGELOG.md) | o que mudou em cada versão |
| [SECURITY.md](SECURITY.md) | como avisar sobre falhas e o que nunca vai para o repositório |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | como a equipe trabalha junta |
| [LICENSE](LICENSE) | direitos de uso |
| [docs/n8n-criar-funcionario.md](docs/n8n-criar-funcionario.md) | passo a passo do fluxo do n8n que cadastra funcionários |
| [banco-de-dados/ti-tabelas.sql](banco-de-dados/ti-tabelas.sql) | tabelas, funções e regras de acesso do Supabase |
| [banco-de-dados/verificar-instalacao.sql](banco-de-dados/verificar-instalacao.sql) | confere se o SQL acima foi aplicado direito (OK ou REVISAR) |

## O que já funciona

| Parte | Situação |
|---|---|
| Login por e-mail e senha, primeiro acesso por link, "esqueci minha senha" | pronto |
| Coordenador: equipe, cadastro, triagem, aprovações de deploy, métricas, auditoria | pronto |
| Chamados: visão geral, fila, detalhe com conversa e nota interna | pronto |
| Infraestrutura, desenvolvedor, banco de dados, Power BI | pronto |

## O que ainda NÃO existe (próximos passos)

- A aba **Suporte** nas telas do professor e do coordenador (abrir chamado). O banco bloqueia
  o acesso direto dessas telas às tabelas `ti_`; elas precisarão de funções específicas.
- E-mail automático ao solicitante quando o chamado muda de status (fluxo do n8n).
- Monitoramento do n8n e do envio de e-mails na "Saúde do sistema".

## Segurança (resumo)

- A chave `service_role` do Supabase **nunca** vai para o GitHub. Ela fica só no n8n.
- As tabelas `ti_` não são acessíveis pela chave anon do site público: só quem entra com e-mail e
  senha e está cadastrado em `ti_funcionarios`.
- Só o coordenador de TI consegue aprovar e publicar uma demanda (o banco impõe isso).
- "Desativar" um funcionário tira o acesso ao painel na hora (as regras do banco checam `ativo`).

## Como foi testado

Teste automatizado no navegador com um Supabase **simulado** (login, as telas de cada setor, as regras de
acesso, triagem, aprovação, cadastro via n8n e primeiro acesso). **Não** foi testado contra o seu Supabase
real nem contra o seu n8n: no primeiro uso, confira o login e o cadastro de um funcionário de teste.

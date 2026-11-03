# UniChamada — Módulo de TI

Painel de chamados e demandas da equipe de TI. Tudo fica na pasta `ti/` do repositório.
O `index.html` só carrega scripts: as telas são montadas por JavaScript.

## Como colocar para funcionar (nesta ordem)

1. **Banco de dados.** No Supabase, abra o **SQL Editor**, cole o conteúdo de
   `banco-de-dados/ti-tabelas.sql` e clique em **Run**. Depois execute
   `banco-de-dados/ti-fotos-funcionarios.sql` e `banco-de-dados/ti-ponto.sql`
   nessa ordem. O cadastro com foto e o ID do crachá ficam habilitados pelas migrações. Depois rode
   `banco-de-dados/verificar-instalacao.sql`: todas as linhas devem mostrar **OK**
   (a última só passa depois do passo 2).
2. **Sua conta de coordenador.**
   - Supabase > **Authentication > Users > Add user**, com e-mail e senha (marque "Auto Confirm User").
   - Rode, no SQL Editor, o comando que está comentado no final do `ti-tabelas.sql`
     (troque nome e e-mail pelos seus; o RA pode ficar `null`). O ID do crachá é gerado pelo banco.
     Isso vira você o primeiro **coordenador de TI**.
3. **Configuração.** Abra `js/config/supabase-config.js` e preencha:
   - `supabaseUrl` e `supabaseAnonKey` (Supabase > Project Settings > API). **Só a chave anon.**
4. **Endereços de retorno.** Supabase > **Authentication > URL Configuration**:
   coloque o endereço da pasta `ti/` (ex.: `https://SEU-USUARIO.github.io/UNICHAMADA/ti/`)
   em **Site URL** e em **Redirect URLs**. É para onde o link de convite e o "esqueci minha senha" voltam.
5. **Cadastrar funcionário.** Crie a conta dele em Supabase > **Authentication > Users**.
   Depois, no sistema, cadastre os dados com o mesmo e-mail e tire ou selecione a foto.
   O Supabase gera um ID sequencial para o crachá (UC0100, UC0101, ...) e o mostra após o cadastro.
   O ID também fica visível na lista da equipe. Funcionários já cadastrados recebem seus IDs
   automaticamente ao executar a migração de fotos.
6. **Ponto.** O funcionário entra com a própria conta no aplicativo e informa o ID impresso no crachá.
   O sistema confirma que esse ID corresponde à conta autenticada, compara localmente o rosto da câmera
   com a foto de referência cadastrada e descarta a captura. A batida não envia nem guarda a foto.
   A entrada normal é entre 06:00 e 13:15; almoço pode começar às 11:00, 12:00, 13:00 ou 14:00,
   com retorno após pelo menos uma hora. A saída final não é bloqueada por saldo de horas.
   Coordenadores têm no item Jornada consulta, apuração de horas, CSV e ajustes justificados auditados.
   A comparação é executada no navegador e não é uma verificação biométrica inviolável nem inclui
   detecção de vivacidade; para controle antifraude forte, a validação precisa ocorrer em serviço confiável.
7. **Publicar.** Suba a pasta `ti/` no GitHub. Abra `.../ti/` e entre com e-mail e senha.

## Documentos

| Arquivo | O que tem |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | como o módulo é organizado, quem vê o quê e o **mapa de todos os arquivos** |
| [CONTRIBUTING.md](CONTRIBUTING.md) | como rodar, regras do código e receitas (tela nova, tabela nova) |
| [CHANGELOG.md](CHANGELOG.md) | o que mudou em cada versão |
| [SECURITY.md](SECURITY.md) | como avisar sobre falhas e o que nunca vai para o repositório |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | como a equipe trabalha junta |
| [LICENSE](LICENSE) | direitos de uso |
| [docs/cadastro-funcionario.md](docs/cadastro-funcionario.md) | cadastro direto pelo painel e associação à conta Auth |
| [banco-de-dados/ti-tabelas.sql](banco-de-dados/ti-tabelas.sql) | tabelas, funções e regras de acesso do Supabase |
| [banco-de-dados/ti-fotos-funcionarios.sql](banco-de-dados/ti-fotos-funcionarios.sql) | coluna do caminho da foto, bucket privado e políticas de acesso |
| [banco-de-dados/ti-ponto.sql](banco-de-dados/ti-ponto.sql) | batidas com foto, validação do ID do crachá e políticas de acesso |
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

- O cadastro de funcionários usa a sessão do coordenador, uma função SQL e o Storage privado; não depende do n8n.
- A chave `service_role` do Supabase **nunca** vai para o aplicativo ou para o navegador.
- As tabelas `ti_` não são acessíveis pela chave anon do site público: só quem entra com e-mail e
  senha e está cadastrado em `ti_funcionarios`.
- Só o coordenador de TI consegue aprovar e publicar uma demanda (o banco impõe isso).
- "Desativar" um funcionário tira o acesso ao painel na hora (as regras do banco checam `ativo`).

## Como foi testado

Teste automatizado no navegador com um Supabase **simulado** para login, telas de setor, regras de
acesso, triagem e aprovação. O cadastro direto com foto precisa ser validado após aplicar a migração.
**Não** foi testado contra o seu Supabase real; no primeiro uso, confira o login e cadastre um funcionário de teste.

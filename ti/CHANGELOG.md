# Changelog

Todas as mudanças importantes do módulo de TI ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Planejado
- Aba **Suporte** nas telas do professor e do coordenador, para abrir chamado (com funções específicas no
  banco, porque as tabelas `ti_` não são acessíveis pela chave anon).
- E-mail automático ao solicitante quando o chamado muda de status (fluxo do n8n).
- Monitoramento do n8n e do envio de e-mails na tela "Visão geral".
- Agenda por horário na tela da infraestrutura e abas "Hoje / Esta semana".

## [1.3.0] — 2026-10-10

### Alterado
- **JavaScript e CSS com o mesmo caminho**, seguindo as seções do menu do coordenador:
  `coordenador_ti/coordenacao/` (Triagem, Aprovações, Equipe) e `coordenador_ti/acompanhamento/` (Visão geral,
  Fila, detalhe do chamado, Métricas, Auditoria). As demais equipes ganharam pastas com nome completo:
  `infraestrutura/`, `desenvolvimento/`, `banco_de_dados/` e `power_bi/`.
- **Arquivos grandes divididos em blocos:**
  - JavaScript: peças de interface (`chips`, `controles`, `blocos`, `janelas`), moldura do login (`moldura`,
    `carrossel`, `animacao`), constantes (`constantes`, `regras`, `textos-login`), detalhe do chamado
    (`detalhe`, `conversa`, `lateral`), revisão de deploy (`aprovacao-detalhe`, `trilha`, `decisao`),
    triagem (`triagem`, `item`), infraestrutura (`meus-chamados`, `ficha`) e quadro (`quadro`, `nova-demanda`, `tarefa`).
  - CSS: componentes comuns em 6 blocos, layout em 3 e login em 3 (`login`, `painel_animado`, `formulario`).
- As pastas de CSS `operacao/`, `gestao/` e `sistema/` deram lugar às seções reais do menu. `gestao/` e `sistema/`
  continuam como **reservadas** para as telas futuras.
- Os textos do login saíram de `constantes.js` para `js/config/textos-login.js`.

### Adicionado
- `banco-de-dados/verificar-instalacao.sql`: confere se as tabelas, regras de acesso, funções e gatilhos foram aplicados.

### Observações
- O menu do coordenador **não mudou** (seções "Coordenação" e "Acompanhamento"). Só a organização dos arquivos mudou,
  e o comportamento do sistema é o mesmo: os 108 testes automáticos continuam passando.

## [1.2.0] — 2026-10-10

### Alterado
- **CSS dividido por seção**, seguindo as seções do menu (Operação, Gestão, Sistema): um arquivo por tela em
  `css/<equipe>/<seção>/<tela>.css`. Tudo do login fica em `css/login/login.css`. O que é usado em várias telas
  fica em `css/comum/` e as variáveis de cor em `css/base/`.
- Cada tela passa a carregar **só o CSS da sua seção**, na hora em que abre (campo `css` em `js/app/rotas.js`).
- Estilos que estavam soltos dentro do JavaScript viraram classes nos CSS das telas.

### Adicionado
- Arquivos **reservados** para telas que ainda não existem: `usuarios_e_acesso`, `turmas_e_vinculos`,
  `avisos_aos_usuarios`, `saude_do_sistema` e `base_de_conhecimento`.

## [1.1.0] — 2026-10-10

### Alterado
- **Nova tela de login do TI:** cartão grande com painel animado à esquerda (faixas diagonais em movimento,
  riscos de velocidade, estrelas e um brilho que flutua, com leve reação ao mouse), borda inclinada,
  mensagens que se alternam (com setas) e formulário à direita. A tela de primeiro acesso usa a mesma moldura.
- Botão "Mostrar/Ocultar" na senha.
- No celular o painel animado some e sobra só o formulário. Quem usa "reduzir movimento" no aparelho vê o
  painel parado.

### Adicionado
- `js/auth/moldura.js` (visual e animação) e `TI.K.login` em `constantes.js` (todos os textos da tela).

## [1.0.0] — 2026-10-10

### Adicionado
- **Banco de dados** (`banco-de-dados/ti-tabelas.sql`): tabelas `ti_funcionarios`, `ti_chamados`,
  `ti_chamados_comentarios`, `ti_demandas`, `ti_revisoes` e `ti_auditoria`; funções de apoio; gatilhos
  (código `CH-0001` / `DEM-0001`, data de resolução, regra de aprovação); regras de acesso (RLS) por papel e setor.
- **Login do TI** por e-mail e senha (Supabase Auth), tela de primeiro acesso pelo link do e-mail e
  "esqueci minha senha".
- **Coordenação de TI:** equipe e cadastro de funcionário (nome, RA, e-mail e setor), triagem, aprovações de
  deploy com checklist, métricas e auditoria.
- **Chamados:** visão geral, fila com filtros, detalhe com conversa e nota interna, prazo (SLA).
- **Infraestrutura:** chamados físicos com local e patrimônio.
- **Desenvolvimento, banco de dados e Power BI:** quadro de demandas (Backlog, Desenvolvendo, Em revisão,
  Aprovado, No ar).
- **Setores:** infraestrutura, dev front-end, dev back-end, full stack, banco de dados e Power BI.
- **Documentação:** README, ARCHITECTURE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, LICENSE e o guia do fluxo
  do n8n que cria funcionários.

### Observações
- Testado com um Supabase **simulado** (65 verificações automáticas no navegador). Ainda não foi testado
  contra o Supabase e o n8n reais.

# Changelog

Todas as mudanças importantes do módulo de TI ficam registradas aqui.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e as versões seguem
[Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Gestão de ponto exclusiva da coordenação com resumo diário, filtros por período/funcionário, apuração
  de horas e saldo contra 8h, exportação CSV e ajustes com justificativa/auditoria.
- Regras de servidor para janela de entrada e saída/retorno do almoço, além de cálculo sinalizado quando
  uma jornada longa não possui batidas de intervalo.

### Corrigido
- O quadro de demandas e seus diálogos inicializam o próprio namespace antes de registrar as telas,
  evitando falhas quando os scripts são servidos em cache ou fora de ordem.
- Corrigido erro de sintaxe no renderizador das colunas, que impedia o carregamento do quadro Kanban.
- Funcionários podem registrar a resposta e enviar demandas para revisão; a migração
  `banco-de-dados/ti-fluxo-revisao.sql` atualiza o constraint e a política RLS em instalações existentes.

### Melhorado
- O quadro de demandas oferece busca, filtros por prioridade e responsável, opção "Só as minhas" e
  carregamento progressivo dos cards (20 por coluna), incluindo as demandas publicadas.
- O quadro mantém a visão Kanban para o trabalho ativo e oferece uma lista histórica paginada com filtros
  de período de criação e status, incluindo demandas canceladas.
- A coluna "No ar" limita a altura e usa rolagem interna, cards compactos com código e título e carregamento
  progressivo em lotes; publicações com mais de 30 dias permanecem acessíveis na Lista histórica.

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



## [1.0.0] — Atualização de 01–02/11/2026

### Adicionado
- **Instalador profissional para Windows (`UniChamada-Setup.exe`)**, com assistente em português: boas-vindas, escolha da pasta de instalação, barra de progresso e tela final. Inclui desinstalador, imagem lateral personalizada e ícone próprio do UniChamada.
- **Dois atalhos na área de trabalho** no Windows: `UniChamada` (professor, aluno e coordenação acadêmica) e `UniChamada - Painel TI` (coordenação de TI e funcionários). Os dois abrem o mesmo programa.
- **Instaladores para Mac**: `UniChamada-mac.pkg` (com assistente de instalação) e `UniChamada-mac.dmg` (arrastar para Aplicativos). No Mac, os dois modos ficam no menu do aplicativo e no menu do Dock.
- **Ativação por chave serial antes de abrir o sistema.** Na primeira abertura, o app pede a chave (`UNI-XXXX-XXXX-XXXX`), valida no Supabase e vincula a licença ao computador. Se a licença for bloqueada ou expirar, o app volta a pedir a chave. Sem internet, o app abre por até 7 dias após a última validação.
- **Painel de TI → Licenças:**
  - coluna **Computador**, que mostra "Aguardando ativação" ou "Vinculado";
  - botão **Desvincular**, que libera a chave para ser ativada em outro computador;
  - status **expirada** mostrado pela data de validade;
  - o card "Máquinas Ativas" passa a contar só licenças válidas já ativadas.
- **Publicação automática dos instaladores:** o GitHub Actions gera o `.exe`, o `.pkg` e o `.dmg` e os envia para a página Releases com nomes fixos. A página de download pode apontar sempre para a versão mais nova.

### Alterado
- **Tabela de licenças:** os botões da coluna Ações ficaram do mesmo tamanho, claros por padrão, empilhados, e só mudam de cor ao passar o mouse ou tocar com o dedo (vermelho em Bloquear, verde em Ativar). A tabela ganhou rolagem horizontal em telas estreitas e o selo "expirada" ganhou cor.
- **Tela de licenças:** passou a usar a conexão do painel e a mesma geração de chaves segura do `seguranca.js`. Em caso de erro, a mensagem aparece na tabela, e os dados de teste foram removidos.
- **Segurança do aplicativo:** páginas sem acesso direto ao Node.js, links externos abrem no navegador e a ativação da licença é checada antes de qualquer tela.
- **Empacotamento:** o app deixa de fora arquivos que não usa (releases, skills, banco-de-dados, docker-compose, README, software e arquivos .sql).

### Corrigido
- Erro `chamyEl is not defined`, que impedia a tela de licenças de abrir.
- Erro de permissão (`42501`) ao ler a tabela de licenças, resolvido com a permissão da tabela e uma regra de acesso restrita a funcionários de TI.
- Versão do Windows que saía como pasta compactada, sem instalador.
- Chave serial gerada com `Math.random` na tela de licenças, agora gerada por `crypto.getRandomValues`.
- Arquivo `.DS_Store` do Mac removido do repositório.

### Observações
- Os instaladores não têm assinatura digital, então o Windows pode mostrar o aviso do SmartScreen ("Mais informações → Executar assim mesmo") e o Mac pede clique direito → Abrir na primeira vez.
- Versões antigas baixadas antes dessa atualização não pedem chave serial e não recebem atualização automática. Para usar a licença, é preciso instalar pelo instalador novo.
- A alteração dos botões da tabela de licenças aparece no site (GitHub Pages) imediatamente, e no app instalado só depois de um novo build.

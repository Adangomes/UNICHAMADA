# Arquitetura — Módulo de TI do UniChamada

Este documento explica **como o módulo de TI é organizado e por quê**. Para colocar para funcionar, veja o
[README](README.md). Para mexer no código, veja o [CONTRIBUTING](CONTRIBUTING.md).

## 1. Visão geral

O módulo de TI é um sistema **separado** do painel de professores e coordenadores: tem a sua própria pasta
(`ti/`), a sua própria tela de login e as suas próprias tabelas no Supabase (todas com o prefixo `ti_`).
Não usa nenhuma ferramenta de build: é JavaScript puro, carregado por `<script>` no `index.html`.

```
 Navegador (GitHub Pages, endereço .../ti/)
 └─ index.html  ........................ só <script>
     └─ js/app/app.js  ................. ponto de entrada (decide: login ou painel)
         ├─ js/auth/       login, primeiro acesso, sessão
         ├─ js/comum/      layout, menu, componentes, datas
         ├─ js/<equipe>/   coordenador_ti, infraestrutura, desenvolvimento, banco_de_dados, power_bi
         └─ js/data/       1 arquivo por tabela ───────▶ Supabase (Postgres + Auth + RLS)

 Cadastro de funcionário (botão "Cadastrar e enviar acesso")
 └─ js/data/funcionarios.js ──▶ n8n (guarda a chave de administrador)
                                 └─▶ Supabase Auth (convite por e-mail) + tabela ti_funcionarios
```

## 2. Camadas e responsabilidades

| Camada | Pasta | Pode falar com | Não pode |
|---|---|---|---|
| Configuração | `js/config/` | ninguém | guardar a chave de administrador |
| Peças comuns | `js/comum/` | só o navegador (DOM) | falar com o banco |
| Dados | `js/data/` | Supabase | desenhar tela |
| Autenticação | `js/auth/` | `data/` e Supabase Auth | — |
| Telas | `js/coordenador_ti/`, `infraestrutura/`, `desenvolvimento/`, `banco_de_dados/`, `power_bi/` | `data/` e `comum/` | falar direto com o Supabase |
| Aplicação | `js/app/` | todas | — |

Regra de ouro: **a tela chama `TI.dados.<tabela>`, e só os arquivos de `js/data/` falam com o Supabase.**

## 3. Como uma ação percorre o sistema

Exemplo: a coordenação clica em **Direcionar** na Triagem.

1. `coordenador_ti/coordenacao/triagem/item.js` lê os campos e chama `TI.dados.chamados.atualizar(...)`.
2. `data/chamados.js` envia o `update` ao Supabase com a sessão de quem está logado.
3. O **banco** confere as regras de acesso (RLS): só a coordenação, o responsável ou alguém do grupo pode alterar.
4. A tela registra a ação em `TI.dados.auditoria.registrar(...)` e se redesenha.

No fluxo de uma demanda, a pessoa responsável (ou alguém do grupo quando ainda não há responsável)
descreve o que fez e envia para revisão. Se a demanda estiver sem responsável, o envio a atribui
automaticamente à pessoa que a assumiu. A coordenação não envia o próprio trabalho para revisão:
ela analisa demandas em **Em revisão** e pede ajustes ou aprova.

## 4. Quem vê o quê

| Pessoa | Telas no menu | O que o banco deixa ler |
|---|---|---|
| Coordenador de TI | Triagem, Aprovações, Equipe, Visão geral, Fila, Quadro, Métricas, Auditoria | tudo |
| Infraestrutura | Meus chamados, Fila da infraestrutura, Visão geral | chamados do grupo infraestrutura ou dele |
| Dev front-end / back-end / full stack | Quadro de demandas | demandas do grupo desenvolvimento ou dele |
| Banco de dados | Tarefas de banco de dados | demandas do grupo banco de dados ou dele |
| Power BI | Pedidos de relatório | demandas do grupo Power BI ou dele |

O menu apenas **esconde** telas. Quem de fato impede o acesso são as regras do banco (`banco-de-dados/ti-tabelas.sql`).

## 5. Segurança

- **Login:** e-mail e senha pelo Supabase Auth. Funcionário novo recebe um convite por e-mail e cria a própria senha.
- **Chave anon** (pública) fica em `js/config/supabase-config.js`. As tabelas `ti_` **não** são acessíveis por ela.
- **Chave de administrador** (`service_role`) existe só no n8n. Nunca no GitHub.
- **Aprovar e publicar** uma demanda só é permitido à coordenação, e isso é imposto por um gatilho no banco.
- **Histórico:** chamados, comentários, revisões e auditoria não podem ser apagados pelo painel.
- **Texto na tela:** nenhum texto vindo do banco entra como HTML (tudo passa por `TI.dom.el`).

## 6. Decisões

| Decisão | Motivo |
|---|---|
| Login por e-mail e senha (e não por RA) | o painel altera contas e autoriza publicação: precisa de autenticação de verdade |
| RA continua no cadastro | é dado do funcionário, não credencial |
| Cadastro de funcionário passa pelo n8n | criar conta exige a chave de administrador, que não pode ficar no navegador |
| 1 tabela = 1 arquivo em `data/` | achar onde algo acontece sem procurar |
| Rótulos e cores em `constantes.js` | mudar um texto em um lugar só |
| Sem módulos nem build | combina com o restante do projeto e funciona direto no GitHub Pages |
| Tudo montado por JavaScript | `index.html` fica só com scripts |
| JS e CSS com o **mesmo caminho**, divididos em blocos, e CSS carregado só quando a tela abre (`css/<equipe>/<seção>/<tela>.css`) | achar o estilo de uma tela sem abrir um arquivo enorme, e não baixar o que a pessoa não usa |
| Textos do login em `TI.K.login` e visual em `css/login/login.css` | a coordenação pode pedir mudanças na tela sem mexer na lógica |

## 7. Mapa de arquivos

### 7.1 JavaScript e CSS têm o mesmo caminho

Para achar uma coisa a partir da outra, as pastas de `js/` e de `css/` seguem a mesma árvore. Exemplo, a Triagem:

```
js/  coordenador_ti/coordenacao/triagem/      ← triagem.js, item.js
css/ coordenador_ti/coordenacao/triagem.css   ← o estilo dela
```

As pastas seguem as **seções do menu**:

| Seção do menu | Pasta (em `js/` e em `css/`) | Telas |
|---|---|---|
| Coordenação (coordenador) | `coordenador_ti/coordenacao/` | Triagem, Aprovações de deploy, Equipe de TI |
| Acompanhamento (coordenador) | `coordenador_ti/acompanhamento/` | Visão geral, Fila de chamados, detalhe do chamado, Métricas, Auditoria |
| *(futura)* Gestão | `coordenador_ti/gestao/` | Usuários e acessos, Turmas e vínculos, Avisos aos usuários (CSS **reservado**) |
| *(futura)* Sistema | `coordenador_ti/sistema/` | Saúde do sistema, Base de conhecimento (CSS **reservado**) |
| Atendimento (infraestrutura) | `infraestrutura/` | Meus chamados |
| Trabalho (desenvolvimento) | `desenvolvimento/` | Quadro de demandas |
| Trabalho (banco de dados) | `banco_de_dados/` | Tarefas de banco de dados |
| Trabalho (Power BI) | `power_bi/` | Pedidos de relatório |

Três observações:
- O **Quadro de demandas** aparece no menu do coordenador, mas os arquivos dele ficam em `desenvolvimento/`,
  porque é de lá que vêm as demais equipes que o reaproveitam.
- A **Visão geral**, a **Fila** e o **detalhe do chamado** ficam em `coordenador_ti/acompanhamento/`, mas a
  infraestrutura também usa.
- Telas e CSS **reservados** são das seções que ainda não existem no menu. Quando criar a seção no `menu.js`,
  o arquivo já está esperando.

### 7.2 Blocos: quando dividir um arquivo

Arquivo passou de umas **100 linhas**, ou mistura assuntos diferentes? Vira uma **pasta com o nome da tela** e
cada pedaço vai para um arquivo com o nome do que ele faz. Exemplo: o detalhe do chamado é a pasta `chamado/`:

| Arquivo | Papel |
|---|---|
| `detalhe.js` | carrega os dados e monta a página (o "maestro") |
| `conversa.js` | bloco da conversa e da caixa de resposta |
| `lateral.js` | bloco da coluna da direita e dos botões do topo |

Os blocos conversam por um objeto de estado, que o arquivo principal monta e passa adiante (`TI.telas.detalheBlocos.conversa(e)`).

### 7.3 Arquivos do JavaScript

#### `js/app/`
| Arquivo | Para que serve |
|---|---|
| `app/app.js` | Ponto de entrada (sempre o último script): escolhe entre login, primeiro acesso e painel, e abre as telas. |
| `app/rotas.js` | Liga cada rota à tela, ao item do menu e aos CSS dela; diz quem pode abrir cada uma. |

#### `js/config/`
| Arquivo | Para que serve |
|---|---|
| `config/constantes.js` | Rótulos e listas: setores, grupos, prioridades, status e categorias. |
| `config/regras.js` | Prazos (SLA), sugestão da triagem, checklist de revisão e permissões por setor. |
| `config/supabase-config.js` | URL e chave pública do Supabase e URL do n8n (você preenche). |
| `config/textos-login.js` | Todos os textos do login e do primeiro acesso. |

#### `js/comum/`
| Arquivo | Para que serve |
|---|---|
| `comum/componentes/blocos.js` | Cartão, cabeçalho de página, indicador (KPI), barra, par rótulo/valor e os estados vazio/carregando/erro. |
| `comum/componentes/chips.js` | Chips de prioridade, status e tipo; avatar; prazo. |
| `comum/componentes/controles.js` | Botão, campo, input, textarea e select. |
| `comum/componentes/janelas.js` | Confirmação, janela (modal) e aviso (toast). |
| `comum/dom.js` | Cria elementos HTML sem escrever HTML solto (evita injeção de código). |
| `comum/estilos.js` | Carrega a fonte e os CSS: os comuns no início e os da seção de cada tela quando ela abre. |
| `comum/formatar.js` | Datas, prazos (SLA) e iniciais. |
| `comum/layout.js` | Monta a tela do painel: menu lateral + área de conteúdo. |
| `comum/menu.js` | Itens do menu de cada pessoa (depende do papel e do setor). |

#### `js/data/` (1 arquivo = 1 tabela)
| Arquivo | Para que serve |
|---|---|
| `data/auditoria.js` | Tabela `ti_auditoria`. |
| `data/chamados.js` | Tabela `ti_chamados`. |
| `data/comentarios.js` | Tabela `ti_chamados_comentarios`. |
| `data/demandas.js` | Tabela `ti_demandas`. |
| `data/funcionarios.js` | Tabela `ti_funcionarios` (e o cadastro via n8n). |
| `data/revisoes.js` | Tabela `ti_revisoes`. |
| `data/supabase.js` | Conexão com o Supabase e tradução de erros. |

#### `js/auth/`
| Arquivo | Para que serve |
|---|---|
| `auth/login.js` | Tela de login: e-mail, senha, mostrar/ocultar e "esqueci minha senha". |
| `auth/moldura/animacao.js` | Fundo animado do painel (canvas): faixas, riscos de velocidade, estrelas e brilho. |
| `auth/moldura/carrossel.js` | Mensagens do painel que trocam sozinhas, com setas. |
| `auth/moldura/moldura.js` | Cartão da tela de entrada: painel animado à esquerda e formulário à direita. |
| `auth/primeiro-acesso.js` | Tela em que o funcionário novo cria a senha (link do e-mail). |
| `auth/sessao.js` | Quem está logado (e-mail e senha pelo Supabase Auth), com papel e setor. |

#### `js/coordenador_ti/acompanhamento/`
| Arquivo | Para que serve |
|---|---|
| `coordenador_ti/acompanhamento/auditoria.js` | Quem fez o quê e quando (últimas 100 ações). |
| `coordenador_ti/acompanhamento/chamado/conversa.js` | Bloco da conversa, resposta e nota interna. |
| `coordenador_ti/acompanhamento/chamado/detalhe.js` | Detalhe do chamado: carrega os dados e monta a página com os blocos abaixo. |
| `coordenador_ti/acompanhamento/chamado/lateral.js` | Bloco da coluna da direita (detalhes, contexto, ações) e botões do topo. |
| `coordenador_ti/acompanhamento/fila.js` | Fila de chamados: abas, filtros e tabela. |
| `coordenador_ti/acompanhamento/metricas.js` | Métricas dos últimos 30 dias, por equipe e por categoria. |
| `coordenador_ti/acompanhamento/visao-geral.js` | Visão geral: indicadores, "precisa de atenção agora", categorias e saúde do banco. |

#### `js/coordenador_ti/coordenacao/`
| Arquivo | Para que serve |
|---|---|
| `coordenador_ti/coordenacao/aprovacoes/aprovacao-detalhe.js` | Revisão de uma demanda: carrega os dados e monta a página com os blocos abaixo. |
| `coordenador_ti/coordenacao/aprovacoes/aprovacoes.js` | Lista de demandas em revisão e de aprovadas aguardando deploy. |
| `coordenador_ti/coordenacao/aprovacoes/decisao.js` | Bloco do checklist, do comentário e dos botões "Aprovar" / "Pedir ajustes" / "No ar". |
| `coordenador_ti/coordenacao/aprovacoes/trilha.js` | Bloco da faixa de etapas (Backlog → ... → No ar). |
| `coordenador_ti/coordenacao/equipe/cadastro-funcionario.js` | Janela de cadastro: nome, RA, e-mail e setor. |
| `coordenador_ti/coordenacao/equipe/equipe.js` | Pessoas da equipe, carga de trabalho e botão "Novo funcionário". |
| `coordenador_ti/coordenacao/triagem/item.js` | Bloco de uma linha da triagem (direcionar para um grupo e uma pessoa). |
| `coordenador_ti/coordenacao/triagem/triagem.js` | Triagem: carrega os dados e monta a página. |

#### `js/infraestrutura/`
| Arquivo | Para que serve |
|---|---|
| `infraestrutura/meus-chamados/ficha.js` | Bloco do cartão do chamado (local, patrimônio, prazo) e botões do próximo passo. |
| `infraestrutura/meus-chamados/meus-chamados.js` | Chamados da infraestrutura: carrega os dados e monta a página. |

#### `js/desenvolvimento/`
| Arquivo | Para que serve |
|---|---|
| `desenvolvimento/quadro/nova-demanda.js` | Bloco da janela "Nova demanda". |
| `desenvolvimento/quadro/quadro.js` | Quadro Backlog → Desenvolvendo → Em revisão → Aprovado → No ar. |
| `desenvolvimento/quadro/tarefa.js` | Bloco da janela de uma demanda e o próximo passo. |

#### `js/banco_de_dados/` e `js/power_bi/`
| Arquivo | Para que serve |
|---|---|
| `banco_de_dados/tarefas.js` | Tela "Tarefas de banco de dados" (reaproveita o quadro de demandas). |
| `power_bi/pedidos.js` | Tela "Pedidos de relatório" do Power BI (reaproveita o quadro de demandas). |

### 7.4 Arquivos do CSS

Cada tela carrega **só** o CSS da sua seção, quando abre (campo `css` da rota, em `js/app/rotas.js`).
Os grupos `base`, `layout` e `login` estão em `TI.estilos.GRUPOS` (`js/comum/estilos.js`).

#### `css/base/` e `css/comum/` (valem para todas as telas)
| Arquivo | Para que serve |
|---|---|
| `base/base.css` | Cores (variáveis), fonte e regras gerais. |
| `comum/componentes/botoes_e_formularios.css` | Botões e formulários. |
| `comum/componentes/cartoes_e_linhas.css` | Cartões e linhas de lista. |
| `comum/componentes/chips_e_avatar.css` | Chips de prioridade/status e avatar. |
| `comum/componentes/estados_e_texto.css` | Estados (vazio, carregando, erro) e texto corrido. |
| `comum/componentes/modal_e_aviso.css` | Janela (modal) e aviso (toast). |
| `comum/componentes/pilulas_barras_e_pares.css` | Pílulas de filtro, barras e pares rótulo/valor. |
| `comum/layout/conteudo.css` | Área de conteúdo e cabeçalho de página. |
| `comum/layout/grades.css` | Indicadores (KPIs) e colunas principal/lateral. |
| `comum/layout/menu_lateral.css` | Menu lateral. |

#### `css/login/` (tudo do login e do primeiro acesso)
| Arquivo | Para que serve |
|---|---|
| `login/formulario.css` | Lado direito: marca, título, campos, botão e avisos. |
| `login/login.css` | Variáveis de cor do login, página e cartão. |
| `login/painel_animado.css` | Painel animado da esquerda (borda inclinada, mensagens, setas). |

#### `css/coordenador_ti/coordenacao/`
| Arquivo | Para que serve |
|---|---|
| `coordenador_ti/coordenacao/aprovacoes_de_deploy.css` | Aprovações de deploy e revisão (trilha de etapas, checklist). |
| `coordenador_ti/coordenacao/equipe_de_ti.css` | Equipe de TI e cadastro (hoje só componentes comuns). |
| `coordenador_ti/coordenacao/triagem.css` | Tela Triagem. |

#### `css/coordenador_ti/acompanhamento/`
| Arquivo | Para que serve |
|---|---|
| `coordenador_ti/acompanhamento/auditoria.css` | Auditoria. |
| `coordenador_ti/acompanhamento/chamado_detalhe.css` | Detalhe do chamado (abas, conversa, nota interna). Usado também pela infraestrutura. |
| `coordenador_ti/acompanhamento/fila_de_chamados.css` | Fila de chamados (a tabela). |
| `coordenador_ti/acompanhamento/metricas_e_sla.css` | Métricas (hoje só componentes comuns). |
| `coordenador_ti/acompanhamento/visao_geral.css` | Visão geral (hoje só componentes comuns). |

#### `css/coordenador_ti/gestao/` e `sistema/` (reservados)
| Arquivo | Para que serve |
|---|---|
| `coordenador_ti/gestao/avisos_aos_usuarios.css` | **Reservado**: tela "Avisos aos usuários" ainda não existe. |
| `coordenador_ti/gestao/turmas_e_vinculos.css` | **Reservado**: tela "Turmas e vínculos" ainda não existe. |
| `coordenador_ti/gestao/usuarios_e_acesso.css` | **Reservado**: tela "Usuários e acessos" ainda não existe. |
| `coordenador_ti/sistema/base_de_conhecimento.css` | **Reservado**: tela "Base de conhecimento" ainda não existe. |
| `coordenador_ti/sistema/saude_do_sistema.css` | **Reservado**: tela "Saúde do sistema" ainda não existe. |

#### `css/infraestrutura/`, `desenvolvimento/`, `banco_de_dados/`, `power_bi/`
| Arquivo | Para que serve |
|---|---|
| `banco_de_dados/tarefas.css` | Tarefas de banco de dados (hoje usa o quadro). |
| `desenvolvimento/quadro_de_demandas.css` | Quadro de demandas (também usado por banco de dados e Power BI). |
| `infraestrutura/meus_chamados.css` | Meus chamados da infraestrutura. |
| `power_bi/pedidos.css` | Pedidos de relatório (hoje usa o quadro). |

### 7.5 Telas → arquivos → tabelas → quem acessa

| Tela | JavaScript (pasta) | CSS | Tabelas | Quem acessa |
|---|---|---|---|---|
| Login | `auth/` (`login.js`, `moldura/`) | `login/` | Auth + `ti_funcionarios` | todo o TI |
| Primeiro acesso | `auth/primeiro-acesso.js` | `login/` | Auth | funcionário novo |
| Triagem | `coordenador_ti/coordenacao/triagem/` | `coordenacao/triagem.css` | `ti_chamados`, `ti_demandas`, `ti_funcionarios` | coordenador |
| Aprovações de deploy | `coordenador_ti/coordenacao/aprovacoes/` | `coordenacao/aprovacoes_de_deploy.css` | `ti_demandas`, `ti_revisoes`, `ti_auditoria` | coordenador |
| Equipe de TI + cadastro | `coordenador_ti/coordenacao/equipe/` | `coordenacao/equipe_de_ti.css` | `ti_funcionarios` | coordenador |
| Visão geral | `coordenador_ti/acompanhamento/visao-geral.js` | `acompanhamento/visao_geral.css` | `ti_chamados` | coordenador (tudo) e infra (o grupo dela) |
| Fila de chamados | `coordenador_ti/acompanhamento/fila.js` | `acompanhamento/fila_de_chamados.css` | `ti_chamados` | coordenador e infra |
| Detalhe do chamado | `coordenador_ti/acompanhamento/chamado/` | `acompanhamento/chamado_detalhe.css` | `ti_chamados`, `ti_chamados_comentarios`, `ti_auditoria` | coordenador e infra |
| Métricas | `coordenador_ti/acompanhamento/metricas.js` | `acompanhamento/metricas_e_sla.css` | `ti_chamados`, `ti_demandas` | coordenador |
| Auditoria | `coordenador_ti/acompanhamento/auditoria.js` | `acompanhamento/auditoria.css` | `ti_auditoria` | coordenador |
| Meus chamados (infra) | `infraestrutura/meus-chamados/` | `infraestrutura/meus_chamados.css` | `ti_chamados`, `ti_chamados_comentarios` | infraestrutura |
| Quadro de demandas | `desenvolvimento/quadro/` | `desenvolvimento/quadro_de_demandas.css` | `ti_demandas` | front-end, back-end, full stack e coordenador |
| Tarefas de banco de dados | `banco_de_dados/tarefas.js` | `banco_de_dados/tarefas.css` + o quadro | `ti_demandas` | banco de dados |
| Pedidos de relatório | `power_bi/pedidos.js` | `power_bi/pedidos.css` + o quadro | `ti_demandas` | Power BI |

### 7.6 Tabelas do Supabase

| Tabela | O que guarda | Colunas principais | Arquivo que mexe |
|---|---|---|---|
| `ti_funcionarios` | a equipe de TI | nome, ra, email, setor, papel, ativo | `data/funcionarios.js` |
| `ti_chamados` | chamados (projetor, rede, acesso, erro) | codigo, titulo, categoria, prioridade, status, grupo_destino, responsavel_id, local_texto, patrimonio, prazo_em | `data/chamados.js` |
| `ti_chamados_comentarios` | conversa e notas internas | chamado_id, autor_nome, texto, interno | `data/comentarios.js` |
| `ti_demandas` | mudanças no sistema | codigo, titulo, area, status, grupo_destino, responsavel_id, aprovado_por | `data/demandas.js` |
| `ti_revisoes` | decisões da coordenação | demanda_id, decisao, checklist, comentario | `data/revisoes.js` |
| `ti_auditoria` | registro de ações | funcionario_id, acao, alvo_tipo, detalhes | `data/auditoria.js` |

### 7.7 Fluxos do n8n (parte que precisa de chave de administrador)

| Fluxo | Quando roda | O que faz |
|---|---|---|
| `ti-criar-funcionario` | botão "Cadastrar e enviar acesso" | confere se quem chamou é coordenador; cria a conta no Supabase Auth; grava em `ti_funcionarios`; envia o e-mail de primeiro acesso |
| `ti-aviso-chamado` *(planejado)* | chamado muda de status | envia e-mail ao solicitante |
| `ti-desativar-funcionario` *(planejado)* | botão "Desativar" | marca `ativo = false` e bloqueia o login |

O passo a passo do primeiro está em [docs/n8n-criar-funcionario.md](docs/n8n-criar-funcionario.md).

### 7.8 Ordem dos `<script>` no `index.html`

São scripts comuns (sem módulos): cada arquivo só pode usar o que foi carregado **antes** dele. O `app.js` é sempre o último.

| Grupo | Arquivos (dentro de `js/`, na ordem) |
|---|---|
| Biblioteca do Supabase | `biblioteca do Supabase (CDN)` |
| Configuração | `config/constantes.js`<br>`config/regras.js`<br>`config/textos-login.js`<br>`config/supabase-config.js` |
| Comum | `comum/dom.js`<br>`comum/estilos.js`<br>`comum/formatar.js`<br>`comum/componentes/chips.js`<br>`comum/componentes/controles.js`<br>`comum/componentes/blocos.js`<br>`comum/componentes/janelas.js`<br>`comum/layout.js`<br>`comum/menu.js` |
| Dados (1 arquivo por tabela) | `data/supabase.js`<br>`data/funcionarios.js`<br>`data/chamados.js`<br>`data/comentarios.js`<br>`data/demandas.js`<br>`data/revisoes.js`<br>`data/auditoria.js` |
| Entrada: sessão, moldura do login, login e primeiro acesso | `auth/sessao.js`<br>`auth/moldura/moldura.js`<br>`auth/moldura/carrossel.js`<br>`auth/moldura/animacao.js`<br>`auth/login.js`<br>`auth/primeiro-acesso.js` |
| Coordenador de TI — seção Acompanhamento | `coordenador_ti/acompanhamento/visao-geral.js`<br>`coordenador_ti/acompanhamento/fila.js`<br>`coordenador_ti/acompanhamento/chamado/conversa.js`<br>`coordenador_ti/acompanhamento/chamado/lateral.js`<br>`coordenador_ti/acompanhamento/chamado/detalhe.js`<br>`coordenador_ti/acompanhamento/metricas.js`<br>`coordenador_ti/acompanhamento/auditoria.js` |
| Coordenador de TI — seção Coordenação | `coordenador_ti/coordenacao/triagem/item.js`<br>`coordenador_ti/coordenacao/triagem/triagem.js`<br>`coordenador_ti/coordenacao/aprovacoes/aprovacoes.js`<br>`coordenador_ti/coordenacao/aprovacoes/trilha.js`<br>`coordenador_ti/coordenacao/aprovacoes/decisao.js`<br>`coordenador_ti/coordenacao/aprovacoes/aprovacao-detalhe.js`<br>`coordenador_ti/coordenacao/equipe/cadastro-funcionario.js`<br>`coordenador_ti/coordenacao/equipe/equipe.js` |
| Demais equipes | `infraestrutura/meus-chamados/ficha.js`<br>`infraestrutura/meus-chamados/meus-chamados.js`<br>`desenvolvimento/quadro/quadro.js`<br>`desenvolvimento/quadro/nova-demanda.js`<br>`desenvolvimento/quadro/tarefa.js`<br>`banco_de_dados/tarefas.js`<br>`power_bi/pedidos.js` |
| Aplicação (app.js é sempre o último) | `app/rotas.js`<br>`app/app.js` |

### 7.9 Regras para você não se perder

- **1 tabela = 1 arquivo** em `data/`. Nenhuma tela fala direto com o Supabase.
- **1 tela = 1 arquivo, ou 1 pasta** (se passou de ~100 linhas), com o mesmo nome do CSS dela.
- **JS e CSS com o mesmo caminho.**
- **Rótulos e cores em `constantes.js`**; textos do login em `textos-login.js`; regras fixas em `regras.js`.
- **Estilo de uma tela fica no CSS da seção dela**, e não no JavaScript. No JS só entra valor que muda de verdade,
  como a largura de uma barra.
- **Nunca colocar a chave de administrador (service role) em nenhum arquivo do GitHub.**

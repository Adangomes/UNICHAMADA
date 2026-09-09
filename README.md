# Sistema Acadêmico — Front-end (projeto acadêmico)

Front-end puro (HTML + CSS + JS, sem framework e sem build), pronto para publicar
no GitHub Pages. Os dados são simulados em `localStorage` no formato de tabelas
relacionais (id + chaves estrangeiras), para facilitar a migração futura para
PostgreSQL/SQL via API.

## Estrutura

```
index.html                 → única página (login + as duas telas)
css/
  base.css                 → reset, variáveis, tipografia, botões, inputs
  login.css                → tela de login ("carteirinha")
  painel.css               → layout comum das telas internas (header, nav, tabelas)
js/
  data/db.js                → "banco" (tabelas em localStorage) + funções genéricas de CRUD
  auth/auth.js               → login por RA + e-mail (identifica coordenador ou professor)
  utils/helpers.js           → $ , criarElemento, toast, validações
  utils/camera.js            → captura de foto do rosto (câmera ao vivo ou galeria)
  utils/cabecalho.js         → cabeçalho compartilhado dos painéis
  coordenador/
    cursos.js                → CRUD de Cursos
    professores.js            → CRUD de Professores
    alunos.js                  → CRUD de Alunos (com foto do rosto)
    disciplinas.js             → CRUD de Disciplinas
    turmas.js                   → CRUD de Turmas
    matriculas.js               → Matrículas (aluno + turma)
    coordenador.js               → monta o painel e a navegação por abas
  professor/
    chamada.js                   → gera/mostra o modal de chamada (QR + código rotativo + lista ao vivo)
    historico.js                  → histórico de chamadas por turma, com ajuste manual de presença/falta
    telao.js                       → tela enxuta (QR + código gigante) para abrir em janela separada e projetar
    professor.js                    → painel do professor (turmas atribuídas + ações)
  aluno/confirmar-presenca.js       → fluxo do aluno: RA/e-mail → rosto → localização → código
  main.js                            → login, troca entre telas e roteamento (#presenca/, #telao/)
```

## Sistema de chamada (resumo)

1. Na tela do professor, cada turma tem os botões **Histórico** e **Gerar chamada**.
2. **Gerar chamada** abre um modal com QR Code + um código de 6 caracteres que muda
   a cada 45 segundos, e a lista de alunos (cinza = aguardando, verde = presente).
   O botão **🖥️ Destacar pro telão** abre esse QR Code + código numa janela separada
   (`window.open`), pronta pra arrastar pro monitor/projetor da sala — enquanto essa
   janela do telão estiver aberta, mantenha o modal de chamada também aberto na aba
   principal, pois é ele quem faz o código trocar.
3. O aluno lê o QR Code (ou abre o link) e passa por: RA + e-mail → foto do rosto
   (comparação simulada, ver comentário em `reconhecimento-facial.js`) → localização
   (raio de 500m do campus, configurável em `geolocalizacao.js`) → digitar o código
   do telão. Ao confirmar, a linha dele muda de cinza pra verde na tela do professor.
4. **Histórico** lista todas as chamadas já geradas para aquela turma. Cada uma pode
   ser expandida para ver e **ajustar manualmente** (Presente / Falta / Falta
   justificada) a presença de qualquer aluno, mesmo em chamadas já encerradas.

## Como funciona o login (uma única tela)

O formulário de login pede **RA** e **e-mail**:

- Se baterem com o cadastro do **coordenador**, abre o painel do coordenador.
- Se baterem com o cadastro de um **professor** (criado pelo coordenador), abre
  o painel daquele professor, mostrando só as disciplinas/turmas atribuídas a ele.
- Se não baterem com nada, **nada é aberto** — aparece um aviso.

Credencial padrão do coordenador (já vem cadastrada):
- RA: `COORD001`
- E-mail: `coordenador@instituicao.edu.br`

## Como testar localmente

Como o projeto usa `fetch` de módulos via `<script>` normais (sem `type="module"`),
basta abrir `index.html` num servidor estático simples (não precisa build):

```bash
npx serve .
# ou
python3 -m http.server 8080
```

Depois é só publicar a pasta inteira no GitHub Pages.

## Próximo passo (fora do escopo deste front-end)

Trocar `js/data/db.js` por chamadas a uma API real ligada a PostgreSQL/SQL,
mantendo os mesmos nomes de tabelas e campos já usados aqui.

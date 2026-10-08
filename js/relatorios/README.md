# Relatórios (dashboard)

Aba **Relatórios** dos painéis do coordenador e do professor: números, gráficos e tabelas lidos
**direto do Supabase**, num painel escuro verde-água com um **globo girando ao fundo**, navegação lateral
e um **carrossel de destaques** que troca sozinho.

## Arquivos
| Arquivo | Função |
|---|---|
| `js/relatorios/relatorios.js` | Busca os dados, calcula os números e desenha as telas (`renderRelatorios`, `Relatorios.parar`, `Relatorios.irPara`) |
| `js/relatorios/globo.js` | Globo animado em `<canvas>` (sem biblioteca externa) |
| `css/relatorios.css` | Todo o visual (classes começam com `.rel-`) |

## Seções
**Coordenador:** Visão geral · Alunos · Cursos · Disciplinas · Professores
**Professor:** Minha atuação · Professores · Cursos

| Seção | O que mostra |
|---|---|
| Visão geral (coord.) | Alunos, professores, cursos, disciplinas, turmas, matrículas; alunos por curso; taxa de presença; carrossel |
| Alunos | Média de disciplinas por aluno, alunos sem disciplina, alunos por curso, quantas disciplinas cada aluno cursa (0, 1, 2, 3, 4+) e tabela com busca |
| Cursos | Alunos, disciplinas, turmas e professores de cada curso |
| Disciplinas | Curso, professor, turmas e alunos de cada disciplina |
| Professores | Todos os professores com **cursos vinculados**, disciplinas, turmas e alunos |
| Minha atuação (prof.) | Só os dados do professor logado: turmas, disciplinas, alunos, chamadas feitas e abertas, presença das suas turmas |

No painel do professor, a seção **Professores** mostra todos, com a linha dele marcada ("você"), e **Cursos** marca os cursos dele ("seu curso").

## Como os números são calculados
- **Disciplinas de um aluno** = disciplinas das turmas em que ele está matriculado (matrícula repetida não conta duas vezes).
- **Cursos vinculados a um professor** = cursos das disciplinas dele (`disciplinas.professor_id`) e das turmas dele (`turmas.professor_id`).
- **Alunos de um professor** = alunos distintos matriculados nas turmas dele.
- **Taxa de presença** = presentes ÷ (presentes + faltas + justificadas), em %.
- Alunos cujo `curso_id` não existe em `cursos` aparecem como "Sem curso".

## Tabelas lidas (somente leitura)
`alunos`, `professores`, `cursos`, `disciplinas`, `turmas`, `matriculas`, `chamadas`, `presencas`.
As fotos em base64 **não** são lidas (pesam muito). O RA e o e-mail **não aparecem** no dashboard.
Se uma coluna tiver outro nome no seu banco, a busca tenta de novo com `*` em vez de quebrar.

## Atualização e movimento
- Os dados são buscados de novo **a cada 30 segundos** (constante `ATUALIZAR_A_CADA_MS`). A tela só é redesenhada se algum número mudou.
- Botão ↻ no topo atualiza na hora. A bolinha pulsando indica "ao vivo" e fica vermelha se a busca falhar.
- O carrossel troca a cada 5 segundos (`CARROSSEL_A_CADA_MS`) e pausa com o mouse em cima.
- Ao sair da aba, `Relatorios.parar()` desliga o globo, o carrossel e a atualização. O globo também para sozinho se sair da tela, e fica parado se o sistema pedir "reduzir movimento".

## Ligação nos painéis
- `js/coordenador/coordenador.js`: aba `relatorios` em `ABAS_COORDENADOR` e `Relatorios.parar()` em `renderizarAbaAtivaCoordenador()`.
- `js/professor/professor.js`: aba `relatorios` em `ABAS_PROFESSOR` (guarda o `parar()` em `pararAssinaturaAbaProfessor`).
- `index.html`: `css/relatorios.css` no `<head>` e `globo.js` + `relatorios.js` antes dos módulos do coordenador.

## Limites conhecidos
- Ele lê as tabelas inteiras (em páginas de 1000 linhas). Para poucos milhares de linhas é rápido; com muito mais, o ideal é criar views/contagens no Supabase.
- Como o sistema usa a chave `anon` com policies abertas, qualquer pessoa com a chave poderia ler essas tabelas pela API. O dashboard não muda isso.
- O globo é estilizado (pontos e rotas de luz), não um mapa real.
- Dashboard do **chat** ainda não existe (próximo passo).

## Ideias para o próximo passo
- **Dashboard do chat:** mensagens por dia, conversas ativas, tempo de resposta (sem ler o conteúdo, que está cifrado).
- **Assistente de dados (n8n):** caixa "Pergunte aos dados" ligada a um fluxo do n8n com um agente de IA e o MCP do Supabase, para perguntas como "quantos alunos faltaram esta semana?".
- **Filtros:** por curso, turno e período.

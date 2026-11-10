# Tela do aluno

Mostra cursos, disciplinas, presenças e faltas do aluno (frequência mínima de 75%, em `FREQ_MINIMA`).

## Arquivos
- `js/aluno/mapa-banco.js` nomes das tabelas e colunas (ajuste só aqui)
- `js/aluno/dados.js` leitura no Supabase via `dbListar` + login por RA e e-mail
- `js/aluno/painel.js` desenha a tela
- `css/aluno/aluno.css` estilo

## Ligar no projeto
1. `index.html`
   - CSS: `<link rel="stylesheet" href="css/aluno/aluno.css" />`
   - Seção: `<section id="tela-aluno" class="oculto"></section>`
   - Scripts, antes do `js/main.js`: `js/aluno/mapa-banco.js`, `js/aluno/dados.js`, `js/aluno/painel.js`
2. Login (mesma tela do professor e do coordenador): depois que RA + e-mail não forem de professor nem de coordenador, chame
   `if (await PainelAluno.entrar(ra, email)) return;`
3. `js/main.js`: no início, `if (PainelAluno.restaurar()) return;` (reabre a tela ao recarregar)





# Aula ativa, chamada e perguntas: como encaixar

## 1. Banco
Rode `banco-de-dados/aula-ativa/schema_aula_ativa.sql` no SQL Editor do Supabase.
Se seus ids forem numéricos, troque `uuid` por `bigint` nas colunas `*_id`.

## 2. Arquivos novos (copie para o repositório)
```
js/aulas/api.js                      -> acesso comum (ajuste cliente() se preciso)
js/aluno/chamada/chamada.js          -> aluno vê aula/chamada ativa e confirma presença
js/aluno/trabalho/trabalho.js        -> aluno vê e responde perguntas (só com aula ativa)
js/professor/aula/aula.js            -> botões Ativar aula / Encerrar aula
```

## 3. index.html
Carregue `api.js` **antes** dos outros três, e depois de `db.js` e `mapa-banco.js`:
```html
<script src="js/aulas/api.js"></script>
<script src="js/aluno/chamada/chamada.js"></script>
<script src="js/aluno/trabalho/trabalho.js"></script>
<script src="js/professor/aula/aula.js"></script>
```

## 4. painel.js (aluno): 2 pequenas mudanças
Em `desenhar(d)`, depois do `</section>` do resumo, antes de `${corpo}`, adicione:
```html
<section class="al-curso"><h2>Chamada</h2><div id="al-slot-chamada"></div></section>
<section class="al-curso"><h2>Trabalho</h2><div id="al-slot-trabalho"></div></section>
```
No fim de `desenhar(d)` (depois de `raiz().innerHTML = ...`), adicione:
```js
window.AlunoChamada?.montar(document.getElementById("al-slot-chamada"), aluno);
window.AlunoTrabalho?.montar(document.getElementById("al-slot-trabalho"), aluno);
```
No `clique`, na ação `"sair"`, chame antes de recarregar:
`window.AlunoChamada?.parar(); window.AlunoTrabalho?.parar();`

## 5. Painel do professor (Minhas turmas)
No card de cada turma, ao lado de "Gerar chamada", crie um `<span id="aula-ctl-ID">` e chame:
```js
window.AulaProfessor.montar(document.getElementById("aula-ctl-" + turma.id),
  { turmaId: turma.id, professorId: professor.id });
```

## 6. Seu "Gerar chamada" atual
Ao criar a linha em `chamadas`, grave também:
- `aula_id` = id da aula ativa da turma (`AulaProfessor.aulaAtiva(turmaId)`)
- `status` = `'ativa'`

Sem aula ativa, o botão Gerar chamada deve avisar "Ative a aula primeiro".

## 7. Como o fluxo fica
1. Professor: Minhas turmas > **Ativar aula** (guarda a posição do computador, raio de 100 m).
2. Professor: **Gerar chamada** (QR no telão, como já funciona).
3. Aluno logado: vê a aula/chamada ativa e toca em **Confirmar presença** (servidor confere matrícula, chamada ativa e raio).
4. Perguntas aparecem em "Trabalho" e só aceitam resposta com a aula ativa.
5. Professor: **Encerrar aula**: a chamada fecha e ninguém mais responde.

## Limites desta versão
- O login do aluno é por RA + e-mail, sem Supabase Auth. As funções recebem `aluno_id` do navegador, então um aluno mal-intencionado poderia tentar enviar o id de outro. Para produção, use Supabase Auth ou um token de sessão.
- Atualização por consulta a cada 5 s. Dá para trocar por Realtime (WebSocket) depois.
- Ainda faltam: criar/sortear perguntas no painel do professor e a correção com IA (Edge Function do Supabase).

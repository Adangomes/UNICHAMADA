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

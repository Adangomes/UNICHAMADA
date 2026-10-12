# Como contribuir

Obrigado por ajudar! Este guia mostra como rodar o módulo de TI, como o código é organizado e o que
conferir antes de enviar uma mudança. Para entender o desenho geral, leia o [ARCHITECTURE](ARCHITECTURE.md).

## Rodar na sua máquina

1. Siga o [README](README.md) até o passo 3 (banco e configuração).
2. Dentro da pasta `ti/`, abra um servidor local:
   ```bash
   python3 -m http.server 8000
   ```
3. Abra `http://localhost:8000` e entre com a sua conta de coordenador de TI.

> Use um projeto Supabase **de teste**, e não o dos dados reais.

## Regras do código

| Regra | Por quê |
|---|---|
| **1 tabela = 1 arquivo** em `js/data/` | achar onde algo acontece |
| **1 tela = 1 arquivo**, com o mesmo nome | idem |
| Tela **nunca** fala direto com o Supabase | só `js/data/` faz isso |
| Rótulos e listas em `js/config/constantes.js`; regras fixas em `regras.js`; textos do login em `textos-login.js` | mudar um texto em um lugar só |
| **JS e CSS com o mesmo caminho** (`js/<equipe>/<seção>/...` e `css/<equipe>/<seção>/...`) | achar o estilo a partir do código, e o contrário |
| **Arquivo com mais de ~100 linhas vira pasta de blocos** (veja "Dividir em blocos" abaixo) | arquivos pequenos e fáceis de achar |
| Texto que vem do banco entra na tela com `TI.dom.el` (nunca `innerHTML`) | evita injeção de código |
| **Estilo no CSS da seção da tela** (`css/<equipe>/<seção>/<tela>.css`), nunca `style:` fixo no JavaScript | achar o estilo de uma tela e manter os arquivos pequenos |
| Comentários e textos da tela em **português** | é o idioma do projeto |
| Nada de chave secreta no código | veja o [SECURITY](SECURITY.md) |

## Receitas

### Criar uma tela nova
1. Veja em qual **seção do menu** ela entra (ARCHITECTURE, seção 7.1) e crie o JavaScript na pasta correspondente,
   por exemplo `js/coordenador_ti/coordenacao/minha-tela.js`, registrando: `TI.telas.minhaTela = { async render(container, ctx, params) { ... } }`.
2. Crie o CSS no **mesmo caminho** dentro de `css/`, por exemplo `css/coordenador_ti/coordenacao/minha_tela.css`
   (se já existir um arquivo "reservado" com o nome da tela, use ele).
3. Em `js/app/rotas.js`, adicione a rota em `tabela` **com `css: ['caminho/do/arquivo.css']`**.
4. Em `js/comum/menu.js`, coloque o item no menu de quem pode ver.
5. Em `index.html`, adicione o `<script>` **antes** de `js/app/rotas.js`.
6. Atualize o mapa em [ARCHITECTURE.md](ARCHITECTURE.md) (seção 7).

### Dividir em blocos
Quando um arquivo passa de umas 100 linhas ou mistura assuntos:
1. Troque o arquivo por uma **pasta com o mesmo nome** (ex.: `triagem.js` vira `triagem/`).
2. Deixe um arquivo principal que carrega os dados e monta a página, e mande cada pedaço para um arquivo com o
   nome do que ele faz (`item.js`, `lateral.js`, `trilha.js`...).
3. Cada bloco se registra num objeto próprio, por exemplo `TI.telas.triagemBlocos.item = function (...) { ... }`,
   e recebe o que precisa por parâmetro (nunca por variável solta).
4. No `index.html`, os blocos entram **antes** do arquivo principal.
5. Se o CSS também ficou grande, divida do mesmo jeito (como `css/login/`, que tem três blocos).

### Mudar a tela de login
| O que mudar | Onde |
|---|---|
| Textos (título, subtítulo, mensagens do painel, aviso de ajuda) | `js/config/textos-login.js` |
| Cor do botão e dos links | as duas variáveis do topo de `css/login/login.css` |
| Tamanho do cartão e fundo quadriculado | `css/login/login.css` |
| Painel da esquerda (borda inclinada, mensagens, setas) | `css/login/painel_animado.css` |
| Campos, botão e avisos do formulário | `css/login/formulario.css` e `js/auth/login.js` |
| Cores, velocidade e inclinação das faixas animadas | bloco "CORES" no começo de `js/auth/moldura/animacao.js` |
| Tempo e funcionamento das mensagens que se alternam | `js/auth/moldura/carrossel.js` |

Depois de mexer, confira no computador, no celular e com "reduzir movimento" ligado no aparelho.

### Criar uma tabela nova
1. Adicione o SQL em `banco-de-dados/` (com as regras de acesso: tabela sem regra fica fechada).
2. Crie `js/data/<tabela>.js` e carregue no `index.html`.
3. Registre no [ARCHITECTURE.md](ARCHITECTURE.md) e no [CHANGELOG.md](CHANGELOG.md).

## Antes de enviar uma mudança

- [ ] Abri o painel e testei a tela que mudei (computador **e** celular).
- [ ] Nenhum erro em vermelho no Console do navegador (F12).
- [ ] Testei com um usuário que **não** deve ter acesso (ex.: infra tentando ver o quadro de desenvolvimento).
- [ ] Nenhuma chave, senha ou dado pessoal foi para o repositório.
- [ ] Atualizei a documentação e o CHANGELOG, se precisava.

## Commits e ramificações

- Uma ramificação por assunto: `feature/nome-curto`, `fix/nome-curto`.
- Mensagens no imperativo e curtas: `Adiciona filtro por categoria na fila`.
- Mudança grande? Explique no pedido de integração o que mudou e como testar.

## Dúvidas

Abra uma *issue* ou fale com os responsáveis do projeto. Veja também o [Código de Conduta](CODE_OF_CONDUCT.md).

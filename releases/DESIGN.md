# Design System & Visual Guidelines — UNICHAMADA

Este documento captura o sistema visual e as diretrizes de interface do **UNICHAMADA**, garantindo consistência estética, legibilidade e manutenibilidade sem a necessidade de engenharia reversa do código.

## Essência da Identidade

O **UNICHAMADA** não é um painel SaaS corporativo genérico e nem um sistema acadêmico antiquado. A interface foi desenhada sob o conceito de **"Carteirinha Acadêmica & Ficha de Secretaria"**: precisa ser precisa, técnica, limpa, acolhedora e imediata. 

O design comunica:
- **Confiança Institucional:** O professor e o aluno conseguem identificar o estado de chamadas, turmas e presenças instantaneamente.
- **Sistemas Modulares:** Elementos como cartões, botões, modais e seletores seguem uma linguagem unificada inspirada em documentos oficiais e acadêmicos.
- **Clareza Operacional:** Uso intencional de cores para validações (sucesso, alerta, erro) sem poluição visual.

---

## Paleta de Cores (Design Tokens)

As cores oficiais do sistema baseiam-se em tons de tinta profunda, papel levemente amarelado e apontamentos tipográficos de correção.

### Neutros & Papel (`base.css`)
- **`--tinta` (`#1F2D50`)**: Azul-tinta profundo — cor primária de cabeçalhos e elementos principais.
- **`--tinta-clara` (`#34467A`)**: Tom de suporte para hovers e destaques secundários.
- **`--papel` (`#F6F4EE`)**: Branco-papel de fundo, com leve textura ou gradiente sutil.
- **`--papel-cartao` (`#FFFFFF`)**: Superfície dos cartões e modais.
- **`--grafite` (`#2B2B27`)**: Texto principal de leitura.
- **`--grafite-suave` (`#6B6B63`)**: Texto secundário, rótulos e metadados.
- **`--linha` (`#DAD5C6`)**: Bordas e divisores com toque de caderno/documento.

### Acentos & Status
- **`--coral` (`#D65B4A`)**: Caneta de correção — usado em erros, avisos importantes e botões de perigo/exclusão.
- **`--verde-aprovado` (`#3E7C5A`)**: Sucesso, confirmações de presença e estados válidos.
- **`--amarelo-alerta` (`#C98A1E`)**: Estados de atenção e foco acessível.

---

## Tipografia

Famílias tipográficas utilizadas no projeto via Tailwind / CSS nativo:

- **`--fonte-display` ('Space Grotesk')**: Usada em títulos, cabeçalhos principais e marcas de destaque.
- **`--fonte-corpo` ('IBM Plex Sans')**: Usada em todo o corpo de texto, botões e formulários para máxima legibilidade.
- **`--fonte-mono` ('IBM Plex Mono')**: Usada em códigos, tags, horários, IDs e campos numéricos de confirmação.

### Regras de Uso
- Rótulos de formulários usam letras maiúsculas em tamanho reduzido com espaçamento controlado (`uppercase`, tracking analítico).
- Entradas de código de confirmação utilizam fonte monoespaçada com espaçamento largo para facilitar a leitura rápida de dígitos.

---

## Primitivas e Componentes Visuais

### 1. Cartões (`.cartao`, `.carteirinha-login`, `.confirmacao-cartao`)
- Bordas arredondadas suaves (`--raio: 10px` ou `16px`).
- Sombras elegantes (`--sombra` e `--sombra-forte`) para dar profundidade de papel sobre a mesa.
- Topos estruturados com faixas de cor sólida ou listras diagonais sutis de marcação.

### 2. Botões
- **Primário (`.btn-primario`)**: Fundo em azul-tinta (`--tinta`), texto branco, transições suaves de elevação.
- **Secundário (`.btn-secundario`)**: Fundo transparente com borda estruturada.
- **Perigo (`.btn-perigo`)**: Tom coral (`--coral`) para exclusões e remoções críticas.

### 3. Modais & Toasts (`.toast`, `.modal`)
- Notificações flutuantes posicionadas no canto superior direito para feedback imediato de ações (sucesso ou erro).

---

## Diretrizes: O Que Fazer e O Que Não Fazer

### Fazer (Do):
- Manter a consistência das variáveis CSS definidas em `base.css`.
- Garantir que elementos interativos tenham estados de foco visíveis (`outline` acessível).
- Utilizar os componentes de feedback (toast) para qualquer ação assíncrona de salvamento.

### Não Fazer (Do Not):
- Criar cores hexadecimais avulsas nos componentes de tela; utilizar sempre as variáveis `--` definidas no escopo global.
- Misturar estilos visuais de outros frameworks visuais (como Bootstrap ou Tailwind crus sem identidade) para não quebrar a temática de "carteirinha acadêmica".
- Utilizar sombras pesadas ou gradientes coloridos excessivos.

---

## Referências de Implementação
- **Tokens globais:** `base.css`
- **Tela de Login:** `login.css`
- **Fluxo de Confirmação:** `confirmacao-presenca.css`
- **Notificações e Alertas:** `notificacao.css`

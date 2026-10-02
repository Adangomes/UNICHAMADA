# UniChamada — Skills e Documentação

Pacote de **skills** (instruções reutilizáveis para assistentes de IA e para a equipe) com a documentação do **UniChamada**, sistema de gestão acadêmica e frequência inteligente.

- Documentação online: <https://adangomes.github.io/UNICHAMADA/>
- Código-fonte do sistema: <https://github.com/Adangomes/UNICHAMADA>
- Autores: Adalberto e Diego (Análise e Desenvolvimento de Sistemas)

## O que é o UniChamada

Sistema focado em **autenticação e registro de presença em tempo real** via QR Code, face-id e geolocalização, feito em **Vanilla JavaScript (SPA)** com persistência relacional em nuvem no **Supabase (PostgreSQL)**. Publicado como site estático no GitHub Pages, sem etapa de build.

## Stack

| Camada | Tecnologia | Detalhes |
| --- | --- | --- |
| Front-end | HTML5, CSS3, JavaScript ES6+ | Módulos nativos, sem frameworks, sem build |
| Banco e backend | Supabase | PostgreSQL + Realtime + Auth |
| SDK | `@supabase/supabase-js` | Isolado no wrapper `db.js` (Data Mapper) |
| Hospedagem | GitHub Pages | Deploy contínuo e estático |
| Automação | n8n + webhook do Supabase | Envio de e-mails de notificação |

## Estrutura deste repositório

```
.
├── skills/
│   └── unichamada/
│       ├── SKILL.md                  # Skill principal (visão geral + regras)
│       └── references/
│           ├── fluxo-chamada.md      # Fluxo do professor e do aluno
│           ├── modulos.md            # Mapa de pastas e arquivos JS/CSS
│           └── integracoes.md        # Supabase, Realtime e n8n (e-mail)
├── ARCHITECTURE.md
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── LICENSE
├── SECURITY.md
├── context7.json                     # Configuração de indexação no Context7
├── package.json
├── package-lock.json
└── tsconfig.base.json
```

## Como usar a skill

Copie a pasta `skills/unichamada/` para o diretório de skills da sua ferramenta (por exemplo, `.claude/skills/`) ou aponte o assistente para este repositório. A skill é carregada quando a conversa envolve explicar, manter, depurar ou estender o UniChamada.

## Validação rápida

```bash
npm run check   # confere se context7.json é um JSON válido
```

## Licença

[MIT](LICENSE)

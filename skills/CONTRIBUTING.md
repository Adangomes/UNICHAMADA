# Contribuindo

Obrigado por querer ajudar! Este guia explica como contribuir com o UniChamada e com esta documentação.

## Antes de começar

1. Leia o [README](README.md) e a [ARCHITECTURE](ARCHITECTURE.md).
2. Leia o [Código de Conduta](CODE_OF_CONDUCT.md).
3. Procure uma issue existente ou abra uma nova descrevendo o problema ou a ideia.

## Fluxo

1. Faça um *fork* e crie uma branch: `git checkout -b feat/minha-melhoria`.
2. Faça commits pequenos, com mensagens claras (sugestão: `feat:`, `fix:`, `docs:`, `refactor:`).
3. Rode `npm run check` antes de abrir o PR.
4. Abra o Pull Request explicando **o quê** e **por quê**; inclua prints quando mexer na interface.

## Regras do projeto

- **Sem framework e sem build:** use HTML, CSS e JS com módulos nativos.
- **Acesso a dados só por `js/data/db.js`.** Telas não chamam o SDK do Supabase diretamente.
- **Nada de segredos no repositório:** use apenas a chave pública (anon) no front-end e proteja os dados com RLS. URLs de webhook, chaves `service_role` e credenciais do n8n ficam fora do Git.
- **Organização por perfil:** código de coordenador, professor e aluno fica em `js/coordenador/`, `js/professor/` e `js/aluno/`.
- **Dados de alunos são sensíveis:** não inclua RA, e-mails ou fotos reais em exemplos, prints ou testes.

## Documentação

- Mantenha `skills/unichamada/SKILL.md` curta; detalhes vão em `references/`.
- Atualize o `CHANGELOG.md` a cada mudança relevante.
- Escreva em português claro, com exemplos curtos.

## Licença

Ao contribuir, você concorda que sua contribuição será licenciada sob a [MIT](LICENSE).

# Segurança

## Como avisar sobre uma falha

Achou algo que permite ver dados de quem não deveria, aprovar sem permissão, entrar sem login ou
expor uma chave? **Não abra uma *issue* pública.** Em vez disso:

1. Use o aviso privado do GitHub (aba **Security** > **Report a vulnerability**), ou
2. fale direto com os responsáveis do projeto.

Conte o que aconteceu, onde, e como repetir. Responderemos o mais rápido possível.

## O que nunca vai para o repositório

| Item | Onde deve ficar |
|---|---|
| Chave `service_role` do Supabase | só nas credenciais do n8n |
| Senhas, tokens de acesso | em lugar nenhum do código |
| Dados reais de alunos, professores ou funcionários | fora do repositório e de prints |
| Chave `anon` do Supabase | pode ficar em `js/config/supabase-config.js` (é pública por natureza) |

Se uma chave secreta vazar: **troque-a no Supabase imediatamente** e avise os responsáveis.

## Como o módulo se protege

- Login por e-mail e senha (Supabase Auth). Funcionário novo cria a própria senha pelo link do e-mail.
- Tabelas `ti_` protegidas por regras de acesso no banco (RLS): a chave pública do site não enxerga nada delas.
- Cada setor vê apenas o seu trabalho; a coordenação vê tudo.
- Só a coordenação aprova e publica uma demanda, e isso é imposto por um gatilho no banco.
- Chamados, comentários, revisões e auditoria não podem ser apagados pelo painel.
- Desativar um funcionário tira o acesso na hora (as regras checam `ativo`).
- Textos vindos do banco nunca entram na tela como HTML.

## Limites conhecidos

- O menu apenas esconde telas; quem bloqueia de verdade é o banco. Por isso, **toda tabela nova precisa de regras**.
- O e-mail de convite sai pelo serviço do Supabase, que tem limite de envios por hora.
- O painel de professores e coordenadores (fora deste módulo) usa regras de acesso mais abertas, por ser um
  projeto acadêmico. As tabelas do TI **não** herdam isso.
- A conta de um funcionário desativado continua existindo no Supabase Auth, mas sem acesso a nada do TI.
- Foi testado com um Supabase simulado; ainda falta testar contra o ambiente real.

## Versões com suporte

Apenas a versão mais recente (veja o [CHANGELOG](CHANGELOG.md)).

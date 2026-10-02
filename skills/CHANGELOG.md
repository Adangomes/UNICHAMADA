# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Skill `unichamada` com referências de fluxo, módulos e integrações.
- Documentação de arquitetura, contribuição, segurança e código de conduta.
- Configuração `context7.json` para indexação da documentação.

## [2.0.0]

### Adicionado
- Persistência relacional no Supabase (PostgreSQL), com Realtime e Auth.
- Token rotativo (QR Code + código de 6 caracteres) e modo Telão.
- Geofencing e captura de rosto (face-id) na confirmação de presença.
- Dashboard de presença em tempo real e histórico auditável com justificativa de faltas.
- Perfis de coordenador, professor e aluno.
- Integração de notificações por e-mail via webhook do Supabase e n8n.

### Alterado
- Camada de dados migrada de localStorage para o Supabase, mantendo o wrapper `db.js`.

## [1.0.0]

### Adicionado
- Versão inicial em Vanilla JS com tabelas simuladas em localStorage.

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





Relatório de Atividades do Desenvolvimento (03/10/2026)
1. Contexto e Objetivo
Implementação e validação da automação de notificações enviadas pela coordenação aos professores através do ecossistema composto por Supabase, n8n (em execução via Docker local) e a API do Gmail.

2. Atividades Executadas
Infraestrutura e Arquitetura de Comunicação
Análise da arquitetura de integração: Identificação de falhas no modelo push/webhook devido ao isolamento de rede entre o container n8n em ambiente local (localhost) e a infraestrutura na nuvem do Supabase Cloud.

Eliminação de dependências externas: Decisão arquitetural de descartar o uso do ngrok para exposição de portas.

Migração para o modelo Polling/Schedule: Substituição da trigger inicial do workflow no n8n. O nó de Webhook foi alterado para um Schedule Trigger configurado com intervalo de execução periódica (1 minuto).

Integração do Banco de Dados e Mapeamento
Consulta de registros pendentes: Configuração do nó Supabase (Get many rows) para efetuar polling na tabela notificacao_professores filtrando registros não processados.

Mapeamento de contexto: Correção das referências de dados no nó de envio do Gmail (Send a message). As expressões legadas baseadas em $('Webhook') foram refatoradas para a sintaxe nativa de payload $json ($json.email, $json.nome), eliminando exceções do tipo Referenced node doesn't exist.

Validação do fluxo end-to-end: Realização de disparo de teste completo, confirmando o consumo da fila de notificações no Supabase e a entrega de e-mails via API do Gmail.

Refatoração e Acessibilidade do Frontend
Correção de violações DOM/W3C: Identificação de alertas no Chrome DevTools relacionados à acessibilidade e autocompletar em formulários do módulo js/coordenador/notificacao.js.

Vinculação de elementos: Correção de divergências nos atributos <label htmlFor="..."> e inserção dos atributos id e name correspondentes nos elementos de formulário (<input>, <textarea>), saneando os avisos de console do navegador.

3. Estado Atual do Sistema
Workflow do n8n publicado e operando de forma autônoma.

Banco de dados Supabase mantendo a integridade através de triggers nativas e geração de UUIDs.

Frontend sanitizado quanto aos avisos de validação do formulário de criação de notificações.

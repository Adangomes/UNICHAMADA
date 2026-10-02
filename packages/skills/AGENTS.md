# AGENTS & AUTOMATION — UNICHAMADA

Este documento define as diretrizes, regras de contrato e o comportamento dos agentes automatizados e fluxos de integração que operam no ecossistema do **UNICHAMADA**.

## 1. Visão Geral dos Agentes
O projeto utiliza automações baseadas em eventos (via n8n e webhooks) para lidar com tarefas assíncronas, garantindo que o front-end SPA permaneça leve e focado na experiência do usuário.

---

## 2. Diretrizes de Comportamento (Rules of Engagement)

- **Assincronicidade:** Nenhuma operação crítica de bloqueio de tela deve depender exclusivamente da resposta síncrona do agente. O front-end deve tratar fallbacks caso o webhook demore a responder.
- **Validação de Payload:** Todo dado recebido pelos webhooks deve passar por uma checagem básica de integridade (ex: validação de campos obrigatórios como `turma_id` e `evento`) antes de ser processado.
- **Tratamento de Erros:** Falhas em fluxos automatizados devem retornar um objeto JSON estruturado contendo `ok: false` e a descrição do erro, evitando quebrar a aplicação cliente.

---

## 3. Contratos de Comunicação (Payloads)

### Evento: `chamada_iniciada`
- **Origem:** Front-end (Painel do Professor)
- **Destino:** Instância n8n (`/webhook/unichamada-notificacoes`)
- **Payload Esperado:**
  ```json
  {
    "evento": "chamada_iniciada",
    "turma_id": "string-uuid",
    "professor_id": "string-uuid",
    "timestamp": "ISO-8601"
  }

# Workflows e Automações — UNICHAMADA

Este documento descreve os fluxos de trabalho automatizados integrados ao ecossistema do **UNICHAMADA** através de instâncias de orquestração (n8n).

## Visão Geral das Automações

Os fluxos operam de forma assíncrona para garantir que o front-end em Vanilla JS e o banco de dados Supabase permaneçam leves, delegando tarefas pesadas ou notificações para o backend automatizado.

---

## Fluxo 1: Webhook de Notificações (`webhook-notificacoes.json`)

### Objetivo
Recepcionar eventos gerados pelas ações do sistema (como abertura de chamadas, alertas de geolocalização ou avisos institucionais) e disparar notificações automatizadas.

### Endpoint / Gatilho
- **Método:** `POST`
- **Trigger:** Webhook HTTP Node (n8n)

### Contrato de Dados (Payload Esperado)
```json
{
  "evento": "chamada_iniciada",
  "turma_id": "uuid-da-turma",
  "professor_id": "uuid-do-professor",
  "timestamp": "2026-10-02T13:40:00Z"
}

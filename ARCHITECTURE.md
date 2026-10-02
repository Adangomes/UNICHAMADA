# Arquitetura do Sistema — UNICHAMADA

Este documento detalha a arquitetura de software, o fluxo de dados, a segurança e a infraestrutura do projeto **UNICHAMADA**.

## 1. Visão Geral
O UNICHAMADA adota uma arquitetura desacoplada e *serverless*, priorizando alta performance, baixo consumo de recursos e ausência de etapas complexas de build (*no-build philosophy*).

```text
+-------------------------------------------------------------+
|                        Front-end SPA                        |
|        (Vanilla JavaScript, Native ES6 Modules, SPA)        |
+--------------+------------------------------+---------------+
               |                              |
               | (HTTPS / REST / Realtime)    | (Webhooks / Automations)
               v                              v
+--------------+---------------+   +----------+---------------+
|     Supabase (BaaS)          |   |          n8n             |
|  - PostgreSQL Database       |   |  (Automações de fluxos   |
|  - RLS (Row Level Security)  |   |   e processamento back)  |
|  - Realtime Subscriptions    |   +--------------------------+
+------------------------------+

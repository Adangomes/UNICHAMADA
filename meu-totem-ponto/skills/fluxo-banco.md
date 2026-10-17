# Fluxo de Banco de Dados (Supabase)

## Tabelas Necessárias

### 1. `funcionarios`
- `id` (uuid, Primary Key)
- `nome` (text)
- `qr_hash` (text, Unique - valor codificado no crachá QR)
- `ativo` (boolean, default true)

### 2. `registros_ponto`
- `id` (uuid, Primary Key)
- `funcionario_id` (uuid, Foreign Key para `funcionarios.id`)
- `data_hora` (timestamp with time zone)
- `criado_em` (timestamp with time zone, default `now()`)
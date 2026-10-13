# Fluxo do n8n: `ti-criar-funcionario`

Cria a conta de um funcionário de TI. Precisa de uma chave de administrador do Supabase, por isso
**não pode ser feito pelo navegador**. A chave `service_role` fica só nas credenciais do n8n.

Quem chama é o botão **"Cadastrar e enviar acesso"** (`js/coordenador_ti/coordenacao/equipe/cadastro-funcionario.js`).

## O que o site envia (POST, JSON)

```json
{ "access_token": "<sessão de quem está logado>", "nome": "...", "ra": "...", "email": "...", "setor": "dev_frontend" }
```

`setor` é um de: `infraestrutura`, `dev_frontend`, `dev_backend`, `full_stack`, `banco_de_dados`, `power_bi`.

## O que o fluxo devolve

- Sucesso: `{ "ok": true }` (HTTP 200)
- Erro: `{ "mensagem": "texto em português" }` com HTTP 4xx (o site mostra esse texto)

## Nós, em ordem

1. **Webhook** — método `POST`, path `ti-criar-funcionario`, *Respond: Using 'Respond to Webhook' Node*.
   Em *Options > Allowed Origins (CORS)*: o endereço do seu site (ex.: `https://SEU-USUARIO.github.io`).
2. **IF / Code** — valida o corpo: nome com 3+ letras, RA preenchido, e-mail válido e `setor` na lista acima.
   Se inválido → **Respond to Webhook** (HTTP 400) com `{ "mensagem": "Dados inválidos." }`.
3. **HTTP Request — quem está chamando?**
   `GET {SUPABASE_URL}/auth/v1/user` com os cabeçalhos
   `apikey: <chave anon>` e `Authorization: Bearer {{ $json.body.access_token }}`.
   Se der erro → responder HTTP 401 `{ "mensagem": "Sessão inválida." }`. Guarde o `id` devolvido.
4. **HTTP Request — é coordenador de TI?** (credencial com a `service_role`)
   `GET {SUPABASE_URL}/rest/v1/ti_funcionarios?auth_user_id=eq.<id do passo 3>&papel=eq.coordenador_ti&ativo=eq.true&select=id`
   Cabeçalhos: `apikey` e `Authorization: Bearer <service_role>`.
   Se a lista vier vazia → responder HTTP 403 `{ "mensagem": "Só a coordenação de TI cadastra funcionários." }`.
   Guarde o `id` do coordenador (vai em `criado_por`).
5. **HTTP Request — convidar** (service_role)
   `POST {SUPABASE_URL}/auth/v1/invite?redirect_to=<endereço da pasta ti/>`
   Corpo: `{ "email": "<email>", "data": { "nome": "<nome>" } }`.
   O Supabase envia o e-mail com o link de primeiro acesso e devolve o usuário criado (guarde o `id`).
   Se o e-mail já existir → responder HTTP 409 `{ "mensagem": "Já existe uma conta com este e-mail." }`.
6. **HTTP Request — gravar na equipe** (service_role)
   `POST {SUPABASE_URL}/rest/v1/ti_funcionarios` com o cabeçalho `Prefer: return=minimal`.
   Corpo:
   ```json
   { "auth_user_id": "<id do passo 5>", "nome": "...", "ra": "...", "email": "...",
     "setor": "...", "papel": "especialista", "criado_por": "<id do passo 4>" }
   ```
   Se falhar (ex.: RA repetido) → apague a conta criada no passo 5
   (`DELETE {SUPABASE_URL}/auth/v1/admin/users/<id>`) e responda HTTP 409
   `{ "mensagem": "RA ou e-mail já cadastrado." }`.
7. **Respond to Webhook** — HTTP 200 `{ "ok": true }`.

## Pontos de atenção

- O e-mail de convite sai pelo serviço de e-mail do próprio Supabase, que tem limite de envios por hora.
  Se for cadastrar muita gente, configure um SMTP próprio em *Authentication > SMTP Settings*.
- Em *Authentication > URL Configuration*, o endereço da pasta `ti/` precisa estar em **Redirect URLs**.
- Para o n8n alcançar o Supabase e o site alcançar o webhook, o n8n precisa de endereço **público**
  (https). Em `localhost`, só funciona no seu computador.

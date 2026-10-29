# Configurar e-mails dos coordenadores

O login da equipe valida o RA e o e-mail digitados comparando com um cadastro em
`public.coordenadores`. O fluxo atual não envia código e não usa Supabase Auth.

Por isso, cada coordenador precisa ter um endereço real, acessível e igual ao
que será usado na tela de login. Endereços fictícios não recebem o código.

## RAs informados

- RA `9125100`: coordenador acadêmico, atualmente cadastrado como
  `coordenador@unichamada.com.br`.
- RA `9125101`: coordenador de TI, atualmente cadastrado como
  `coordenadorti@unichamada.com.br`.

## 1. Conferir os cadastros atuais

No projeto correto do Supabase, abra **SQL Editor**, execute:

```sql
SELECT id, nome, ra, email
FROM public.coordenadores
WHERE ra IN ('9125100', '9125101')
ORDER BY ra;
```

Confira se os nomes e RAs correspondem aos dois coordenadores antes de alterar
qualquer registro.

## 2. Atualizar para endereços reais

Substitua os dois textos `COLOQUE_EMAIL_REAL...` por endereços que você consegue
abrir. Os endereços devem ser distintos, pois a coluna `email` é única.
Depois execute no SQL Editor:

```sql
UPDATE public.coordenadores
SET email = 'COLOQUE_EMAIL_REAL_DO_COORDENADOR_ACADEMICO'
WHERE ra = '9125100';

UPDATE public.coordenadores
SET email = 'COLOQUE_EMAIL_REAL_DO_COORDENADOR_TI'
WHERE ra = '9125101';
```

Não execute o exemplo sem substituir os valores. O texto `COLOQUE_...` não é
um e-mail válido.

## 3. Verificar o resultado

Execute novamente:

```sql
SELECT nome, ra, email
FROM public.coordenadores
WHERE ra IN ('9125100', '9125101')
ORDER BY ra;
```

Na tela de login, informe cada RA com o e-mail correspondente cadastrado.

## Observações

- Não altere `auth.users` para corrigir o e-mail do cadastro acadêmico. O login
  compara diretamente RA e e-mail com `public.coordenadores`.
- Não use um endereço fictício nem um endereço cuja caixa postal você não
  controla.
- Se o SQL disser que o e-mail já existe, escolha outro endereço exclusivo
  para esse cadastro.
- RA + e-mail é uma verificação simples para demonstração, não uma autenticação
  segura. Não use esse fluxo para proteger dados acadêmicos reais.


- - - - - - - - - - - - - -- - - -- - - - - - -  - - - - - -- - 
- Ir na js/coordenador/coordenador.js e trocar       
      // UUID real do coordenador obtido diretamente da tabela 'coordenadores' do Supabase
      const uuidCoordenadorBanco = '3cec55f8-5a4e-49b1-b333-9350b22b946c';
      ////////////////////////////// TROCAR O USER UID ////////////////////////////
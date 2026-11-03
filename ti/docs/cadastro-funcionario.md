# Cadastro de funcionários

O cadastro atual não usa n8n.

1. Crie a conta do novo funcionário em Supabase > **Authentication > Users**.
2. No painel de TI, cadastre os dados usando o mesmo e-mail da conta Auth.
3. O formulário envia a foto ao bucket privado e chama a função SQL
   `ti_criar_funcionario_com_foto`, que grava o funcionário e gera um ID de crachá sequencial
   no banco (UC0100, UC0101, ...). O sistema mostra o ID após concluir o cadastro.
4. Funcionários legados já cadastrados sem conta Auth continuam usando o login legado. Após validar
   a senha no banco, o sistema vincula uma sessão anônima técnica ao cadastro para respeitar as
   políticas RLS e Storage.

Antes do cadastro com foto, execute `../banco-de-dados/ti-fotos-funcionarios.sql` no SQL Editor
do Supabase. Para funcionários legados, habilite também **Allow anonymous sign-ins** em
Authentication > Settings. O aplicativo usa a chave pública e a sessão do coordenador; nunca coloque a chave
`service_role` no aplicativo ou no navegador.

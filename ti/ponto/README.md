# Meu ponto

A tela é um módulo React integrado ao menu do painel de TI; não possui página `index.html` independente. O componente-fonte está em `src/MeuPonto.jsx`, o CSS isolado em `css/ponto.css` e o bundle estático em `ponto.bundle.js`.

Para desenvolver e gerar o bundle que o painel carrega:

```sh
npm run build:ponto
```

O build da aplicação também gera o bundle antes de empacotar. O bundle é incluído no repositório para o painel web estático.

## Fluxo e requisitos

O funcionário precisa estar autenticado no painel. A tela consulta o ID impresso no crachá pela RPC `ti_buscar_funcionario_ponto`, que confirma que o ID corresponde ao funcionário da sessão autenticada e retorna a foto de referência cadastrada. Para cada batida, a câmera captura uma imagem temporária; o navegador compara localmente os descritores faciais da captura e da referência. Só após a comparação a tela chama `registrar_ponto`, passando o ID e o tipo da batida. A captura não é enviada ao Supabase nem armazenada.

A comparação ocorre no cliente e pode ser contornada por alguém que invoque a RPC diretamente; também não há detecção de vivacidade. Portanto, ela é uma conferência de interface, não um controle biométrico antifraude inviolável. Para impor essa garantia, a validação deve ser feita por um serviço confiável no servidor. As imagens antigas já enviadas para `pontos/` não são removidas pela migração; se for desejado apagá-las, remova somente esse prefixo no Storage e preserve `perfis/`.

No aplicativo Electron, os modelos são carregados pelo protocolo local `unichamada-models://`, que disponibiliza somente os seis arquivos de modelo necessários e evita o bloqueio CORS de `file://`. No navegador, os modelos são servidos a partir de `ponto/models/` como arquivos locais do site.

Execute `banco-de-dados/ti-fotos-funcionarios.sql` e depois `banco-de-dados/ti-ponto.sql` no Supabase. A coordenação pode cadastrar ou substituir a foto de referência pelo menu de opções do funcionário na lista da equipe; as referências ficam no bucket privado `ti-fotos-funcionarios`, no prefixo `perfis/`. O Supabase gera IDs sequenciais para os novos funcionários (UC0100, UC0101, ...) e completa essa coluna nos cadastros existentes. O ID é um identificador do crachá, não substitui a autenticação da conta. O RA deixa de ser obrigatório. A câmera requer permissão e HTTPS ou o aplicativo Electron.

## Painel da coordenação

No mesmo item de Jornada, coordenadores veem primeiro seu próprio bloco **Meu ponto**, com o mesmo fluxo de identificação, comparação facial e batida dos demais funcionários. Abaixo, veem a gestão da equipe: resumo de hoje, consulta de até 32 dias por funcionário/ID, batidas, total diário, saldo contra 8 horas e exportação CSV. Os registros lidos usam `UNICHAMADA_CACHE` em memória por 30 segundos, com chave isolada por coordenador e período; os dados de ponto não são persistidos no `sessionStorage` e o cache do coordenador é invalidado após um ajuste.

A batida normal de entrada é aceita das 06:00 às 13:15. A saída para almoço só é aceita exatamente às 11:00, 12:00, 13:00 ou 14:00, e o retorno exige pelo menos uma hora de intervalo. A saída final pode ocorrer em qualquer horário depois da entrada e do retorno, se o intervalo tiver sido iniciado. O sistema calcula o saldo; não impede a saída antes de completar 8 horas. Uma pausa de café de 15 minutos é opcional, sem batida e não é descontada. Quando a jornada encerrada não tem batidas de almoço e excede seis horas, o cálculo desconta uma hora estimada e sinaliza essa estimativa para conferência.

O formulário de ajuste manual exige ID do crachá, dia, horário, tipo e motivo com no mínimo 10 caracteres. Ele inclui uma batida adicional, não apaga nem substitui registros existentes, e grava a justificativa e a identidade do coordenador na auditoria. Para disponibilizar essas regras em uma instalação existente, execute novamente `banco-de-dados/ti-ponto.sql`; o SQL adiciona os campos, RPC e validações de servidor.

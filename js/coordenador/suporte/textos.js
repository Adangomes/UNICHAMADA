/**
 * textos.js — todos os rótulos da aba Suporte.
 */
window.Suporte = window.Suporte || {};

window.Suporte.T = {
  titulo: 'Suporte',
  subtitulo: 'Abra um chamado para a equipe de TI e acompanhe por aqui.',

  quem: { professor: 'Professor(a)', coordenador: 'Coordenação' },

  categorias: [
    { valor: 'acesso_login', rotulo: 'Não consigo entrar / problema de acesso' },
    { valor: 'erro_sistema', rotulo: 'Algo não funciona no sistema' },
    { valor: 'notificacoes_email', rotulo: 'Notificações ou e-mail' },
    { valor: 'turmas_vinculos', rotulo: 'Turmas, alunos ou vínculos' },
    { valor: 'duvida_uso', rotulo: 'Dúvida de uso' },
    { valor: 'infraestrutura', rotulo: 'Equipamento ou rede (projetor, computador, internet)' }
  ],

  status: {
    aberto: 'Recebido',
    em_atendimento: 'Em atendimento',
    aguardando_usuario: 'Aguardando sua resposta',
    com_coordenacao: 'Em análise',
    resolvido: 'Resolvido',
    fechado: 'Fechado'
  },

  vazio: 'Você ainda não abriu nenhum chamado.',
  dicaNovo: 'Conte o que aconteceu e o que você esperava. Quanto mais detalhe, mais rápido a equipe resolve.',
  dicaResolvido: 'Este chamado foi marcado como resolvido. Se o problema voltou, escreva abaixo e ele será reaberto.',
  dicaAguardando: 'A equipe de TI está esperando a sua resposta.',
  dicaFechado: 'Este chamado está fechado. Se precisar de ajuda de novo, abra um novo chamado.'
};

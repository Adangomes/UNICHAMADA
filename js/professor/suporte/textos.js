/**
 * textos.js — todos os rótulos da aba Suporte (categorias, situações, frases). Mude os textos AQUI.
 * Os VALORES das categorias e das situações precisam ser os mesmos do banco (ti-tabelas.sql).
 */
window.Suporte = window.Suporte || {};

window.Suporte.T = {
  titulo: 'Suporte',
  subtitulo: '',

  quem: { professor: 'Professor(a)', coordenador: 'Coordenação' },

  // o que a pessoa escolhe ao abrir um chamado
  categorias: [
    { valor: 'acesso_login', rotulo: 'Não consigo entrar / problema de acesso' },
    { valor: 'erro_sistema', rotulo: 'Algo não funciona no sistema' },
    { valor: 'notificacoes_email', rotulo: 'Notificações ou e-mail' },
    { valor: 'turmas_vinculos', rotulo: 'Turmas, alunos ou vínculos' },
    { valor: 'duvida_uso', rotulo: 'Dúvida de uso' },
    { valor: 'infraestrutura', rotulo: 'Equipamento ou rede (projetor, computador, internet)' }
  ],

  // como a pessoa vê a situação do chamado
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

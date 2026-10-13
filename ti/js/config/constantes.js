/**
 * constantes.js — rótulos e listas do módulo de TI: setores, grupos, prioridades, status e categorias.
 * Outros blocos de TI.K: regras.js (prazos, checklist, permissões) e textos-login.js (textos do login).
 * Para mudar um texto (ex.: "Em atendimento"), mude AQUI e vale para o painel inteiro.
 */
window.TI = window.TI || {};
TI.telas = {};     // cada tela se registra aqui (ex.: TI.telas.fila)
TI.dados = {};     // cada arquivo de js/data/ se registra aqui (ex.: TI.dados.chamados)

TI.K = {
  // Setores que podem ser escolhidos no cadastro de funcionário (mesmos valores do SQL)
  setores: {
    coordenacao: 'Coordenação de TI',
    infraestrutura: 'Infraestrutura',
    dev_frontend: 'Dev front-end',
    dev_backend: 'Dev back-end',
    full_stack: 'Full stack',
    banco_de_dados: 'Banco de dados',
    power_bi: 'Power BI'
  },
  setoresCadastro: ['infraestrutura', 'dev_frontend', 'dev_backend', 'full_stack', 'banco_de_dados', 'power_bi'],

  // Grupos de trabalho (para onde a triagem direciona)
  grupos: {
    infraestrutura: 'Infraestrutura',
    desenvolvimento: 'Desenvolvimento',
    banco_de_dados: 'Banco de dados',
    power_bi: 'Power BI'
  },

  // Junta front-end, back-end e full stack no grupo "desenvolvimento" (igual ao SQL)
  grupoDoSetor(setor) {
    if (setor === 'infraestrutura') return 'infraestrutura';
    if (setor === 'dev_frontend' || setor === 'dev_backend' || setor === 'full_stack') return 'desenvolvimento';
    if (setor === 'banco_de_dados') return 'banco_de_dados';
    if (setor === 'power_bi') return 'power_bi';
    return 'coordenacao';
  },

  prioridades: { baixa: 'Baixa', media: 'Média', alta: 'Alta' },

  statusChamado: {
    aberto: 'Aberto',
    em_atendimento: 'Em atendimento',
    aguardando_usuario: 'Aguardando usuário',
    com_coordenacao: 'Com a coordenação',
    resolvido: 'Resolvido',
    fechado: 'Fechado'
  },
  chamadoEncerrado: ['resolvido', 'fechado'],

  statusDemanda: {
    backlog: 'Backlog',
    desenvolvendo: 'Desenvolvendo',
    em_revisao: 'Em revisão',
    aprovado: 'Aprovado',
    no_ar: 'No ar',
    cancelado: 'Cancelado'
  },

  categorias: {
    acesso_login: 'Acesso e login',
    erro_sistema: 'Erro no sistema',
    notificacoes_email: 'Notificações e e-mail',
    turmas_vinculos: 'Turmas e vínculos',
    duvida_uso: 'Dúvidas de uso',
    infraestrutura: 'Infraestrutura'
  }
};

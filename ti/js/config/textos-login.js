/**
 * textos-login.js — todos os textos da tela de login e do primeiro acesso.
 * Mude os textos AQUI; o visual está em css/login/ e a moldura em js/auth/moldura/.
 */
window.TI = window.TI || {};

TI.K.login = {
  marca: 'UniChamada',
  selo: 'TI',
  titulo: 'Olá, equipe de TI',
  subtitulo: 'Bem-vindo ao painel do UniChamada',
  rotuloArte: 'Painel de TI',
  ajuda: 'Ainda não tem acesso? Peça à coordenação de TI.',
  // mensagens que se alternam no painel animado (título + texto)
  mensagens: [
    { titulo: 'Tudo num só lugar', texto: 'Chamados, demandas e a sua equipe de TI no mesmo painel.' },
    { titulo: 'Nada vai ao ar sem revisão', texto: 'A coordenação confere e autoriza cada entrega antes do deploy.' },
    { titulo: 'Cada setor com o seu trabalho', texto: 'Infraestrutura, desenvolvimento, banco de dados e Power BI.' }
  ]
};

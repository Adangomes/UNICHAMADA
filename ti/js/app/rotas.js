/**
 * rotas.js — liga cada item do menu à tela certa e diz quem pode abrir cada uma.
 * "menu" = qual item do menu fica marcado quando essa tela está aberta.
 */
window.TI = window.TI || {};

TI.rotas = {
  // css = arquivos de css/ que a tela usa (além dos comuns). Cada tela carrega só o da sua seção.
  tabela: {
    'licencas':            { tela: 'licencasTI',        menu: 'licencas',            css: ['licencas/licencas.css'] },
    'visao-geral':         { tela: 'visaoGeral',        menu: 'visao-geral',         css: ['coordenador_ti/acompanhamento/visao_geral.css'] },
    'fila':                { tela: 'fila',              menu: 'fila',                css: ['coordenador_ti/acompanhamento/fila_de_chamados.css'] },
    'chamado':             { tela: 'detalhe',           menu: 'fila',                css: ['coordenador_ti/acompanhamento/chamado_detalhe.css'] },
    'triagem':             { tela: 'triagem',           menu: 'triagem',             css: ['coordenador_ti/coordenacao/triagem.css'] },
    'aprovacoes':          { tela: 'aprovacoes',        menu: 'aprovacoes',          css: ['coordenador_ti/coordenacao/aprovacoes_de_deploy.css'] },
    'aprovacao':           { tela: 'aprovacaoDetalhe',  menu: 'aprovacoes',          css: ['coordenador_ti/coordenacao/aprovacoes_de_deploy.css'] },
    'equipe':              { tela: 'equipe',            menu: 'equipe',              css: ['coordenador_ti/coordenacao/equipe_de_ti.css'] },
    'metricas':            { tela: 'metricas',          menu: 'metricas',            css: ['coordenador_ti/acompanhamento/metricas_e_sla.css'] },
    'auditoria':           { tela: 'auditoria',         menu: 'auditoria',           css: ['coordenador_ti/acompanhamento/auditoria.css'] },
    'meus-chamados-infra': { tela: 'infra',             menu: 'meus-chamados-infra', css: ['infraestrutura/meus_chamados.css'] },
    'quadro':              { tela: 'dev',               menu: 'quadro',              css: ['desenvolvimento/quadro_de_demandas.css'] },
    'bd':                  { tela: 'bd',                menu: 'bd',                  css: ['desenvolvimento/quadro_de_demandas.css', 'banco_de_dados/tarefas.css'] },
    'powerbi':             { tela: 'powerbi',           menu: 'powerbi',             css: ['desenvolvimento/quadro_de_demandas.css', 'power_bi/pedidos.css'] }
  },

  // telas escondidas (sem item no menu) herdam a permissão da tela "mãe"
  mae: { chamado: 'fila', aprovacao: 'aprovacoes' },

  /** A pessoa pode abrir essa rota? (o banco também bloqueia — isto só evita telas vazias) */
  permitida(rota, f) {
    const base = this.mae[rota] || rota;
    return TI.menu.itens(f).some((s) => s.itens.some((i) => i.rota === base));
  },

  /** Primeira tela ao entrar. */
  padrao(f) {
    return TI.menu.itens(f)[0].itens[0].rota;
  }
};

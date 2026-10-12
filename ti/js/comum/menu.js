/**
 * menu.js — decide quais itens do menu cada pessoa vê (depende do papel e do setor).
 */
window.TI = window.TI || {};

TI.menu = {
  itens(f) {
    if (f.papel === 'coordenador_ti') {
      return [
        { titulo: 'Coordenação', itens: [
          { rota: 'triagem', rotulo: 'Triagem' },
          { rota: 'aprovacoes', rotulo: 'Aprovações de deploy' },
          { rota: 'equipe', rotulo: 'Equipe de TI' }
        ] },
        { titulo: 'Acompanhamento', itens: [
          { rota: 'visao-geral', rotulo: 'Visão geral' },
          { rota: 'fila', rotulo: 'Fila de chamados' },
          { rota: 'quadro', rotulo: 'Quadro de demandas' },
          { rota: 'metricas', rotulo: 'Métricas' },
          { rota: 'auditoria', rotulo: 'Auditoria' }
        ] }
      ];
    }
    const grupo = TI.K.grupoDoSetor(f.setor);
    if (grupo === 'infraestrutura') {
      return [{ titulo: 'Atendimento', itens: [
        { rota: 'meus-chamados-infra', rotulo: 'Meus chamados' },
        { rota: 'fila', rotulo: 'Fila da infraestrutura' },
        { rota: 'visao-geral', rotulo: 'Visão geral' }
      ] }];
    }
    if (grupo === 'banco_de_dados') {
      return [{ titulo: 'Trabalho', itens: [{ rota: 'bd', rotulo: 'Tarefas de banco de dados' }] }];
    }
    if (grupo === 'power_bi') {
      return [{ titulo: 'Trabalho', itens: [{ rota: 'powerbi', rotulo: 'Pedidos de relatório' }] }];
    }
    return [{ titulo: 'Trabalho', itens: [{ rota: 'quadro', rotulo: 'Quadro de demandas' }] }];
  }
};

/**
 * menu.js — decide quais itens do menu cada pessoa vê (depende do papel e do setor).
 */
window.TI = window.TI || {};

TI.menu = {
  itens(f) {
    // 1. Menu do Coordenador de TI (Permanece igual)
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

    // Identifica o grupo do funcionário (infra, banco, power_bi, etc)
    const grupo = TI.K.grupoDoSetor(f.setor);

    // 2. Menu para a equipe de Infraestrutura
    if (grupo === 'infraestrutura') {
      return [{ titulo: 'Atendimento', itens: [
        { rota: 'meus-chamados-infra', rotulo: 'Meus chamados' },
        { rota: 'fila', rotulo: 'Fila da infraestrutura' },
        { rota: 'visao-geral', rotulo: 'Visão geral' }
      ] }];
    }

    // 3. Menu para os demais funcionários (Banco, Power BI, Devs)
    // Agora todos eles veem a aba "Meus chamados"
    const itensTrabalho = [
      { rota: 'meus-chamados-infra', rotulo: 'Meus chamados' }
    ];

    if (grupo === 'banco_de_dados') {
      itensTrabalho.push({ rota: 'bd', rotulo: 'Tarefas de banco de dados' });
    } else if (grupo === 'power_bi') {
      itensTrabalho.push({ rota: 'powerbi', rotulo: 'Pedidos de relatório' });
    } else {
      // Para Devs e outros, mostra o Quadro de Demandas
      itensTrabalho.push({ rota: 'quadro', rotulo: 'Quadro de demandas' });
    }

    return [{ titulo: 'Trabalho', itens: itensTrabalho }];
  }
};

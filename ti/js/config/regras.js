/**
 * regras.js — regras fixas do módulo de TI: prazos (SLA), sugestão da triagem, checklist de revisão
 * e o que cada setor pode fazer. Os rótulos e setores estão em constantes.js.
 */
window.TI = window.TI || {};

// Prazo (SLA) em horas por prioridade
TI.K.slaHoras = { alta: 4, media: 24, baixa: 72 };

// Sugestão da triagem: chamado de infraestrutura vai para a infra; o resto, para desenvolvimento
TI.K.grupoSugerido = function (categoria) {
  return categoria === 'infraestrutura' ? 'infraestrutura' : 'desenvolvimento';
};

// Itens do checklist que a coordenação confere antes de autorizar o deploy
TI.K.checklistRevisao = [
  'Funciona no painel do professor',
  'Funciona no painel do coordenador',
  'Conferido no celular',
  'Sem erros no Console do navegador'
];

// O que cada setor pode fazer (mostrado no formulário de cadastro)
TI.K.permissoesPorSetor = function (setor) {
  const grupo = TI.K.grupoDoSetor(setor);
  if (grupo === 'infraestrutura') {
    return {
      pode: ['Receber chamados de infraestrutura', 'Registrar local e patrimônio', 'Marcar chamados como resolvidos'],
      naoPode: ['Aprovar ou publicar demandas', 'Ver o quadro de desenvolvimento']
    };
  }
  if (grupo === 'banco_de_dados') {
    return {
      pode: ['Receber tarefas de banco de dados', 'Enviar o trabalho para a sua revisão'],
      naoPode: ['Alterar o banco em produção sem a sua aprovação', 'Ver chamados de infraestrutura']
    };
  }
  if (grupo === 'power_bi') {
    return {
      pode: ['Receber pedidos de relatório', 'Enviar o relatório para a sua revisão'],
      naoPode: ['Publicar sem a sua aprovação', 'Ver chamados de infraestrutura']
    };
  }
  return {
    pode: ['Receber demandas do sistema', 'Enviar o trabalho para a sua revisão'],
    naoPode: ['Publicar no ar sem a sua aprovação', 'Ver chamados de infraestrutura']
  };
};

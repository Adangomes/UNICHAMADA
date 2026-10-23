window.TI = window.TI || {};

TI.K.slaHoras = { alta: 4, media: 24, baixa: 72 };

// NOVO: Mapeia o setor do funcionário para o grupo de trabalho do chamado
TI.K.grupoDoSetor = function (setor) {
  if (!setor) return 'coordenacao';
  const s = String(setor).trim().toLowerCase();
  if (s === 'infraestrutura') return 'infraestrutura';
  if (['dev_frontend', 'dev_backend', 'full_stack'].includes(s)) return 'desenvolvimento';
  if (s === 'banco_de_dados') return 'banco_de_dados';
  if (s === 'power_bi') return 'power_bi';
  return 'coordenacao';
};

TI.K.grupoSugerido = function (categoria) {
  return categoria === 'infraestrutura' ? 'infraestrutura' : 'desenvolvimento';
};

TI.K.checklistRevisao = [
  'Funciona no painel do professor',
  'Funciona no painel do coordenador',
  'Conferido no celular',
  'Sem erros no Console do navegador'
];

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

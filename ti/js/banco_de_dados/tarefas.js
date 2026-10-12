/**
 * tarefas.js — tarefas de banco de dados (views, permissões...). Reaproveita o quadro de demandas,
 * filtrado para o grupo "banco_de_dados". Tabelas: ti_demandas, ti_funcionarios.
 */
window.TI = window.TI || {};

TI.telas.bd = {
  render(c, ctx) {
    return TI.telas.dev.renderQuadro(c, ctx, { titulo: 'Tarefas de banco de dados', grupo: 'banco_de_dados', novoGrupo: 'banco_de_dados' });
  }
};

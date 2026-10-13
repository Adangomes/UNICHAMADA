/**
 * pedidos.js — pedidos de relatório do Power BI. Reaproveita o quadro de demandas,
 * filtrado para o grupo "power_bi". Tabelas: ti_demandas, ti_funcionarios.
 */
window.TI = window.TI || {};

TI.telas.powerbi = {
  render(c, ctx) {
    return TI.telas.dev.renderQuadro(c, ctx, { titulo: 'Pedidos de relatório', grupo: 'power_bi', novoGrupo: 'power_bi' });
  }
};

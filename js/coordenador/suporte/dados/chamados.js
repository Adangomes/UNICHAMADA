/**
 * dados/chamados.js — tabela ti_chamados (SQL: banco-de-dados/suporte/02_ti_chamados.sql).
 * Professor e coordenador só enxergam e abrem chamados DELES. Quem pergunta é sempre (tipo, id) da pessoa logada.
 */
window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

window.Suporte.dados.chamados = {
  /** Abre um chamado e devolve o código (ex.: "CH-0012"). */
  async abrir(tipo, id, d) {
    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: tipo, p_id: id,
      p_titulo: d.titulo, p_descricao: d.descricao, p_categoria: d.categoria,
      p_local: d.local || null, p_patrimonio: d.patrimonio || null, p_contexto: d.contexto || {}
    });
  },

  /** Os chamados da pessoa, do mais recente para o mais antigo. */
  async listar(tipo, id) {
    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { p_tipo: tipo, p_id: id })) || [];
  },

  /** Um chamado da pessoa (ou null se não for dela). */
  async ver(tipo, id, codigo) {
    return window.Suporte.dados.rpc('ti_ver_chamado', { p_tipo: tipo, p_id: id, p_codigo: codigo });
  }
};

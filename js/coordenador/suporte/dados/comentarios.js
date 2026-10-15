/**
 * dados/comentarios.js — tabela ti_chamados_comentarios (SQL: banco-de-dados/suporte/03_ti_chamados_comentarios.sql).
 * A conversa do chamado. As notas internas da equipe de TI nunca chegam aqui.
 */
window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

window.Suporte.dados.comentarios = {
  /** A conversa de um chamado da pessoa, em ordem de data. */
  async listar(tipo, id, codigo) {
    return (await window.Suporte.dados.rpc('ti_listar_comentarios', { p_tipo: tipo, p_id: id, p_codigo: codigo })) || [];
  },

  /** Escreve uma mensagem. "Aguardando usuário" volta para "em atendimento"; "resolvido" é reaberto. */
  async responder(tipo, id, codigo, texto) {
    return window.Suporte.dados.rpc('ti_responder_chamado', { p_tipo: tipo, p_id: id, p_codigo: codigo, p_texto: texto });
  }
};

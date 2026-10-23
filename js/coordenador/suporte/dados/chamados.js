// Consultas usadas pelas telas comuns de lista e detalhe do Suporte.
window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

window.Suporte.dados.chamados = {
  async abrir(tipo, id, dadosChamado) {
    if (!id) throw new Error('Não foi possível identificar o coordenador da sessão.');
    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: tipo,
      p_id: String(id),
      p_titulo: dadosChamado.titulo, 
      p_descricao: dadosChamado.descricao, 
      p_categoria: dadosChamado.categoria,
      p_local: dadosChamado.local_texto || dadosChamado.local || null,
      p_patrimonio: dadosChamado.patrimonio || null, 
      p_contexto: dadosChamado.contexto || {}
    });
  },

  async listar(tipo, id) {
    if (!id) throw new Error('Não foi possível identificar o coordenador da sessão.');
    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { 
      p_tipo: tipo, 
      p_id: String(id)
    })) || [];
  },

  async ver(tipo, id, chamadoIdOuCodigo) {
    if (!id) throw new Error('Não foi possível identificar o coordenador da sessão.');
    return window.Suporte.dados.rpc('ti_ver_chamado', { 
      p_tipo: tipo, 
      p_id: String(id)
      p_codigo: chamadoIdOuCodigo 
    });
  }
};

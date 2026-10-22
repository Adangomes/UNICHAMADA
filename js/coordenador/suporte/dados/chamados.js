window.SuporteCoordenador = window.SuporteCoordenador || {};
window.SuporteCoordenador.dados = window.SuporteCoordenador.dados || {};

window.SuporteCoordenador.dados.chamados = {
  async abrir(tipo, id, d) {
    // Valida se o ID é um UUID válido
    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!id || !ehUuid) {
      console.error('[UNICHAMADAS] Tentativa de abrir chamado com ID inválido:', id);
      throw new Error('ID do coordenador inválido. Verifique a sessão.');
    }

    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: 'coordenador',
      p_id: id,
      p_titulo: d.titulo, 
      p_descricao: d.descricao, 
      p_categoria: d.categoria,
      p_local: d.local_texto || d.local || null, 
      p_patrimonio: d.patrimonio || null, 
      p_contexto: d.contexto || {}
    });
  },

  async listar(tipo, id) {
    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!id || !ehUuid) {
      // Retorna vazio silenciosamente se o ID ainda não for um UUID válido, evitando o Erro 400
      return [];
    }

    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { p_tipo: 'coordenador', p_id: id })) || [];
  },

  async ver(tipo, id, codigo) {
    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!id || !ehUuid) return null;

    return window.Suporte.dados.rpc('ti_ver_chamado', { p_tipo: 'coordenador', p_id: id, p_codigo: codigo });
  }
};

window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

window.Suporte.dados.chamados = {
  async abrir(tipo, id, d) {
    // Se for coordenador e vier um ID inválido/string, injeta o UUID correto do banco
    const uuidReal = (tipo === 'coordenador') ? 'ba48d258-b46f-4bc6-9ae0-5daaa396' : id;

    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: tipo,
      p_id: uuidReal,
      p_titulo: d.titulo, 
      p_descricao: d.descricao, 
      p_categoria: d.categoria,
      p_local: d.local_texto || d.local || null, 
      p_patrimonio: d.patrimonio || null, 
      p_contexto: d.contexto || {}
    });
  },

  async listar(tipo, id) {
    // Se for coordenador, força o UUID correto do banco para evitar o erro 42P02
    const uuidReal = (tipo === 'coordenador') ? 'ba48d258-b46f-4bc6-9ae0-5daaa396' : id;

    const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuidReal);
    if (!uuidReal || !ehUuid) {
      console.warn('[UNICHAMADAS] ID inválido na listagem:', uuidReal);
      return [];
    }

    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { 
      p_tipo: tipo, 
      p_id: uuidReal 
    })) || [];
  },

  async ver(tipo, id, codigo) {
    const uuidReal = (tipo === 'coordenador') ? 'ba48d258-b46f-4bc6-9ae0-5daaa396' : id;
    return window.Suporte.dados.rpc('ti_ver_chamado', { 
      p_tipo: tipo, 
      p_id: uuidReal, 
      p_codigo: codigo 
    });
  }
};

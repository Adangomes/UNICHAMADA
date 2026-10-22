window.SuporteCoordenador = window.SuporteCoordenador || {};
window.SuporteCoordenador.dados = window.SuporteCoordenador.dados || {};

window.SuporteCoordenador.dados.chamados = {
  async abrir(tipo, id, d) {
    if (!id) throw new Error('ID do solicitante não informado.');
    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: 'coordenador', // Força o tipo correto
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
    if (!id) return [];
    // Força 'coordenador' para evitar que chame o endpoint do professor
    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { p_tipo: 'coordenador', p_id: id })) || [];
  },

  async ver(tipo, id, codigo) {
    if (!id) return null;
    return window.Suporte.dados.rpc('ti_ver_chamado', { p_tipo: 'coordenador', p_id: id, p_codigo: codigo });
  }
};

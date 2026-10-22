window.SuporteCoordenador = window.SuporteCoordenador || {};
window.SuporteCoordenador.dados = window.SuporteCoordenador.dados || {};

window.SuporteCoordenador.dados.chamados = {
  async abrir(tipo, id, d) {
    const uuidCoordenadorBanco = 'ba48d258-b46f-4bc6-9ae0-5daaa396';
    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: 'coordenador',
      p_id: uuidCoordenadorBanco,
      p_titulo: d.titulo, 
      p_descricao: d.descricao, 
      p_categoria: d.categoria,
      p_local: d.local_texto || d.local || null, 
      p_patrimonio: d.patrimonio || null, 
      p_contexto: d.contexto || {}
    });
  },

  async listar(tipo, id) {
    const uuidCoordenadorBanco = 'ba48d258-b46f-4bc6-9ae0-5daaa396';
    // Força o tipo 'coordenador' e o UUID correto para nunca chamar o fluxo de professor
    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { 
      p_tipo: 'coordenador', 
      p_id: uuidCoordenadorBanco 
    })) || [];
  },

  async ver(tipo, id, codigo) {
    const uuidCoordenadorBanco = 'ba48d258-b46f-4bc6-9ae0-5daaa396';
    return window.Suporte.dados.rpc('ti_ver_chamado', { 
      p_tipo: 'coordenador', 
      p_id: uuidCoordenadorBanco, 
      p_codigo: codigo 
    });
  }
};

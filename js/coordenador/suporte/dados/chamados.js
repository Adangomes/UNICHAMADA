// Configurações de Suporte para coordenadores
window.SuporteCoordenador = window.SuporteCoordenador || {};
window.SuporteCoordenador.dados = window.SuporteCoordenador.dados || {};

window.SuporteCoordenador.dados.chamados = {
  async abrir(tipo, id, dadosChamado) {
    const uuidCoordenadorBanco = 'ba48d258-b46f-4bc6-9ae0-5daaa396';
    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: tipo,
      p_id: uuidCoordenadorBanco,
      p_titulo: dadosChamado.titulo, 
      p_descricao: dadosChamado.descricao, 
      p_categoria: dadosChamado.categoria,
      p_local: dadosChamado.local_texto || d.local || null, 
      p_patrimonio: dadosChamado.patrimonio || null, 
      p_contexto: dadosChamado.contexto || {}
    });
  },

  async listar(tipo, id) {
    const uuidCoordenadorBanco = 'ba48d258-b46f-4bc6-9ae0-5daaa396';
    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { 
      p_tipo: tipo, 
      p_id: uuidCoordenadorBanco 
    })) || [];
  },

  async ver(tipo, id, chamadoIdOuCodigo) {
    const uuidCoordenadorBanco = 'ba48d258-b46f-4bc6-9ae0-5daaa396';
    return window.Suporte.dados.rpc('ti_ver_chamado', { 
      p_tipo: tipo, 
      p_id: uuidCoordenadorBanco, 
      p_codigo: chamadoIdOuCodigo 
    });
  }
};

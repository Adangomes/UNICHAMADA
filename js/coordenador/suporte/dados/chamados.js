// Configurações de Suporte para professores
window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

window.Suporte.dados.chamados = {
  /** Abre um chamado e devolve o código (ex.: "CH-0012"). */
  async abrir(tipo, id, d) {
    if (!window.UsuarioLogado) {
      console.error('Usuário não autenticado');
      return null;
    }

    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: tipo, p_id: id,
      p_titulo: d.titulo, p_descricao: d.descricao, p_categoria: d.categoria,
      p_local: d.local || null, p_patrimonio: d.patrimonio || null, p_contexto: d.contexto || {}
    });
  },

  /** Os chamados da pessoa, do mais recente para o mais antigo. */
  async listar(tipo, id) {
    if (!window.UsuarioLogado) {
      console.error('Usuário não autenticado');
      return [];
    }

    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { p_tipo: tipo, p_id: id })) || [];
  },

  /** Um chamado da pessoa (ou null se não for dela). */
  async ver(tipo, id, codigo) {
    if (!window.UsuarioLogado) {
      console.error('Usuário não autenticado');
      return null;
    }

    return window.Suporte.dados.rpc('ti_ver_chamado', { p_tipo: tipo, p_id: id, p_codigo: codigo });
  }
};

// Configurações de Suporte para coordenadores
window.SuporteCoordenador = window.SuporteCoordenador || {};
window.SuporteCoordenador.dados = window.SuporteCoordenador.dados || {};

window.SuporteCoordenador.dados.chamados = {
  /** Abre um chamado e devolve o código (ex.: "CH-0012"). */
  async abrir(tipo, id, d) {
    if (!window.UsuarioLogado) {
      console.error('Usuário não autenticado');
      return null;
    }

    return window.Suporte.dados.rpc('ti_abrir_chamado', {
      p_tipo: tipo, p_id: id,
      p_titulo: d.titulo, p_descricao: d.descricao, p_categoria: d.categoria,
      p_local: d.local || null, p_patrimonio: d.patrimonio || null, p_contexto: d.contexto || {}
    });
  },

  /** Os chamados da pessoa, do mais recente para o mais antigo. */
  async listar(tipo, id) {
    if (!window.UsuarioLogado) {
      console.error('Usuário não autenticado');
      return [];
    }

    return (await window.Suporte.dados.rpc('ti_listar_meus_chamados', { p_tipo: tipo, p_id: id })) || [];
  },

  /** Um chamado da pessoa (ou null se não for dela). */
  async ver(tipo, id, codigo) {
    if (!window.UsuarioLogado) {
      console.error('Usuário não autenticado');
      return null;
    }

    return window.Suporte.dados.rpc('ti_ver_chamado', { p_tipo: tipo, p_id: id, p_codigo: codigo });
  }
};

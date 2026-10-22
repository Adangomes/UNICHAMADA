window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

window.Suporte.dados.chamados = {
  async listar(tipo, id) {
    const supabase = window.supabaseClient || window.supabase;
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('ti_chamados')
      .select('*')
      .eq('solicitante_tipo', 'professor')
      .eq('solicitante_id', id)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('[UNICHAMADAS] Erro ao listar chamados:', error);
      return [];
    }
    return data || [];
  },

  async ver(tipo, id, chamadoId) {
    const supabase = window.supabaseClient || window.supabase;
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('ti_chamados')
      .select('*')
      .eq('id', chamadoId)
      .maybeSingle();

    if (error) {
      console.error('[UNICHAMADAS] Erro ao buscar detalhe do chamado:', error);
      return null;
    }
    return data;
  },

  async abrir(tipo, id, dadosChamado) {
    const supabase = window.supabaseClient || window.supabase;
    if (!supabase) throw new Error('Supabase não inicializado.');

    const payload = {
      titulo: dadosChamado.titulo,
      descricao: dadosChamado.descricao,
      grupo_destino: dadosChamado.grupo_destino,
      categoria: dadosChamado.categoria,
      local_texto: dadosChamado.local_texto || null,
      patrimonio: dadosChamado.patrimonio || null,
      solicitante_tipo: 'professor',
      solicitante_id: id,
      solicitante_nome: window.UsuarioLogado?.nome || 'Professor',
      status: 'aberto',
      prioridade: 'media',
      contexto: dadosChamado.contexto || {}
    };

    const { data, error } = await supabase
      .from('ti_chamados')
      .insert([payload])
      .select('codigo, numero')
      .single();

    if (error) {
      console.error('[UNICHAMADAS] Erro ao inserir chamado:', error);
      throw error;
    }

    return data.codigo || `CH-${data.numero}`;
  }
};

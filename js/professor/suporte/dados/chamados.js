window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

window.Suporte.dados.chamados = {
  async listar(tipo, id) {
    const supabase = window.supabaseClient || window.supabase;
    if (!supabase) return [];

    // Busca chamados abertos pelo professor logado
    const { data, error } = await supabase
      .from('ti_chamados')
      .select('*')
      .eq('solicitante_tipo', 'professor')
      .eq('solicitante_id', id)
      .order('criado_em', { ascending: false });

    if (error) {
      console.error('[UNICHAMADA] Erro ao listar chamados do professor:', error);
      return [];
    }
    return data || [];
  },

  async abrir(tipo, id, dadosChamado) {
    const supabase = window.supabaseClient || window.supabase;
    if (!supabase) throw new Error('Supabase não inicializado.');

    // Insere rigorosamente dentro do schema da tabela ti_chamados
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
      console.error('[UNICHAMADA] Erro ao inserir chamado:', error);
      throw error;
    }

    return data.codigo || `CH-${data.numero}`;
  }
};

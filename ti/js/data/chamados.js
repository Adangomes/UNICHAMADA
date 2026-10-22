/** chamados.js — tabela ti_chamados */
window.TI = window.TI || {};

TI.dados.chamados = {
  async listar() {
    // Tenta usar a RPC do banco ou faz a listagem direta com segurança
    try {
      const resp = await TI.db.rpc('listar_chamados');
      if (!resp.error) return TI.dados.tratar(resp) || [];
    } catch (e) {
      // Fallback para select direto caso a RPC não exista
    }

    const resp = await TI.db.from('ti_chamados').select('*').order('criado_em', { ascending: false });
    return TI.dados.tratar(resp) || [];
  },

  async buscar(id) {
    const resp = await TI.db.from('ti_chamados').select('*').eq('id', id).maybeSingle();
    return TI.dados.tratar(resp);
  },

  /** Cria um chamado. O prazo (SLA) é calculado com base na prioridade. */
  async criar(dados) {
    const horas = (TI.K && TI.K.slaHoras && TI.K.slaHoras[dados.prioridade || 'media']) || 24;
    
    const corpo = Object.assign({ 
      status: 'aberto', 
      prioridade: dados.prioridade || 'media',
      prazo_em: new Date(Date.now() + horas * 3600000).toISOString() 
    }, dados);

    const resp = await TI.db.from('ti_chamados').insert([corpo]).select().single();
    
    if (resp.error) {
      console.error('[TI] Erro ao criar chamado:', resp.error);
      throw resp.error;
    }

    return TI.dados.tratar(resp);
  },

  async atualizar(id, campos) {
    const resp = await TI.db.from('ti_chamados').update(campos).eq('id', id).select().single();
    
    if (resp.error) {
      console.error('[TI] Erro ao atualizar chamado:', resp.error);
      throw resp.error;
    }

    return TI.dados.tratar(resp);
  }
};

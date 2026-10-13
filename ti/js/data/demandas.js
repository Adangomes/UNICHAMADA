/** demandas.js — tabela ti_demandas */
window.TI = window.TI || {};
window.TI.dados = window.TI.dados || {};

TI.dados.demandas = {
  async listar() {
    const resp = await TI.db.rpc('listar_demandas');
    const d = TI.dados.tratar(resp);
    return d || [];
  },
  async buscar(id) {
    const resp = await TI.db.rpc('buscar_demanda_por_id', { demanda_id: id });
    const d = TI.dados.tratar(resp);
    return Array.isArray(d) ? d[0] || null : d;
  },
  async criar(dados) {
    const f = TI.sessao.funcionario;
    const resp = await TI.db.rpc('criar_demanda', {
      p_titulo: dados.titulo,
      p_descricao: dados.descricao || null,
      p_area: dados.area || null,
      p_prioridade: dados.prioridade || 'media',
      p_grupo_destino: dados.grupo_destino,
      p_solicitante_id: f.id,
      p_solicitante_nome: f.nome
    });
    const d = TI.dados.tratar(resp);
    return Array.isArray(d) ? d[0] : d;
  },
  async atualizar(id, campos) {
    const resp = await TI.db.from('ti_demandas').update(campos).eq('id', id).select().single();
    return TI.dados.tratar(resp);
  }
};

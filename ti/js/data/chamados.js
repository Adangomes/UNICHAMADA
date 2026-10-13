/** demandas.js — tabela ti_demandas */
window.TI = window.TI || {};

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
    const corpo = Object.assign({
      status: 'backlog', solicitante_tipo: 'ti', solicitante_id: f.id, solicitante_nome: f.nome
    }, dados);
    const resp = await TI.db.from('ti_demandas').insert([corpo]).select().single();
    return TI.dados.tratar(resp);
  },
  async atualizar(id, campos) {
    const resp = await TI.db.from('ti_demandas').update(campos).eq('id', id).select().single();
    return TI.dados.tratar(resp);
  }
};

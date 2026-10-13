/** demandas.js — tabela ti_demandas */
window.TI = window.TI || {};

TI.dados.demandas = {
  async listar() {
    const resp = await TI.db.rpc('listar_demandas');
    const d = TI.dados.tratar(resp);
    return d || [];
  },
  async buscar(id) {
    return TI.dados.tratar(await TI.db.from('ti_demandas').select('*').eq('id', id).maybeSingle());
  },
  async criar(dados) {
    const f = TI.sessao.funcionario;
    const corpo = Object.assign({
      status: 'backlog', solicitante_tipo: 'ti', solicitante_id: f.id, solicitante_nome: f.nome
    }, dados);
    return TI.dados.tratar(await TI.db.from('ti_demandas').insert(corpo).select().single());
  },
  async atualizar(id, campos) {
    return TI.dados.tratar(await TI.db.from('ti_demandas').update(campos).eq('id', id).select().single());
  }
};

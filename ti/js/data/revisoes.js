/** revisoes.js — tabela ti_revisoes */
window.TI = window.TI || {};

TI.dados.revisoes = {
  async listarDaDemanda(demandaId) {
    const resp = await TI.db.rpc('listar_revisoes', { dem_id: demandaId });
    const d = TI.dados.tratar(resp);
    return d || [];
  },
  async criar({ demanda_id, decisao, checklist, comentario }) {
    const f = TI.sessao.funcionario;
    const resp = await TI.db.from('ti_revisoes').insert({
      demanda_id, 
      decisao, 
      checklist: checklist || [], 
      comentario: comentario || null, 
      revisor_id: f.id
    }).select().single();
    return TI.dados.tratar(resp);
  }
};

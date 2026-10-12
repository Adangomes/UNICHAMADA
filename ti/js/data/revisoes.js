/** revisoes.js — tabela ti_revisoes */
window.TI = window.TI || {};

TI.dados.revisoes = {
  async listarDaDemanda(demandaId) {
    const d = TI.dados.tratar(await TI.db.from('ti_revisoes').select('*').eq('demanda_id', demandaId).order('criado_em', { ascending: false }));
    return d || [];
  },
  async criar({ demanda_id, decisao, checklist, comentario }) {
    const f = TI.sessao.funcionario;
    return TI.dados.tratar(await TI.db.from('ti_revisoes').insert({
      demanda_id, decisao, checklist: checklist || [], comentario: comentario || null, revisor_id: f.id
    }).select().single());
  }
};

/** chamados.js — tabela ti_chamados */
window.TI = window.TI || {};

TI.dados.chamados = {
  async listar() {
    const resp = await TI.db.rpc('listar_chamados');
    const d = TI.dados.tratar(resp);
    return d || [];
  },
  async buscar(id) {
    return TI.dados.tratar(await TI.db.from('ti_chamados').select('*').eq('id', id).maybeSingle());
  },
  /** Cria um chamado (ex.: o TI abrindo em nome de alguém). O prazo (SLA) sai da prioridade. */
  async criar(dados) {
    const horas = TI.K.slaHoras[dados.prioridade || 'media'];
    const corpo = Object.assign({ status: 'aberto', prazo_em: new Date(Date.now() + horas * 3600000).toISOString() }, dados);
    return TI.dados.tratar(await TI.db.from('ti_chamados').insert(corpo).select().single());
  },
  async atualizar(id, campos) {
    return TI.dados.tratar(await TI.db.from('ti_chamados').update(campos).eq('id', id).select().single());
  }
};

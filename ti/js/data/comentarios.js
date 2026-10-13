/** comentarios.js — tabela ti_chamados_comentarios */
window.TI = window.TI || {};

TI.dados.comentarios = {
  async listarDoChamado(chamadoId) {
    const d = TI.dados.tratar(await TI.db.from('ti_chamados_comentarios').select('*').eq('chamado_id', chamadoId).order('criado_em', { ascending: true }));
    return d || [];
  },
  /** Comentário escrito pelo TI. "interno = true" é a nota que o solicitante não vê. */
  async criar({ chamado_id, texto, interno }) {
    const f = TI.sessao.funcionario;
    return TI.dados.tratar(await TI.db.from('ti_chamados_comentarios').insert({
      chamado_id, texto, interno: !!interno,
      autor_tipo: 'ti', autor_id: f.id, autor_nome: f.nome
    }).select().single());
  }
};

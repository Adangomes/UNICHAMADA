/** auditoria.js — tabela ti_auditoria */
window.TI = window.TI || {};

TI.dados.auditoria = {
  async listar(limite) {
    const d = TI.dados.tratar(await TI.db.from('ti_auditoria').select('*').order('criado_em', { ascending: false }).limit(limite || 100));
    return d || [];
  },
  /** Registra "quem fez o quê". Se falhar, não atrapalha a ação principal. */
  async registrar(acao, alvoTipo, alvoId, detalhes) {
    try {
      const f = TI.sessao.funcionario;
      await TI.db.from('ti_auditoria').insert({
        funcionario_id: f.id, acao, alvo_tipo: alvoTipo || null, alvo_id: alvoId || null, detalhes: detalhes || {}
      });
    } catch (e) { console.warn('[TI] auditoria não registrada:', e); }
  }
};

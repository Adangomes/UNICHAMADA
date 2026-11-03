/** ponto.js — consultas e ajustes de jornada da equipe. */
window.TI = window.TI || {};
TI.dados = TI.dados || {};

TI.dados.ponto = {
  async listar(inicio, fim, funcionarioId, semCache = false) {
    const usuarioId = TI.sessao.funcionario && TI.sessao.funcionario.id;
    const chave = `ponto_${usuarioId}_${inicio}_${fim}_${funcionarioId || 'todos'}`;
    const cache = window.UNICHAMADA_CACHE;
    const salvo = !semCache && cache && cache.get(chave);
    if (salvo) return salvo;

    let consulta = TI.db
      .from('ti_ponto_trabalho')
      .select('id, funcionario_id, data_local, tipo, registrado_em, origem, justificativa')
      .gte('data_local', inicio)
      .lte('data_local', fim)
      .order('registrado_em', { ascending: true });

    if (funcionarioId) consulta = consulta.eq('funcionario_id', funcionarioId);
    const registros = TI.dados.tratar(await consulta);
    if (cache) cache.set(chave, registros, 30, false);
    return registros || [];
  },

  async ajustar(dados) {
    const resposta = await TI.db.rpc('ti_ponto_registrar_ajuste', {
      p_id_funcionarios: dados.idFuncionarios,
      p_data_local: dados.data,
      p_tipo: dados.tipo,
      p_horario_local: `${dados.data} ${dados.horario}:00`,
      p_motivo: dados.motivo
    });
    const registro = TI.dados.tratar(resposta);
    this.limparCache();
    return registro;
  },

  limparCache() {
    const usuarioId = TI.sessao.funcionario && TI.sessao.funcionario.id;
    const cache = window.UNICHAMADA_CACHE;
    if (!cache || !usuarioId) return;
    const prefixo = `ponto_${usuarioId}_`;
    for (const chave of cache.store.keys()) {
      if (chave.startsWith(prefixo)) cache.store.delete(chave);
    }
  }
};

/** funcionarios.js — tabela ti_funcionarios */
window.TI = window.TI || {};

TI.dados.funcionarios = {
  async listar() {
    const resp = await TI.db.rpc('listar_funcionarios');
    const d = TI.dados.tratar(resp);
    return d || [];
  },
  async buscarPorAuth(authUserId) {
    return TI.dados.tratar(await TI.db.from('ti_funcionarios').select('*').eq('auth_user_id', authUserId).maybeSingle());
  },
  async atualizar(id, campos) {
    return TI.dados.tratar(await TI.db.from('ti_funcionarios').update(campos).eq('id', id).select().single());
  },
  /**
   * Cadastro de funcionário novo diretamente na tabela ti_funcionarios.
   */
  async criar(dados) {
    const resp = await TI.db.from('ti_funcionarios').insert([dados]).select().single();
    return TI.dados.tratar(resp);
  }
};

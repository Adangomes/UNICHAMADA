/** funcionarios.js — tabela ti_funcionarios */
window.TI = window.TI || {};

TI.dados.funcionarios = {
  async listar() {
    const resp = await TI.db.rpc('listar_funcionarios');
    const d = TI.dados.tratar(resp);
    return d || [];
  },
  async buscarSessao() {
    const funcionarios = TI.dados.tratar(await TI.db.rpc('ti_meu_funcionario'));
    return funcionarios && funcionarios.length ? funcionarios[0] : null;
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

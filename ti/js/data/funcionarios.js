/** funcionarios.js — tabela ti_funcionarios */
window.TI = window.TI || {};

TI.dados.funcionarios = {
  async listar() {
    const d = TI.dados.tratar(await TI.db.from('ti_funcionarios').select('*').order('nome', { ascending: true }));
    return d || [];
  },
  async buscarPorAuth(authUserId) {
    return TI.dados.tratar(await TI.db.from('ti_funcionarios').select('*').eq('auth_user_id', authUserId).maybeSingle());
  },
  async atualizar(id, campos) {
    return TI.dados.tratar(await TI.db.from('ti_funcionarios').update(campos).eq('id', id).select().single());
  },
  /**
   * Cadastro de funcionário novo. A conta (Supabase Auth) só pode ser criada com a chave de
   * administrador, que fica no n8n. Veja docs/n8n-criar-funcionario.md.
   */
  async criarViaN8n(dados) {
    const url = TI.config.n8nCriarFuncionarioUrl;
    if (String(url).indexOf('COLE_AQUI') === 0) {
      throw new Error('O fluxo do n8n ainda não foi configurado (js/config/supabase-config.js).');
    }
    const sessao = TI.dados.tratar(await TI.db.auth.getSession());
    const token = sessao && sessao.session ? sessao.session.access_token : null;
    if (!token) throw new Error('Sua sessão expirou. Entre novamente.');
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: token, nome: dados.nome, ra: dados.ra, email: dados.email, setor: dados.setor })
    });
    let corpo = {};
    try { corpo = await resp.json(); } catch (e) { /* resposta sem JSON */ }
    if (!resp.ok) throw new Error(corpo.mensagem || ('O n8n recusou o cadastro (HTTP ' + resp.status + ').'));
    return corpo;
  }
};

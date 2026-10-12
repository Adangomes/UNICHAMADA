/**
 * sessao.js — quem está logado (e-mail + senha pelo Supabase Auth) e qual é o seu papel/setor.
 */
window.TI = window.TI || {};

TI.sessao = {
  funcionario: null,

  /** Há alguém logado? Carrega o cadastro em ti_funcionarios. */
  async iniciar() {
    const { session } = TI.dados.tratar(await TI.db.auth.getSession());
    if (!session) return false;
    return this._carregar(session.user);
  },

  async _carregar(user) {
    const f = await TI.dados.funcionarios.buscarPorAuth(user.id);
    if (!f || !f.ativo) {
      await TI.db.auth.signOut();
      this.funcionario = null;
      throw new Error('Esta conta não tem acesso ao painel de TI.');
    }
    this.funcionario = f;
    return true;
  },

  async entrar(email, senha) {
    const { data, error } = await TI.db.auth.signInWithPassword({ email: String(email).trim(), password: senha });
    if (error) throw new Error('E-mail ou senha incorretos.');
    return this._carregar(data.user);
  },

  async sair() {
    await TI.db.auth.signOut();
    this.funcionario = null;
  },

  /** Envia o e-mail "esqueci minha senha". */
  async enviarRedefinicao(email) {
    const { error } = await TI.db.auth.resetPasswordForEmail(String(email).trim(), {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) throw new Error('Não foi possível enviar o e-mail agora.');
  },

  async definirSenha(nova) {
    const { error } = await TI.db.auth.updateUser({ password: nova });
    if (error) throw new Error(error.message);
  }
};

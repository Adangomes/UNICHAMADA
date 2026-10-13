/**
 * sessao.js — quem está logado (e-mail + senha pelo Supabase Auth) e qual é o seu papel/setor.
 */
window.TI = window.TI || {};

TI.sessao = {
  funcionario: null,

  /** Tenta carregar do localStorage imediatamente e valida com o Supabase Auth */
  async iniciar() {
    // 1. Tenta restaurar do cache local para resposta instantânea na UI
    const salvo = localStorage.getItem('unichamada_ti_user');
    if (salvo) {
      try {
        this.funcionario = JSON.parse(salvo);
      } catch (e) {
        localStorage.removeItem('unichamada_ti_user');
      }
    }

    // 2. Revalida a sessão real com o Supabase Auth em background
    try {
      const resp = await TI.db.auth.getSession();
      const session = TI.dados.tratar(resp)?.session || (resp && resp.data ? resp.data.session : null);
      
      if (!session) {
        this.sairLocal();
        return false;
      }
      return await this._carregar(session.user);
    } catch (err) {
      if (!this.funcionario) return false;
      return true;
    }
  },

  async _carregar(user) {
    const f = await TI.dados.funcionarios.buscarPorAuth(user.id);
    if (!f || !f.ativo) {
      await this.sair();
      throw new Error('Esta conta não tem acesso ao painel de TI.');
    }
    this.funcionario = f;
    // Grava no cache local para persistir no F5
    localStorage.setItem('unichamada_ti_user', JSON.stringify(f));
    return true;
  },

  async entrar(email, senha) {
    const { data, error } = await TI.db.auth.signInWithPassword({ email: String(email).trim(), password: senha });
    if (error) throw new Error('E-mail ou senha incorretos.');
    return await this._carregar(data.user);
  },

  sairLocal() {
    this.funcionario = null;
    localStorage.removeItem('unichamada_ti_user');
  },

  async sair() {
    try {
      await TI.db.auth.signOut();
    } catch (e) {}
    this.sairLocal();
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

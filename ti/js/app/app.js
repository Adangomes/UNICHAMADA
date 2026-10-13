/**
 * app.js — PONTO DE ENTRADA. Deve ser o ÚLTIMO script do index.html.
 * Decide: link de convite? mostra "primeiro acesso". Há sessão? mostra o painel. Senão, o login.
 */
window.TI = window.TI || {};

TI.app = {
  raiz: null,
  layout: null,

  async iniciar() {
    const { el } = TI.dom;
    TI.estilos.base();
    this.raiz = el('div', { id: 'ti-raiz' });
    document.body.append(this.raiz);

    if (TI.dbErro) { this.raiz.append(TI.ui.erro(TI.dbErro)); return; }

    try {
      const veioDeConvite = /type=(invite|recovery)/.test(TI.config.hashInicial);
      if (veioDeConvite) {
        // o Supabase transforma o link do e-mail em sessão; esperamos isso terminar
        await TI.db.auth.getSession();
        await TI.estilos.carregar(TI.estilos.GRUPOS.login);
        TI.telas.primeiroAcesso.render(this.raiz, { aoConcluir: () => this._depoisDoConvite() });
        return;
      }
      if (await TI.sessao.iniciar()) await this.mostrarPainel();
      else await this.mostrarLogin();
    } catch (err) {
      await this.mostrarLogin(err.message);
    }
  },

  async _depoisDoConvite() {
    history.replaceState(null, '', window.location.pathname);   // tira o "#..." da barra de endereço
    await TI.sessao.iniciar();
    await this.mostrarPainel();
  },

  async mostrarLogin(mensagem) {
    this.layout = null;
    await TI.estilos.carregar(TI.estilos.GRUPOS.login);
    TI.telas.login.render(this.raiz, { mensagem, aoEntrar: () => this.mostrarPainel() });
  },

  async mostrarPainel() {
    const f = TI.sessao.funcionario;
    await TI.estilos.carregar(TI.estilos.GRUPOS.layout);
    const ctx = {
      f,
      navegar: (rota, params) => this.navegar(rota, params),
      sair: async () => { await TI.sessao.sair(); this.mostrarLogin(); }
    };
    this.ctx = ctx;
    this.layout = TI.layout.montar(this.raiz, ctx);
    await this.navegar(TI.rotas.padrao(f));
  },

  async navegar(rota, params) {
    const f = TI.sessao.funcionario;
    const def = TI.rotas.tabela[rota];
    if (!def || !TI.rotas.permitida(rota, f)) { rota = TI.rotas.padrao(f); params = {}; }
    const alvo = TI.rotas.tabela[rota];
    const tela = TI.telas[alvo.tela];
    const conteudo = this.layout.conteudo;
    this.layout.marcarAtivo(alvo.menu);
    conteudo.replaceChildren(TI.ui.carregando());
    window.scrollTo(0, 0);
    try {
      await TI.estilos.carregar(alvo.css);   // só o CSS da seção desta tela
      conteudo.replaceChildren();
      await tela.render(conteudo, this.ctx, params || {});
    } catch (err) {
      console.error('[TI] erro na tela', rota, err);
      conteudo.replaceChildren(TI.ui.erro('Não foi possível abrir esta tela: ' + err.message));
    }
  }
};

TI.app.iniciar();

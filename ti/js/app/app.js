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
      const veioDeConvite = /type=(invite|recovery)/.test(TI.config.hashInicial || window.location.hash);
      if (veioDeConvite) {
        await TI.db.auth.getSession();
        await TI.estilos.carregar(TI.estilos.GRUPOS.login);
        TI.telas.primeiroAcesso.render(this.raiz, { aoConcluir: () => this._depoisDoConvite() });
        return;
      }

      // Tenta iniciar sessão (lê cache local instantâneo + valida Supabase)
      const logado = await TI.sessao.iniciar();
      if (logado) {
        await this.mostrarPainel();
      } else {
        await this.mostrarLogin();
      }
    } catch (err) {
      console.warn('[TI] Erro ao restaurar sessão:', err);
      // Se houver funcionário em memória (cache local), não desloga abruptamente no F5
      if (TI.sessao.funcionario) {
        await this.mostrarPainel();
      } else {
        await this.mostrarLogin('Sessão expirada. Faça login novamente.');
      }
    }
  },

  async _depoisDoConvite() {
    history.replaceState(null, '', window.location.pathname);
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

    // Pega a rota da Hash da URL se existir, senão usa a padrão do funcionário
    const hashRota = window.location.hash.replace('#', '').trim();
    const rotaInicial = (hashRota && TI.rotas.permitida(hashRota, f)) ? hashRota : TI.rotas.padrao(f);

    await this.navegar(rotaInicial);
  },

  async navegar(rota, params) {
    const f = TI.sessao.funcionario;
    if (!f) return this.mostrarLogin();

    const def = TI.rotas.tabela[rota];
    if (!def || !TI.rotas.permitida(rota, f)) { 
      rota = TI.rotas.padrao(f); 
      params = {}; 
    }

    // Atualiza a Hash na URL para o F5 não perder a tela
    window.location.hash = rota;

    const alvo = TI.rotas.tabela[rota];
    const tela = TI.telas[alvo.tela];
    const conteudo = this.layout.conteudo;
    this.layout.marcarAtivo(alvo.menu);
    conteudo.replaceChildren(TI.ui.carregando());
    window.scrollTo(0, 0);
    try {
      await TI.estilos.carregar(alvo.css);
      conteudo.replaceChildren();
      await tela.render(conteudo, this.ctx, params || {});
    } catch (err) {
      console.error('[TI] erro na tela', rota, err);
      conteudo.replaceChildren(TI.ui.erro('Não foi possível abrir esta tela: ' + err.message));
    }
  }
};

TI.app.iniciar();

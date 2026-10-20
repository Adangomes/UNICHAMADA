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
        await TI.db.auth.getSession();
        await TI.estilos.carregar(TI.estilos.GRUPOS.login);
        TI.telas.primeiroAcesso.render(this.raiz, { aoConcluir: () => this._depoisDoConvite() });
        return;
      }

      // Garante que o Supabase buscou a sessão armazenada no navegador
      await TI.db.auth.getSession();

      if (await TI.sessao.iniciar()) {
        await this.mostrarPainel();
      } else {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (await TI.sessao.iniciar()) {
          await this.mostrarPainel();
        } else {
          await this.mostrarLogin();
        }
      }
    } catch (err) {
      await this.mostrarLogin(err.message);
    }
  },

  async _depoisDoConvite() {
    history.replaceState(null, '', window.location.pathname);
    await TI.sessao.iniciar();
    await this.mostrarPainel();
  },

  async mostrarLogin(mensagem) {
    this.layout = null;
    sessionStorage.removeItem('ti_ultima_rota');
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
    
    // REGRA DE OURO RIGOROSA: Respeita estritamente a última rota salva no sessionStorage.
    // Só usa a padrão se não houver nenhuma rota salva anteriormente.
    const rotaSalva = sessionStorage.getItem('ti_ultima_rota');
    const rotaInicial = (rotaSalva && TI.rotas.tabela[rotaSalva] && TI.rotas.permitida(rotaSalva, f)) 
      ? rotaSalva 
      : TI.rotas.padrao(f);
    
    await this.navegar(rotaInicial);
  },

  async navegar(rota, params) {
    const f = TI.sessao.funcionario;
    const def = TI.rotas.tabela[rota];
    
    // Segurança de permissão: se a rota não existe ou não é permitida para este cargo, aí sim bloqueia e vai pra padrão
    if (!def || !TI.rotas.permitida(rota, f)) { 
      rota = TI.rotas.padrao(f); 
      params = {}; 
    }
    
    // Grava de forma imutável a rota atual no sessionStorage
    sessionStorage.setItem('ti_ultima_rota', rota);

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

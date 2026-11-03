window.UnichamadaAgendaUI = {
  desmontar: null,

  montar(container, perfil, cliente = window.supabaseClient) {
    this.desmontar?.();
    const raiz = document.createElement('div');
    raiz.className = 'unichamada-agenda-root';
    container.replaceChildren(raiz);
    const desmontar = window.UnichamadaAgenda.mount(raiz, perfil, cliente);
    this.desmontar = desmontar;
    return () => {
      desmontar();
      if (this.desmontar === desmontar) this.desmontar = null;
    };
  },

  parar() {
    this.desmontar?.();
    this.desmontar = null;
  }
};

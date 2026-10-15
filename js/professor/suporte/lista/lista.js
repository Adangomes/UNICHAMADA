/**
 * lista/lista.js — tela inicial da aba: "Meus chamados" + botão "Abrir chamado".
 * Dados: Suporte.dados.chamados.listar (tabela ti_chamados). Atualiza sozinha a cada 60 s.
 */
window.Suporte = window.Suporte || {};

window.Suporte.lista = {
  /**
   * @param {HTMLElement} raiz  onde a aba é desenhada
   * @param {Object} e          estado da aba (veja suporte.js): tipo, id, abrirNovo, abrirDetalhe, mostrarLista
   * @param {boolean} [silencioso]  true = atualiza sem piscar "Carregando…"
   */
  async render(raiz, e, silencioso) {
    const S = window.Suporte;
    const { el } = S;
    const T = S.T;
    clearInterval(raiz._suTimer);
    raiz.dataset.tela = 'lista';
    if (!silencioso) raiz.replaceChildren(S.carregando());

    let chamados;
    try { chamados = await S.dados.chamados.listar(e.tipo, e.id); }
    catch (err) { raiz.replaceChildren(S.erroBloco(err.message, () => S.lista.render(raiz, e))); return; }

    const categoria = (valor) => (T.categorias.find((c) => c.valor === valor) || {}).rotulo || valor;

    const linhas = chamados.map((c) => el('button', {
      class: 'su-linha', type: 'button', onClick: () => e.abrirDetalhe(c.codigo)
    }, [
      el('span', { class: 'su-codigo' }, [c.codigo]),
      el('span', { class: 'su-linha-texto' }, [
        el('span', { class: 'su-linha-titulo' }, [c.titulo]),
        el('span', { class: 'su-linha-sub' }, [categoria(c.categoria) + ' · aberto ' + S.util.idade(c.criado_em)])
      ]),
      el('span', { class: 'su-status su-status-' + c.status }, [T.status[c.status] || c.status]),
      el('span', { class: 'su-linha-quando' }, ['atualizado ' + S.util.idade(c.atualizado_em)])
    ]));

    raiz.replaceChildren(
      el('header', { class: 'su-cab' }, [
        el('div', {}, [el('h1', { class: 'su-titulo' }, [T.titulo]), el('p', { class: 'su-sub' }, [T.subtitulo])]),
        S.botao('Abrir chamado', { tipo: 'primario', onClick: () => e.abrirNovo() })
      ]),
      el('section', { class: 'su-cartao' }, [
        el('div', { class: 'su-cartao-cab' }, [el('h2', {}, ['Meus chamados']), el('span', { class: 'su-sub' }, [chamados.length + ' no total'])]),
        ...(linhas.length ? linhas : [el('div', { class: 'su-vazio' }, [T.vazio])])
      ])
    );

    // atualiza sozinha enquanto a lista estiver na tela
    raiz._suTimer = setInterval(() => {
      if (!raiz.isConnected || raiz.dataset.tela !== 'lista') { clearInterval(raiz._suTimer); return; }
      S.lista.render(raiz, e, true);
    }, 60000);
  }
};

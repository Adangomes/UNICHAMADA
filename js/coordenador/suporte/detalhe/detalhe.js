/**
 * detalhe/detalhe.js — um chamado: carrega os dados e monta a página com os blocos
 * conversa.js (a conversa) e resposta.js (a caixa de mensagem). Atualiza sozinho a cada 30 s
 * (a menos que a pessoa esteja escrevendo).
 * Dados: Suporte.dados.chamados.ver (ti_chamados) e Suporte.dados.comentarios.listar (ti_chamados_comentarios).
 */
window.Suporte = window.Suporte || {};

window.Suporte.detalhe = {
  /**
   * @param {HTMLElement} raiz  @param {Object} e  estado da aba  @param {string} codigo  ex.: "CH-0012"
   * @param {boolean} [silencioso]  true = atualiza sem piscar "Carregando…"
   */
  async render(raiz, e, codigo, silencioso) {
    const S = window.Suporte;
    const { el } = S;
    const T = S.T;
    clearInterval(raiz._suTimer);
    raiz.dataset.tela = 'detalhe';
    raiz.dataset.codigo = codigo;
    if (!silencioso) raiz.replaceChildren(S.carregando());

    const voltar = el('button', { class: 'su-voltar', type: 'button', onClick: () => e.mostrarLista() }, ['← Meus chamados']);
    let chamado, comentarios;
    try {
      [chamado, comentarios] = await Promise.all([
        S.dados.chamados.ver(e.tipo, e.id, codigo),
        S.dados.comentarios.listar(e.tipo, e.id, codigo)
      ]);
    } catch (err) { raiz.replaceChildren(el('div', {}, [voltar]), S.erroBloco(err.message, () => S.detalhe.render(raiz, e, codigo))); return; }

    if (!chamado) {
      raiz.replaceChildren(el('div', {}, [voltar]), el('div', { class: 'su-vazio' }, ['Chamado não encontrado.']));
      return;
    }

    const categoria = (T.categorias.find((c) => c.valor === chamado.categoria) || {}).rotulo || chamado.categoria;
    const onde = [chamado.local, chamado.patrimonio ? 'patrimônio ' + chamado.patrimonio : ''].filter(Boolean).join(' · ');
    const recarregar = () => S.detalhe.render(raiz, e, codigo);

    raiz.replaceChildren(
      el('div', {}, [voltar]),
      el('header', { class: 'su-cab' }, [
        el('div', {}, [
          el('div', { class: 'su-linha-topo' }, [el('span', { class: 'su-codigo' }, [chamado.codigo]), el('span', { class: 'su-status su-status-' + chamado.status }, [T.status[chamado.status] || chamado.status])]),
          el('h1', { class: 'su-titulo menor' }, [chamado.titulo]),
          el('p', { class: 'su-sub' }, [categoria + (onde ? ' · ' + onde : '') + ' · aberto em ' + S.util.dataHora(chamado.criado_em)])
        ]),
        S.botao('Atualizar', { onClick: () => recarregar() })
      ]),
      el('section', { class: 'su-cartao' }, [
        el('div', { class: 'su-cartao-cab' }, [el('h2', {}, ['Conversa'])]),
        S.detalheBlocos.conversa(chamado, comentarios)
      ]),
      el('section', { class: 'su-cartao su-cartao-resposta' }, [S.detalheBlocos.resposta(e, chamado, recarregar)])
    );

    // atualiza sozinho a cada 30 s, sem atrapalhar quem está escrevendo
    raiz._suTimer = setInterval(() => {
      if (!raiz.isConnected || raiz.dataset.tela !== 'detalhe' || raiz.dataset.codigo !== codigo) { clearInterval(raiz._suTimer); return; }
      const caixa = raiz.querySelector('textarea');
      if (caixa && caixa.value.trim()) return;
      S.detalhe.render(raiz, e, codigo, true);
    }, 30000);
  }
};

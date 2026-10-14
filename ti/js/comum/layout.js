/**
 * layout.js — monta a tela do painel: menu lateral + área de conteúdo.
 */
window.TI = window.TI || {};

TI.layout = {
  /**
   * @param {HTMLElement} raiz  elemento onde o painel será montado
   * @param {{f:Object, navegar:Function, sair:Function}} ctx
   * @returns {{conteudo:HTMLElement, marcarAtivo:Function}}
   */
  montar(raiz, ctx) {
    const { el } = TI.dom;
    const f = ctx.f;
    raiz.replaceChildren();

    const itensMenu = [];
    const secoes = TI.menu.itens(f).map((secao) => el('div', { class: 'ti-menu-secao' }, [
      el('div', { class: 'ti-menu-titulo' }, [secao.titulo]),
      ...secao.itens.map((item) => {
        const botao = el('button', {
          class: 'ti-menu-item', type: 'button', 'data-rota': item.rota,
          onClick: () => ctx.navegar(item.rota)
        }, [item.rotulo]);
        itensMenu.push(botao);
        return botao;
      })
    ]));

    const lateral = el('aside', { class: 'ti-lateral' }, [
      el('div', { class: 'ti-marca' }, [
        el('div', { class: 'ti-marca-nome' }, ['UniChamada']),
        el('div', { class: 'ti-marca-setor' }, [TI.K.setores[f.setor] || 'TI'])
      ]),
      el('nav', { class: 'ti-menu', 'aria-label': 'Principal' }, secoes),
      el('div', { class: 'ti-usuario' }, [
        TI.ui.avatar(f.nome),
        el('div', { class: 'ti-usuario-texto' }, [
          el('span', { class: 'ti-usuario-nome' }, [f.nome]),
          el('span', { class: 'ti-usuario-papel' }, [f.papel === 'coordenador_ti' ? 'Coordenação de TI' : (TI.K.setores[f.setor] || '')])
        ]),
        el('button', { class: 'ti-sair', type: 'button', onClick: () => ctx.sair() }, ['Sair'])
      ])
    ]);

    const conteudo = el('main', { class: 'ti-conteudo' });
    raiz.append(el('div', { class: 'ti-app' }, [lateral, conteudo]));

    return {
      conteudo,
      marcarAtivo(rotaMenu) {
        itensMenu.forEach((b) => b.classList.toggle('ativo', b.dataset.rota === rotaMenu));
      }
    };
  }
};

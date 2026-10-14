/**
 * fila.js — fila de chamados: abas de situação, filtros e tabela. Clicar abre o detalhe.
 * Tabelas: ti_chamados, ti_funcionarios.
 */
window.TI = window.TI || {};

TI.telas.fila = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, K } = TI;
    c.replaceChildren(ui.carregando());

    let chamados, equipe;
    try {
      [chamados, equipe] = await Promise.all([TI.dados.chamados.listar(), TI.dados.funcionarios.listar()]);
    } catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const enc = (x) => K.chamadoEncerrado.includes(x.status);
    const abas = [
      { chave: 'abertos', rotulo: 'Todos abertos', filtro: (x) => !enc(x) },
      { chave: 'sem', rotulo: 'Sem responsável', filtro: (x) => !enc(x) && !x.responsavel_id },
      { chave: 'meus', rotulo: 'Meus', filtro: (x) => !enc(x) && x.responsavel_id === ctx.f.id },
      { chave: 'atendimento', rotulo: 'Em atendimento', filtro: (x) => x.status === 'em_atendimento' },
      { chave: 'aguardando', rotulo: 'Aguardando usuário', filtro: (x) => x.status === 'aguardando_usuario' },
      { chave: 'resolvidos', rotulo: 'Resolvidos', filtro: (x) => enc(x) }
    ];
    const estado = { aba: 'abertos', prioridade: '', categoria: '' };
    const nomeDe = (id) => (equipe.find((p) => p.id === id) || {}).nome;

    const pilulas = el('div', { class: 'ti-pilulas', 'aria-label': 'Filtrar por situação' });
    const corpo = el('div', { class: 'ti-cartao' });

    function desenharPilulas() {
      pilulas.replaceChildren(...abas.map((a) => el('button', {
        class: 'ti-pilula' + (a.chave === estado.aba ? ' ativo' : ''), type: 'button',
        onClick: () => { estado.aba = a.chave; desenharPilulas(); desenharTabela(); }
      }, [a.rotulo + ' · ' + chamados.filter(a.filtro).length])));
    }

    function desenharTabela() {
      const aba = abas.find((a) => a.chave === estado.aba);
      const lista = chamados.filter(aba.filtro)
        .filter((x) => !estado.prioridade || x.prioridade === estado.prioridade)
        .filter((x) => !estado.categoria || x.categoria === estado.categoria);
      if (estado.aba === 'resolvidos') lista.sort((a, b) => new Date(b.resolvido_em || b.atualizado_em) - new Date(a.resolvido_em || a.atualizado_em));
      else lista.sort((a, b) => (a.prazo_em ? new Date(a.prazo_em).getTime() : 8.64e15) - (b.prazo_em ? new Date(b.prazo_em).getTime() : 8.64e15));

      if (!lista.length) { corpo.replaceChildren(ui.vazio('Nenhum chamado com esses filtros.')); return; }

      const linhas = lista.map((x) => el('tr', { class: 'clicavel', onClick: () => ctx.navegar('chamado', { id: x.id }) }, [
        el('td', {}, [el('span', { class: 'ti-codigo' }, [x.codigo])]),
        el('td', {}, [el('div', { class: 'ti-cel-titulo' }, [
          el('span', { class: 'ti-linha-titulo' }, [x.titulo]),
          el('span', { class: 'ti-linha-sub' }, [K.categorias[x.categoria] || x.categoria])
        ])]),
        el('td', {}, [el('div', { class: 'ti-cel-titulo' }, [
          el('span', {}, [x.solicitante_nome]),
          el('span', { class: 'ti-linha-sub' }, [x.solicitante_tipo === 'professor' ? 'Professor(a)' : x.solicitante_tipo === 'coordenador' ? 'Coordenação' : 'TI'])
        ])]),
        el('td', {}, [ui.chipPrioridade(x.prioridade)]),
        el('td', {}, [ui.chipStatusChamado(x.status)]),
        el('td', {}, [enc(x) ? el('span', { class: 'ti-prazo' }, ['—']) : ui.prazo(x.prazo_em)]),
        el('td', {}, [x.responsavel_id
          ? el('span', { class: 'ti-par-valor' }, [ui.avatar(nomeDe(x.responsavel_id) || '?', 'pequeno'), ' ', x.responsavel_id === ctx.f.id ? 'Você' : (nomeDe(x.responsavel_id) || '—')])
          : ui.semResponsavel()])
      ]));

      corpo.replaceChildren(
        el('div', { class: 'ti-tabela-wrap' }, [el('table', { class: 'ti-tabela' }, [
          el('thead', {}, [el('tr', {}, ['Chamado', 'Assunto', 'Solicitante', 'Prioridade', 'Status', 'Prazo (SLA)', 'Responsável'].map((t) => el('th', {}, [t])))]),
          el('tbody', {}, linhas)
        ])]),
        el('div', { class: 'ti-rodape-tabela' }, ['Mostrando ' + lista.length + ' chamado(s)'])
      );
    }

    const selPrioridade = ui.select([['', 'Todas'], ...Object.entries(K.prioridades)], '', {
      'aria-label': 'Prioridade', onChange: (e) => { estado.prioridade = e.target.value; desenharTabela(); }
    });
    const selCategoria = ui.select([['', 'Todas'], ...Object.entries(K.categorias)], '', {
      'aria-label': 'Categoria', onChange: (e) => { estado.categoria = e.target.value; desenharTabela(); }
    });

    c.replaceChildren(
      ui.cabecalhoPagina(chamados.filter((x) => !enc(x)).length + ' abertos · ' + chamados.filter((x) => !enc(x) && !x.responsavel_id).length + ' sem responsável', 'Fila de chamados'),
      pilulas,
      el('div', { class: 'ti-filtros' }, [
        ui.campo('Prioridade', selPrioridade),
        ui.campo('Categoria', selCategoria)
      ]),
      corpo
    );
    desenharPilulas();
    desenharTabela();
  }
};

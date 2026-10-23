/**
 * quadro.js — quadro de demandas: Backlog → Desenvolvendo → Em revisão → Aprovado → No ar.
 * Usado por desenvolvedores (front-end, back-end, full stack) e pela coordenação.
 * As telas de banco de dados e Power BI reaproveitam este quadro (renderQuadro).
 * A janela "Nova demanda" está em nova-demanda.js e os detalhes de uma tarefa em tarefa.js.
 * Tabelas: ti_demandas, ti_funcionarios.
 */
window.TI = window.TI || {};
TI.telas = TI.telas || {};
TI.telas.dev = TI.telas.dev || {};

Object.assign(TI.telas.dev, {
  render(c, ctx) {
    return TI.telas.dev.renderQuadro(c, ctx, { titulo: 'Quadro de demandas', grupo: null, novoGrupo: 'desenvolvimento' });
  },

  /** @param {{titulo:string, grupo:?string, novoGrupo:string}} opcoes  grupo = filtra o quadro por equipe */
  async renderQuadro(c, ctx, opcoes) {
    const { el } = TI.dom;
    const { ui, K } = TI;
    c.replaceChildren(ui.carregando());

    let demandas, equipe;
    try { [demandas, equipe] = await Promise.all([TI.dados.demandas.listar(), TI.dados.funcionarios.listar()]); }
    catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const f = ctx.f;
    const recarregar = () => TI.telas.dev.renderQuadro(c, ctx, opcoes);
    const nomeDe = (id) => (equipe.find((p) => p.id === id) || {}).nome || 'Responsável não listado';
    let somenteMinhas = false;
    let modoVisual = 'quadro';
    const limitePorColuna = 20;
    const visiveisPorColuna = {};
    let limiteLista = 25;
    const normalizar = (valor) => String(valor || '').trim().toLocaleLowerCase('pt-BR')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Verifica se o funcionário atual é o coordenador (ou tem permissão de criação)
    const ehCoordenador = f.papel === 'coordenador_ti';

    const colunas = [
      ['backlog', 'Backlog'], ['desenvolvendo', 'Desenvolvendo'], ['em_revisao', 'Em revisão'], ['aprovado', 'Aprovado'], ['no_ar', 'No ar']
    ];
    const quadro = el('div', { class: 'ti-kanban' });
    const resultados = el('div', { class: 'ti-demandas-resultados' });
    const busca = ui.input({
      type: 'search',
      placeholder: 'Buscar por código, título, área ou responsável',
      'aria-label': 'Buscar demandas',
      onInput: () => desenhar(true)
    });
    const prioridade = ui.select([
      ['', 'Todas as prioridades'],
      ...Object.entries(K.prioridades)
    ], '', {
      class: 'ti-select pequeno',
      'aria-label': 'Filtrar por prioridade',
      onChange: () => desenhar(true)
    });
    const dataInicio = ui.input({
      type: 'date',
      'aria-label': 'Data inicial de criação',
      onChange: () => desenhar(true)
    });
    const dataFim = ui.input({
      type: 'date',
      'aria-label': 'Data final de criação',
      onChange: () => desenhar(true)
    });
    const responsavel = ehCoordenador
      ? ui.select([
        ['', 'Todos os responsáveis'],
        ['__sem_responsavel', 'Sem responsável'],
        ...equipe
          .filter((p) => p.id)
          .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
          .map((p) => [String(p.id), String(p.nome || 'Funcionário sem nome')])
      ], '', {
        class: 'ti-select pequeno',
        'aria-label': 'Filtrar por responsável',
        onChange: () => desenhar(true)
      })
      : null;
    const botaoTodas = el('button', {
      class: 'ti-pilula ativo',
      type: 'button',
      onClick: () => { somenteMinhas = false; desenhar(true); }
    }, ['Todas']);
    const botaoMinhas = el('button', {
      class: 'ti-pilula',
      type: 'button',
      onClick: () => { somenteMinhas = true; desenhar(true); }
    }, ['Só as minhas']);
    const resumoFiltros = el('span', { class: 'ti-kanban-filtros-resumo', 'aria-live': 'polite' });
    const statusLista = ui.select([
      ['', 'Todos os status'],
      ...Object.entries(K.statusDemanda)
    ], '', {
      class: 'ti-select pequeno',
      'aria-label': 'Filtrar por status',
      onChange: () => desenhar(true)
    });
    const campoStatusLista = ui.campo('Status', statusLista);
    const limparFiltros = el('button', {
      class: 'ti-kanban-limpar',
      type: 'button',
      onClick: () => {
        busca.value = '';
        prioridade.value = '';
        dataInicio.value = '';
        dataFim.value = '';
        if (responsavel) responsavel.value = '';
        if (statusLista) statusLista.value = '';
        somenteMinhas = false;
        desenhar(true);
      }
    }, ['Limpar filtros']);
    const botaoQuadro = el('button', {
      class: 'ti-pilula ativo',
      type: 'button',
      onClick: () => {
        modoVisual = 'quadro';
        statusLista.value = '';
        desenhar(true);
      }
    }, ['Quadro']);
    const botaoLista = el('button', {
      class: 'ti-pilula',
      type: 'button',
      onClick: () => { modoVisual = 'lista'; desenhar(true); }
    }, ['Lista']);
    const filtro = el('section', { class: 'ti-kanban-filtros', 'aria-label': 'Filtros das demandas' }, [
      el('div', { class: 'ti-kanban-filtros-topo' }, [
        el('div', { class: 'ti-pilulas', 'aria-label': 'Modo de visualização' }, [botaoQuadro, botaoLista]),
        el('div', { class: 'ti-pilulas', 'aria-label': 'Filtro de responsável atual' }, [botaoTodas, botaoMinhas])
      ]),
      el('div', { class: 'ti-kanban-filtros-campos' + (responsavel ? ' com-responsavel' : '') }, [
        ui.campo('Buscar', busca),
        ui.campo('Prioridade', prioridade),
        responsavel ? ui.campo('Responsável', responsavel) : null,
        ui.campo('Criada de', dataInicio),
        ui.campo('Criada até', dataFim),
        campoStatusLista,
        limparFiltros
      ]),
      resumoFiltros
    ]);

    function desenhar(reiniciarLimites) {
      let lista = demandas.filter((d) => !opcoes.grupo || d.grupo_destino === opcoes.grupo);
      if (modoVisual === 'quadro') lista = lista.filter((d) => d.status !== 'cancelado');
      const termo = normalizar(busca.value);
      const responsavelSelecionado = responsavel ? responsavel.value : '';
      if (somenteMinhas) lista = lista.filter((d) => String(d.responsavel_id || '') === String(f.id));
      if (termo) lista = lista.filter((d) => normalizar([
        d.codigo, d.titulo, d.descricao, d.area,
        d.responsavel_id ? nomeDe(d.responsavel_id) : 'Sem responsável',
        K.statusDemanda[d.status], K.prioridades[d.prioridade]
      ].join(' ')).includes(termo));
      if (prioridade.value) lista = lista.filter((d) => d.prioridade === prioridade.value);
      if (dataInicio.value) {
        const inicio = new Date(dataInicio.value + 'T00:00:00');
        lista = lista.filter((d) => d.criado_em && new Date(d.criado_em) >= inicio);
      }
      if (dataFim.value) {
        const fimExclusivo = new Date(dataFim.value + 'T00:00:00');
        fimExclusivo.setDate(fimExclusivo.getDate() + 1);
        lista = lista.filter((d) => d.criado_em && new Date(d.criado_em) < fimExclusivo);
      }
      if (responsavelSelecionado === '__sem_responsavel') {
        lista = lista.filter((d) => !d.responsavel_id);
      } else if (responsavelSelecionado) {
        lista = lista.filter((d) => String(d.responsavel_id || '') === responsavelSelecionado);
      }
      if (modoVisual === 'lista' && statusLista.value) {
        lista = lista.filter((d) => d.status === statusLista.value);
      }
      const datasInvalidas = !!dataInicio.value && !!dataFim.value && dataInicio.value > dataFim.value;
      if (datasInvalidas) lista = [];
      const temFiltroAtivo = !!termo || !!prioridade.value || !!responsavelSelecionado ||
        !!dataInicio.value || !!dataFim.value || (modoVisual === 'lista' && !!statusLista.value) || somenteMinhas;

      if (reiniciarLimites) {
        colunas.forEach(([status]) => { visiveisPorColuna[status] = limitePorColuna; });
        limiteLista = 25;
      }
      botaoTodas.classList.toggle('ativo', !somenteMinhas);
      botaoMinhas.classList.toggle('ativo', somenteMinhas);
      botaoQuadro.classList.toggle('ativo', modoVisual === 'quadro');
      botaoLista.classList.toggle('ativo', modoVisual === 'lista');
      campoStatusLista.hidden = modoVisual !== 'lista';
      resumoFiltros.textContent = datasInvalidas
        ? 'A data inicial deve ser anterior ou igual à data final.'
        : lista.length + (lista.length === 1 ? ' demanda encontrada' : ' demandas encontradas');
      limparFiltros.disabled = !termo && !prioridade.value && !responsavelSelecionado &&
        !dataInicio.value && !dataFim.value && !(modoVisual === 'lista' && statusLista.value) && !somenteMinhas;

      if (modoVisual === 'quadro') {
        quadro.hidden = false;
        resultados.hidden = true;
        quadro.replaceChildren(...colunas.map(([status, rotulo]) => {
          let itens = lista.filter((d) => d.status === status);
          if (status === 'no_ar') itens = itens.sort((a, b) => new Date(b.no_ar_em || 0) - new Date(a.no_ar_em || 0));
          const limite = visiveisPorColuna[status] || limitePorColuna;
          const itensVisiveis = itens.slice(0, limite);
          const vazio = datasInvalidas
            ? 'Ajuste o período selecionado.'
            : (!lista.length && temFiltroAtivo
              ? 'Nenhuma demanda corresponde aos filtros.'
              : (lista.length ? 'Nenhuma demanda nesta etapa.' : 'Nada aqui.'));
          return el('section', { class: 'ti-coluna' }, [
            el('h2', { class: 'ti-coluna-cab' }, [el('span', {}, [rotulo]), el('span', {}, [String(itens.length)])]),
            ...(itens.length ? itensVisiveis.map((d) => el('button', {
              class: 'ti-ficha', type: 'button', onClick: () => TI.telas.dev.abrirTarefa(d, ctx, recarregar)
            }, [
              el('span', { class: 'ti-codigo' }, [d.codigo]),
              el('span', { class: 'ti-ficha-titulo' }, [d.titulo]),
              d.area ? el('span', { class: 'ti-tag' }, [d.area]) : null,
              el('span', { class: 'ti-ficha-nota' }, [(String(d.responsavel_id || '') === String(f.id) ? 'Você' : (d.responsavel_id ? nomeDe(d.responsavel_id) : 'Sem responsável')) + ' · ' + K.prioridades[d.prioridade]])
            ])) : [el('div', { class: 'ti-coluna-vazia' }, [vazio])]),
            itens.length > itensVisiveis.length
              ? el('button', {
                class: 'ti-coluna-mais',
                type: 'button',
                onClick: () => {
                  visiveisPorColuna[status] = limite + limitePorColuna;
                  desenhar();
                }
              }, ['Mostrar mais (' + Math.min(limitePorColuna, itens.length - itensVisiveis.length) + ')'])
              : null
          ]);
        }));
      } else {
        quadro.hidden = true;
        resultados.hidden = false;
        const ordenadas = lista.slice().sort((a, b) =>
          new Date(b.atualizado_em || b.criado_em || 0) - new Date(a.atualizado_em || a.criado_em || 0));
        const visiveis = ordenadas.slice(0, limiteLista);
        const linhas = visiveis.map((d) => el('tr', {
          class: 'ti-demanda-linha',
          role: 'button',
          tabindex: '0',
          'aria-label': 'Abrir ' + d.codigo + ' — ' + d.titulo,
          onClick: () => TI.telas.dev.abrirTarefa(d, ctx, recarregar),
          onKeyDown: (evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
              evento.preventDefault();
              TI.telas.dev.abrirTarefa(d, ctx, recarregar);
            }
          }
        }, [
          el('td', { class: 'ti-demanda-codigo' }, [d.codigo]),
          el('td', {}, [el('span', { class: 'ti-demanda-titulo' }, [d.titulo]), d.area ? el('span', { class: 'ti-demanda-area' }, [d.area]) : null]),
          el('td', {}, [ui.chipStatusDemanda(d.status)]),
          el('td', {}, [ui.chipPrioridade(d.prioridade)]),
          el('td', {}, [String(d.responsavel_id || '') === String(f.id) ? 'Você' : (d.responsavel_id ? nomeDe(d.responsavel_id) : 'Sem responsável')]),
          el('td', { class: 'ti-demanda-data' }, [TI.fmt.dataHoraCompleta(d.criado_em)])
        ]));
        const corpo = datasInvalidas
          ? [el('tr', {}, [el('td', { colspan: '6', class: 'ti-coluna-vazia' }, ['A data inicial deve ser anterior ou igual à data final.'])])]
          : (linhas.length
            ? linhas
            : [el('tr', {}, [el('td', { colspan: '6', class: 'ti-coluna-vazia' }, [temFiltroAtivo ? 'Nenhuma demanda corresponde aos filtros.' : 'Nenhuma demanda encontrada.'])])]);
        const maisResultados = ordenadas.length > visiveis.length
          ? ui.botao('Mostrar mais (' + Math.min(25, ordenadas.length - visiveis.length) + ')', {
            onClick: () => { limiteLista += 25; desenhar(); }
          })
          : null;
        resultados.replaceChildren(
          el('div', { class: 'ti-tabela-wrap' }, [
            el('table', { class: 'ti-tabela ti-demandas-tabela' }, [
              el('thead', {}, [el('tr', {}, [
                el('th', {}, ['Código']),
                el('th', {}, ['Demanda']),
                el('th', {}, ['Status']),
                el('th', {}, ['Prioridade']),
                el('th', {}, ['Responsável']),
                el('th', {}, ['Criada em'])
              ])]),
              el('tbody', {}, corpo)
            ])
          ]),
          ...(maisResultados ? [maisResultados] : [])
        );
      }
    }

    // O botão só é criado e exibido se 'ehCoordenador' for verdadeiro
    const botaoNovaDemanda = ehCoordenador 
      ? ui.botao('Nova demanda', { tipo: 'primario', onClick: () => TI.telas.dev.novaDemanda(opcoes, recarregar) }) 
      : null;

    c.replaceChildren(
      ui.cabecalhoPagina(f.nome, opcoes.titulo, botaoNovaDemanda),
      filtro,
      el('div', { class: 'ti-kanban-wrap' }, [quadro]),
      resultados
    );
    desenhar(true);
  }
});

/**
 * quadro.js — quadro de demandas: Backlog → Desenvolvendo → Em revisão → Aprovado → No ar.
 * Usado por desenvolvedores (front-end, back-end, full stack) e pela coordenação.
 * As telas de banco de dados e Power BI reaproveitam este quadro (renderQuadro).
 * A janela "Nova demanda" está em nova-demanda.js e os detalhes de uma tarefa em tarefa.js.
 * Tabelas: ti_demandas, ti_funcionarios.
 */
window.TI = window.TI || {};

TI.telas.dev = {
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
    const nomeDe = (id) => (equipe.find((p) => p.id === id) || {}).nome;
    let somenteMinhas = false;

    // Verifica se o funcionário atual é o coordenador (ou tem permissão de criação)
    const ehCoordenador = f.papel === 'coordenador_ti';

    const colunas = [
      ['backlog', 'Backlog'], ['desenvolvendo', 'Desenvolvendo'], ['em_revisao', 'Em revisão'], ['aprovado', 'Aprovado'], ['no_ar', 'No ar']
    ];
    const quadro = el('div', { class: 'ti-kanban' });
    const filtro = el('div', { class: 'ti-pilulas' });

    function desenhar() {
      let lista = demandas.filter((d) => d.status !== 'cancelado' && (!opcoes.grupo || d.grupo_destino === opcoes.grupo));
      if (somenteMinhas) lista = lista.filter((d) => d.responsavel_id === f.id);

      filtro.replaceChildren(
        el('button', { class: 'ti-pilula' + (!somenteMinhas ? ' ativo' : ''), type: 'button', onClick: () => { somenteMinhas = false; desenhar(); } }, ['Todas']),
        el('button', { class: 'ti-pilula' + (somenteMinhas ? ' ativo' : ''), type: 'button', onClick: () => { somenteMinhas = true; desenhar(); } }, ['Só as minhas'])
      );

      quadro.replaceChildren(...colunas.map(([status, rotulo]) => {
        let itens = lista.filter((d) => d.status === status);
        if (status === 'no_ar') itens = itens.sort((a, b) => new Date(b.no_ar_em || 0) - new Date(a.no_ar_em || 0)).slice(0, 10);
        return el('section', { class: 'ti-coluna' }, [
          el('h2', { class: 'ti-coluna-cab' }, [el('span', {}, [rotulo]), el('span', {}, [String(itens.length)])]),
          ...(itens.length ? itens.map((d) => el('button', {
            class: 'ti-ficha', type: 'button', onClick: () => TI.telas.dev.abrirTarefa(d, ctx, recarregar)
          }, [
            el('span', { class: 'ti-codigo' }, [d.codigo]),
            el('span', { class: 'ti-ficha-titulo' }, [d.titulo]),
            d.area ? el('span', { class: 'ti-tag' }, [d.area]) : null,
            el('span', { class: 'ti-ficha-nota' }, [(d.responsavel_id ? (d.responsavel_id === f.id ? 'Você' : nomeDe(d.responsavel_id)) : 'Sem responsável') + ' · ' + K.prioridades[d.prioridade]])
          ])) : [el('div', { class: 'ti-coluna-vazia' }, ['Nada aqui.'])])
        ]);
      }));
    }

    // O botão só é criado e exibido se 'ehCoordenador' for verdadeiro
    const botaoNovaDemanda = ehCoordenador 
      ? ui.botao('Nova demanda', { tipo: 'primario', onClick: () => TI.telas.dev.novaDemanda(opcoes, recarregar) }) 
      : null;

    c.replaceChildren(
      ui.cabecalhoPagina(f.nome, opcoes.titulo, botaoNovaDemanda),
      filtro,
      el('div', { class: 'ti-kanban-wrap' }, [quadro])
    );
    desenhar();
  }
};

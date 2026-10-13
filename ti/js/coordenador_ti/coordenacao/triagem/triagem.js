/**
 * triagem.js — direcionar chamados e demandas novos para o setor (e a pessoa) certo.
 * Carrega os dados e monta a página; cada linha da lista vem de item.js.
 * Tabelas: ti_chamados, ti_demandas, ti_funcionarios.
 */
window.TI = window.TI || {};

TI.telas.triagem = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    c.replaceChildren(ui.carregando());

    let chamados, demandas, equipe;
    try {
      [chamados, demandas, equipe] = await Promise.all([
        TI.dados.chamados.listar(), TI.dados.demandas.listar(), TI.dados.funcionarios.listar()
      ]);
    } catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const recarregar = () => TI.telas.triagem.render(c, ctx);
    const gruposChamado = ['infraestrutura', 'desenvolvimento', 'banco_de_dados', 'power_bi'];
    const gruposDemanda = ['desenvolvimento', 'banco_de_dados', 'power_bi'];

    const sugerirDemanda = (d) => /power ?bi|relat[óo]rio|dashboard/i.test(d.titulo + ' ' + (d.area || '')) ? 'power_bi'
      : /banco|view|tabela|sql/i.test(d.titulo + ' ' + (d.area || '')) ? 'banco_de_dados' : 'desenvolvimento';

    // itens esperando triagem (chamados e demandas sem grupo), os mais antigos primeiro
    const itens = [
      ...chamados.filter((x) => !x.grupo_destino && x.status === 'aberto').map((x) => ({
        tipo: 'chamado', id: x.id, codigo: x.codigo, titulo: x.titulo, quem: x.solicitante_nome,
        onde: [x.local_texto, x.patrimonio ? 'patrimônio ' + x.patrimonio : ''].filter(Boolean).join(' · ') || (K.categorias[x.categoria] || ''),
        criado_em: x.criado_em, sugestao: K.grupoSugerido(x.categoria), grupos: gruposChamado
      })),
      ...demandas.filter((x) => !x.grupo_destino && x.status === 'backlog').map((x) => ({
        tipo: 'demanda', id: x.id, codigo: x.codigo, titulo: x.titulo, quem: x.solicitante_nome,
        onde: x.area || '', criado_em: x.criado_em, sugestao: sugerirDemanda(x), grupos: gruposDemanda
      }))
    ].sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));

    const emRevisao = demandas.filter((d) => d.status === 'em_revisao');
    const atrasados = chamados.filter((x) => !K.chamadoEncerrado.includes(x.status) && x.prazo_em && new Date(x.prazo_em) < new Date());
    const ativos = equipe.filter((p) => p.ativo);
    const cargaDe = (p) => chamados.filter((x) => x.responsavel_id === p.id && !K.chamadoEncerrado.includes(x.status)).length
      + demandas.filter((x) => x.responsavel_id === p.id && ['backlog', 'desenvolvendo', 'em_revisao'].includes(x.status)).length;
    const maior = Math.max(5, ...ativos.map(cargaDe));

    c.replaceChildren(
      ui.cabecalhoPagina(fmt.hojeExtenso(), 'Triagem'),
      el('section', { class: 'ti-kpis', 'aria-label': 'Indicadores' }, [
        ui.kpi('Para direcionar', itens.length, itens.filter((i) => i.tipo === 'chamado').length + ' chamado(s) e ' + itens.filter((i) => i.tipo === 'demanda').length + ' demanda(s)'),
        ui.kpi('Aprovações pendentes', emRevisao.length, 'trabalho pronto para revisar'),
        ui.kpi('Equipe ativa', ativos.length, 'pessoas com acesso'),
        ui.kpi('Em atraso', atrasados.length, 'chamados com prazo vencido', atrasados.length > 0)
      ]),
      el('div', { class: 'ti-cols' }, [
        el('div', { class: 'ti-col-principal' }, [
          ui.cartao('Novos itens para direcionar',
            itens.length ? itens.map((item) => TI.telas.triagemBlocos.item(item, { ativos, recarregar })) : [ui.vazio('Tudo direcionado. Nada esperando triagem.')],
            el('span', { class: 'ti-sub' }, ['mais antigos primeiro']))
        ]),
        el('div', { class: 'ti-col-lateral' }, [
          ui.cartao('Aprovações pendentes', emRevisao.length ? emRevisao.map((d) => el('button', {
            class: 'ti-linha ti-linha-clicavel', type: 'button', onClick: () => ctx.navegar('aprovacao', { id: d.id })
          }, [el('span', { class: 'ti-linha-texto' }, [
            el('span', { class: 'ti-codigo' }, [d.codigo]),
            el('span', { class: 'ti-linha-titulo' }, [d.titulo]),
            el('span', { class: 'ti-linha-sub' }, [(equipe.find((p) => p.id === d.responsavel_id) || {}).nome || 'sem responsável'])
          ])])) : [ui.vazio('Nenhuma demanda em revisão.')]),
          ui.cartao('Carga da equipe', el('div', { class: 'ti-cartao-corpo com-topo' }, ativos.map((p) => ui.barra(p.nome + ' · ' + K.setores[p.setor], cargaDe(p), Math.round(cargaDe(p) / maior * 100)))))
        ])
      ])
    );
  }
};

/**
 * visao-geral.js — indicadores, "precisa de atenção agora", chamados por categoria e saúde do banco.
 * Tabelas: ti_chamados, ti_funcionarios (só leitura). Cada pessoa vê o que o banco deixa ela ver.
 */
window.TI = window.TI || {};

TI.telas.visaoGeral = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    c.replaceChildren(ui.carregando());

    const t0 = performance.now();
    let chamados, equipe;
    try {
      chamados = await TI.dados.chamados.listar();
      var msBanco = Math.round(performance.now() - t0);
      equipe = await TI.dados.funcionarios.listar();
    } catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const encerrado = (x) => K.chamadoEncerrado.includes(x.status);
    const abertos = chamados.filter((x) => !encerrado(x));
    const semResp = abertos.filter((x) => !x.responsavel_id);
    const emRisco = abertos.filter((x) => x.prazo_em && new Date(x.prazo_em) - Date.now() < 3 * 3600 * 1000);
    const resolvidosHoje = chamados.filter((x) => fmt.ehHoje(x.resolvido_em));
    const altas = abertos.filter((x) => x.prioridade === 'alta').length;

    let mediaTxt = 'nenhum hoje';
    if (resolvidosHoje.length) {
      const horas = resolvidosHoje.reduce((s, x) => s + fmt.horasEntre(x.criado_em, x.resolvido_em), 0) / resolvidosHoje.length;
      mediaTxt = 'tempo médio: ' + (horas < 1 ? Math.round(horas * 60) + ' min' : horas.toFixed(1).replace('.', ',') + ' h');
    }

    const nomeDe = (id) => (equipe.find((p) => p.id === id) || {}).nome;
    const ordem = (x) => (x.prazo_em ? new Date(x.prazo_em).getTime() : 8.64e15);
    const atencao = abertos.slice().sort((a, b) => ordem(a) - ordem(b)).slice(0, 5);

    // chamados por categoria nos últimos 30 dias
    const limite = Date.now() - 30 * 86400000;
    const porCategoria = {};
    chamados.filter((x) => new Date(x.criado_em).getTime() >= limite).forEach((x) => {
      porCategoria[x.categoria] = (porCategoria[x.categoria] || 0) + 1;
    });
    const categorias = Object.entries(porCategoria).sort((a, b) => b[1] - a[1]);
    const maior = categorias.length ? categorias[0][1] : 1;

    const linhaAtencao = (x) => el('button', {
      class: 'ti-linha ti-linha-clicavel', type: 'button',
      onClick: () => ctx.navegar('chamado', { id: x.id })
    }, [
      el('span', { class: 'ti-codigo' }, [x.codigo]),
      el('span', { class: 'ti-linha-texto' }, [
        el('span', { class: 'ti-linha-titulo' }, [x.titulo]),
        el('span', { class: 'ti-linha-sub' }, [x.solicitante_nome + ' · ' + (x.solicitante_tipo === 'professor' ? 'Professor(a)' : x.solicitante_tipo === 'coordenador' ? 'Coordenação' : 'TI')])
      ]),
      ui.chipPrioridade(x.prioridade),
      ui.prazo(x.prazo_em),
      x.responsavel_id
        ? el('span', { class: 'ti-par-valor' }, [ui.avatar(nomeDe(x.responsavel_id) || '?', 'pequeno'), ' ', x.responsavel_id === ctx.f.id ? 'Você' : (nomeDe(x.responsavel_id) || '—')])
        : ui.semResponsavel()
    ]);

    c.replaceChildren(
      ui.cabecalhoPagina(fmt.hojeExtenso(), 'Visão geral'),
      el('section', { class: 'ti-kpis', 'aria-label': 'Indicadores' }, [
        ui.kpi('Chamados abertos', abertos.length, altas + ' de prioridade alta'),
        ui.kpi('Sem responsável', semResp.length, 'aguardando alguém assumir'),
        ui.kpi('Prazo em risco (SLA)', emRisco.length, 'vencidos ou vencem em 3 horas', emRisco.length > 0),
        ui.kpi('Resolvidos hoje', resolvidosHoje.length, mediaTxt)
      ]),
      el('div', { class: 'ti-cols' }, [
        el('div', { class: 'ti-col-principal' }, [
          ui.cartao('Precisa de atenção agora', atencao.length ? atencao.map(linhaAtencao) : [ui.vazio('Nenhum chamado aberto. Bom trabalho!')],
            el('button', { class: 'ti-link', type: 'button', onClick: () => ctx.navegar('fila') }, ['Ver fila completa']))
        ]),
        el('div', { class: 'ti-col-lateral' }, [
          ui.cartao('Saúde do sistema', [
            el('div', { class: 'ti-linha' }, [
              el('span', { class: 'ti-linha-texto' }, [
                el('span', { class: 'ti-linha-titulo' }, ['Banco de dados (Supabase)']),
                el('span', { class: 'ti-linha-sub' }, ['Resposta em ' + msBanco + ' ms'])
              ]),
              el('span', { class: 'ti-status ti-status-resolvido' }, ['Operacional'])
            ]),
            el('div', { class: 'ti-linha' }, [el('span', { class: 'ti-linha-sub' }, ['O monitoramento do n8n e do envio de e-mails entra numa próxima versão.'])])
          ]),
          ui.cartao('Chamados por categoria', el('div', { class: 'ti-cartao-corpo com-topo' }, categorias.length
            ? categorias.map(([cat, n]) => ui.barra(K.categorias[cat] || cat, n, Math.round((n / maior) * 100)))
            : [ui.vazio('Sem chamados nos últimos 30 dias.')]),
            el('span', { class: 'ti-sub' }, ['últimos 30 dias']))
        ])
      ])
    );
  }
};

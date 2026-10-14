/**
 * metricas.js — números dos últimos 30 dias: volume, tempo de resolução, prazo cumprido, por equipe.
 * Tabelas: ti_chamados, ti_demandas, ti_funcionarios (só leitura).
 */
window.TI = window.TI || {};

TI.telas.metricas = {
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

    const limite = Date.now() - 30 * 86400000;
    const recentes = chamados.filter((x) => new Date(x.criado_em).getTime() >= limite);
    const resolvidos = recentes.filter((x) => x.resolvido_em);
    const noPrazo = resolvidos.filter((x) => x.prazo_em && new Date(x.resolvido_em) <= new Date(x.prazo_em));
    const media = resolvidos.length ? resolvidos.reduce((s, x) => s + fmt.horasEntre(x.criado_em, x.resolvido_em), 0) / resolvidos.length : null;
    const noAr = demandas.filter((d) => d.no_ar_em && new Date(d.no_ar_em).getTime() >= limite);

    const contar = (lista, chave) => {
      const m = {};
      lista.forEach((x) => { const k = chave(x); if (k) m[k] = (m[k] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    const barras = (pares, rotulo) => {
      const max = pares.length ? pares[0][1] : 1;
      return pares.length ? pares.map(([k, n]) => ui.barra(rotulo(k), n, Math.round(n / max * 100))) : [ui.vazio('Sem dados no período.')];
    };

    const porCategoria = contar(recentes, (x) => x.categoria);
    const porResponsavel = contar(resolvidos, (x) => x.responsavel_id);
    const demandasPorStatus = contar(demandas.filter((d) => d.status !== 'cancelado'), (d) => d.status);

    c.replaceChildren(
      ui.cabecalhoPagina('últimos 30 dias', 'Métricas por equipe'),
      el('section', { class: 'ti-kpis' }, [
        ui.kpi('Chamados abertos no período', recentes.length, resolvidos.length + ' já resolvidos'),
        ui.kpi('Tempo médio de resolução', media === null ? '—' : (media < 1 ? Math.round(media * 60) + ' min' : media.toFixed(1).replace('.', ',') + ' h'), 'do chamado aberto até resolvido'),
        ui.kpi('Resolvidos dentro do prazo', resolvidos.length ? Math.round(noPrazo.length / resolvidos.length * 100) + '%' : '—', noPrazo.length + ' de ' + resolvidos.length),
        ui.kpi('Demandas no ar', noAr.length, 'publicadas no período')
      ]),
      el('div', { class: 'ti-cols' }, [
        el('div', { class: 'ti-col-principal' }, [
          ui.cartao('Chamados por categoria', el('div', { class: 'ti-cartao-corpo com-topo' }, barras(porCategoria, (k) => K.categorias[k] || k))),
          ui.cartao('Chamados resolvidos por pessoa', el('div', { class: 'ti-cartao-corpo com-topo' }, barras(porResponsavel, (k) => (equipe.find((p) => p.id === k) || {}).nome || '—')))
        ]),
        el('div', { class: 'ti-col-lateral' }, [
          ui.cartao('Demandas por situação', el('div', { class: 'ti-cartao-corpo com-topo' }, barras(demandasPorStatus, (k) => K.statusDemanda[k] || k)))
        ])
      ])
    );
  }
};

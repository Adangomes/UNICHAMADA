/**
 * aprovacoes.js — demandas esperando a revisão da coordenação (e as já aprovadas, aguardando o deploy).
 * Tabelas: ti_demandas, ti_funcionarios.
 */
window.TI = window.TI || {};

TI.telas.aprovacoes = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    c.replaceChildren(ui.carregando());

    let demandas, equipe;
    try { [demandas, equipe] = await Promise.all([TI.dados.demandas.listar(), TI.dados.funcionarios.listar()]); }
    catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const nomeDe = (id) => (equipe.find((p) => p.id === id) || {}).nome || 'sem responsável';
    const linha = (d) => el('button', { class: 'ti-linha ti-linha-clicavel', type: 'button', onClick: () => ctx.navegar('aprovacao', { id: d.id }) }, [
      el('span', { class: 'ti-codigo' }, [d.codigo]),
      el('span', { class: 'ti-linha-texto' }, [
        el('span', { class: 'ti-linha-titulo' }, [d.titulo]),
        el('span', { class: 'ti-linha-sub' }, [nomeDe(d.responsavel_id) + ' · ' + (K.grupos[d.grupo_destino] || '—') + ' · atualizada ' + fmt.idade(d.atualizado_em)])
      ]),
      ui.chipPrioridade(d.prioridade),
      ui.chipStatusDemanda(d.status)
    ]);

    const revisao = demandas.filter((d) => d.status === 'em_revisao');
    const aprovadas = demandas.filter((d) => d.status === 'aprovado');

    c.replaceChildren(
      ui.cabecalhoPagina(revisao.length + ' em revisão · ' + aprovadas.length + ' aprovada(s) aguardando deploy', 'Aprovações de deploy'),
      ui.cartao('Em revisão', revisao.length ? revisao.map(linha) : [ui.vazio('Nenhuma demanda esperando revisão.')]),
      ui.cartao('Aprovadas, aguardando deploy', aprovadas.length ? aprovadas.map(linha) : [ui.vazio('Nada aprovado esperando publicação.')])
    );
  }
};

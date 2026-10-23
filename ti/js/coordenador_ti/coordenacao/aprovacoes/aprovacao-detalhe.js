/**
 * aprovacao-detalhe.js — revisar uma demanda: carrega os dados e monta a página com os blocos de
 *   trilha.js (etapas)  e  decisao.js (checklist, comentário e botões).
 * Tabelas: ti_demandas, ti_revisoes, ti_funcionarios. Rota: navegar('aprovacao', { id })
 */
window.TI = window.TI || {};

TI.telas.aprovacaoDetalhe = {
  async render(c, ctx, params) {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    c.replaceChildren(ui.carregando());

    let demanda, revisoes, equipe;
    try {
      [demanda, revisoes, equipe] = await Promise.all([
        TI.dados.demandas.buscar(params.id), TI.dados.revisoes.listarDaDemanda(params.id), TI.dados.funcionarios.listar()
      ]);
    } catch (e) { c.replaceChildren(ui.erro(e.message)); return; }
    if (!demanda) { c.replaceChildren(ui.vazio('Demanda não encontrada.')); return; }

    const recarregar = () => TI.telas.aprovacaoDetalhe.render(c, ctx, params);
    const nomeDe = (id) => (equipe.find((p) => p.id === id) || {}).nome || '—';

    c.replaceChildren(
      el('div', {}, [el('button', { class: 'ti-voltar', type: 'button', onClick: () => ctx.navegar('aprovacoes') }, ['← Aprovações de deploy'])]),
      el('header', { class: 'ti-pagina-cab' }, [
        el('div', {}, [
          el('div', { class: 'ti-acoes' }, [el('span', { class: 'ti-codigo' }, [demanda.codigo]), ui.chipTipo('demanda'), ui.chipStatusDemanda(demanda.status), ui.chipPrioridade(demanda.prioridade)]),
          el('h1', { class: 'ti-titulo menor' }, [demanda.titulo]),
          el('div', { class: 'ti-sub' }, ['Responsável: ' + nomeDe(demanda.responsavel_id) + ' · ' + (K.grupos[demanda.grupo_destino] || '—')])
        ])
      ]),
      TI.telas.aprovacaoBlocos.trilha(demanda),
      el('div', { class: 'ti-cols' }, [
        el('div', { class: 'ti-col-principal' }, [
          ui.cartao('O que foi pedido', el('div', { class: 'ti-cartao-corpo' }, [
            el('div', { class: 'ti-texto-corrido' }, [demanda.descricao || '(sem descrição)']),
            el('div', { class: 'ti-sub' }, ['Pedido por ' + demanda.solicitante_nome + (demanda.area ? ' · ' + demanda.area : '')])
          ])),
          ui.cartao('Histórico de revisões', revisoes.length ? revisoes.map((r) => el('div', { class: 'ti-linha' }, [
            el('span', { class: 'ti-status ' + (r.decisao === 'aprovada' ? 'ti-status-resolvido' : 'ti-status-em_revisao') }, [
              r.decisao === 'aprovada' ? 'Aprovada' : (r.decisao === 'dev_resposta' ? 'Enviado para revisão' : 'Ajustes pedidos')
            ]),
            el('span', { class: 'ti-linha-texto' }, [el('span', {}, [r.comentario || '(sem comentário)']), el('span', { class: 'ti-linha-sub' }, [nomeDe(r.revisor_id) + ' · ' + fmt.dataHoraCompleta(r.criado_em)])])
          ])) : [ui.vazio('Ainda não houve revisões.')])
        ]),
        el('div', { class: 'ti-col-lateral' }, TI.telas.aprovacaoBlocos.decisao({ demanda, nomeDe, recarregar }))
      ])
    );
  }
};

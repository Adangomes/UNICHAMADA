/**
 * trilha.js — faixa de etapas da demanda (Backlog → Desenvolvendo → Em revisão → Aprovado → No ar).
 * Parte da tela de revisão (veja aprovacao-detalhe.js).
 */
window.TI = window.TI || {};
TI.telas.aprovacaoBlocos = TI.telas.aprovacaoBlocos || {};

/** @param {Object} demanda @returns {HTMLElement} */
TI.telas.aprovacaoBlocos.trilha = function (demanda) {
  const { el } = TI.dom;
  const etapas = ['backlog', 'desenvolvendo', 'em_revisao', 'aprovado', 'no_ar'];
  const atual = etapas.indexOf(demanda.status);
  return el('section', { class: 'ti-cartao', 'aria-label': 'Etapas da demanda' }, [
    el('div', { class: 'ti-trilha-linha' }, etapas.map((etapa, i) => el('div', { class: 'ti-trilha-etapa' + (i < atual ? ' feita' : (i === atual ? ' atual' : '')) }, [
      el('span', { class: 'ti-trilha-bolinha' }, [i < atual ? '✓' : String(i + 1)]),
      el('span', {}, [TI.K.statusDemanda[etapa]])
    ])))
  ]);
};

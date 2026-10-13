/**
 * componentes/chips.js — chips de prioridade, status e tipo; avatar; prazo (cores e textos).
 * Faz parte de TI.ui (as peças de interface). Os blocos: chips.js, controles.js, blocos.js, janelas.js.
 */
window.TI = window.TI || {};
TI.ui = TI.ui || {};

(function () {
  const { el } = TI.dom;
  const K = TI.K;
  const ui = TI.ui;

  ui.chipPrioridade = (p) => el('span', { class: 'ti-chip ti-chip-' + p }, [K.prioridades[p] || p]);

  ui.chipStatusChamado = (s) => el('span', { class: 'ti-status ti-status-' + s }, [K.statusChamado[s] || s]);

  ui.chipStatusDemanda = (s) => el('span', { class: 'ti-status ti-status-' + s }, [K.statusDemanda[s] || s]);

  ui.chipTipo = (t) => el('span', { class: 'ti-tipo ti-tipo-' + t }, [t === 'chamado' ? 'Chamado' : 'Demanda']);

  ui.semResponsavel = () => el('span', { class: 'ti-sem-resp' }, ['Sem responsável']);

  ui.avatar = (nome, tamanho) => el('span', { class: 'ti-avatar' + (tamanho ? ' ' + tamanho : '') }, [TI.fmt.iniciais(nome)]);

  ui.prazo = (iso) => {
    const p = TI.fmt.prazo(iso);
    return el('span', { class: 'ti-prazo' + (p.urgente ? ' urgente' : '') }, [p.texto]);
  };
})();

/**
 * componentes/blocos.js — cartão, cabeçalho de página, indicador (KPI), barra, par rótulo/valor e os estados vazio/carregando/erro.
 * Faz parte de TI.ui (as peças de interface). Os blocos: chips.js, controles.js, blocos.js, janelas.js.
 */
window.TI = window.TI || {};
TI.ui = TI.ui || {};

(function () {
  const { el } = TI.dom;
  const K = TI.K;
  const ui = TI.ui;

  ui.cartao = (titulo, filhos, acao) => el('section', { class: 'ti-cartao' }, [
    titulo ? el('div', { class: 'ti-cartao-cab' }, [el('h2', {}, [titulo]), acao || null]) : null,
    ...[].concat(filhos || [])
  ]);

  ui.cabecalhoPagina = (subtitulo, titulo, acoes) => el('header', { class: 'ti-pagina-cab' }, [
    el('div', {}, [el('div', { class: 'ti-sub' }, [subtitulo || '']), el('h1', { class: 'ti-titulo' }, [titulo])]),
    acoes ? el('div', { class: 'ti-acoes' }, [].concat(acoes)) : null
  ]);

  ui.kpi = (rotulo, valor, legenda, alerta) => el('div', { class: 'ti-kpi' + (alerta ? ' alerta' : '') }, [
    el('div', { class: 'ti-kpi-rotulo' }, [rotulo]),
    el('div', { class: 'ti-kpi-valor' }, [String(valor)]),
    el('div', { class: 'ti-kpi-legenda' }, [legenda || ''])
  ]);

  ui.barra = (rotulo, quantidade, percentual) => el('div', { class: 'ti-barra-linha' }, [
    el('div', { class: 'ti-barra-topo' }, [el('span', {}, [rotulo]), el('strong', {}, [String(quantidade)])]),
    el('div', { class: 'ti-barra' }, [el('div', { style: { width: Math.max(2, percentual) + '%' } })])
  ]);

  ui.par = (rotulo, valor) => el('div', { class: 'ti-par' }, [
    el('span', { class: 'ti-par-rotulo' }, [rotulo]),
    el('span', { class: 'ti-par-valor' }, [].concat(valor))
  ]);

  ui.vazio = (texto) => el('div', { class: 'ti-vazio' }, [texto]);

  ui.carregando = () => el('div', { class: 'ti-carregando' }, ['Carregando…']);

  ui.erro = (texto) => el('div', { class: 'ti-erro' }, [texto]);
})();

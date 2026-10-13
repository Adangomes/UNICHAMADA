/**
 * moldura.js — moldura visual das telas de entrada (login e primeiro acesso):
 * cartão grande, painel animado à esquerda (com a borda inclinada) e o formulário à direita.
 *
 * Esta pasta tem 3 blocos:  moldura.js (monta o cartão)  ·  carrossel.js (mensagens que se alternam)
 *                           animacao.js (o fundo animado no canvas)
 * Para mudar TEXTOS:  TI.K.login (config/textos-login.js).
 * Para mudar CORES e tamanhos:  css/login/ (login.css, painel_animado.css, formulario.css).
 */
window.TI = window.TI || {};
TI.moldura = TI.moldura || {};

/**
 * @param {{titulo:string, subtitulo:string, conteudo:Node|Node[], rodape?:Node|Node[]}} opcoes
 * @returns {HTMLElement} a página inteira, pronta para entrar na tela
 */
TI.moldura.montar = function (opcoes) {
  const { el } = TI.dom;
  const L = TI.K.login;

  const direita = el('div', { class: 'ti-lg-direita' }, [
    el('div', { class: 'ti-lg-topo' }, [
      el('span', { class: 'ti-lg-marca' }, [L.marca]),
      el('span', { class: 'ti-lg-selo' }, [L.selo])
    ]),
    el('div', { class: 'ti-lg-centro' }, [
      el('h1', { class: 'ti-lg-titulo' }, [opcoes.titulo]),
      el('p', { class: 'ti-lg-sub' }, [opcoes.subtitulo]),
      ...[].concat(opcoes.conteudo)
    ]),
    el('div', { class: 'ti-lg-rodape' }, [].concat(opcoes.rodape || []))
  ]);

  return el('div', { class: 'ti-lg-pagina' }, [
    el('div', { class: 'ti-lg-cartao' }, [this._arte(), direita])
  ]);
};

/** Painel da esquerda: animação + rótulo + mensagens que se alternam. */
TI.moldura._arte = function () {
  const { el } = TI.dom;
  const canvas = el('canvas', { 'aria-hidden': 'true' });
  const arte = el('div', { class: 'ti-lg-arte' }, [
    canvas,
    el('div', { class: 'ti-lg-corte', 'aria-hidden': 'true' }),
    el('div', { class: 'ti-lg-arte-topo' }, [TI.K.login.rotuloArte]),
    this._carrossel(TI.K.login.mensagens)
  ]);
  this._animar(canvas, arte);
  return arte;
};

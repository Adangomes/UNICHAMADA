/**
 * dom.js — criar elementos HTML sem escrever HTML solto (evita injeção de código).
 * Uso: TI.dom.el('button', { class: 'x', onClick: fn }, ['Texto'])
 */
window.TI = window.TI || {};

TI.dom = {
  el(tag, attrs, filhos) {
    const no = document.createElement(tag);
    let valor;
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === false) return;       // ignora o que está vazio
      if (k === 'class') no.className = v;                             // "class" vira className
      else if (k === 'value') valor = v;                               // value só depois dos filhos (serve para <select>)
      else if (k === 'style' && typeof v === 'object') Object.assign(no.style, v);
      else if (k.startsWith('on') && typeof v === 'function') no.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k in no && typeof no[k] === 'boolean') no[k] = !!v;     // disabled, checked, selected...
      else no.setAttribute(k, v === true ? '' : v);
    });
    [].concat(filhos === undefined ? [] : filhos).forEach((f) => {
      if (f !== null && f !== undefined && f !== false) no.append(f);
    });
    if (valor !== undefined) no.value = valor;
    return no;
  },
  $(seletor, raiz) { return (raiz || document).querySelector(seletor); },
  $all(seletor, raiz) { return [...(raiz || document).querySelectorAll(seletor)]; }
};

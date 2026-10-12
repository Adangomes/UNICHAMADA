/**
 * componentes/janelas.js — confirmação, janela (modal) e aviso (toast).
 * Faz parte de TI.ui (as peças de interface). Os blocos: chips.js, controles.js, blocos.js, janelas.js.
 */
window.TI = window.TI || {};
TI.ui = TI.ui || {};

(function () {
  const { el } = TI.dom;
  const K = TI.K;
  const ui = TI.ui;

  ui.confirmar = (mensagem) => window.confirm(mensagem);

  ui.modal = ({ titulo, corpo, botoes }) => {
    const fundo = el('div', { class: 'ti-modal-fundo', onClick: (e) => { if (e.target === fundo) fechar(); } });
    function tecla(e) { if (e.key === 'Escape') fechar(); }
    function fechar() { document.removeEventListener('keydown', tecla); fundo.remove(); }
    const caixa = el('div', { class: 'ti-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': titulo }, [
      el('div', { class: 'ti-modal-cab' }, [
        el('h2', {}, [titulo]),
        el('button', { class: 'ti-modal-x', type: 'button', title: 'Fechar', 'aria-label': 'Fechar', onClick: () => fechar() }, ['✕'])
      ]),
      el('div', { class: 'ti-modal-corpo' }, [].concat(corpo)),
      botoes ? el('div', { class: 'ti-modal-rodape' }, botoes) : null
    ]);
    document.addEventListener('keydown', tecla);
    fundo.append(caixa);
    document.body.append(fundo);
    return { fechar, caixa };
  };

  ui.toast = (mensagem, tipo) => {
    let area = document.querySelector('.ti-toast-area');
    if (!area) { area = el('div', { class: 'ti-toast-area', 'aria-live': 'polite' }); document.body.append(area); }
    const t = el('div', { class: 'ti-toast' + (tipo === 'erro' ? ' erro' : '') }, [mensagem]);
    area.append(t);
    setTimeout(() => t.remove(), 4500);
  };
})();

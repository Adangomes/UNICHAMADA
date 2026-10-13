/**
 * carrossel.js — mensagens do painel da esquerda do login, que trocam sozinhas a cada 6 s (e pelas setas).
 * Parte da moldura do login (veja moldura.js). Os textos vêm de TI.K.login.mensagens.
 */
window.TI = window.TI || {};
TI.moldura = TI.moldura || {};

/** Mensagens que trocam sozinhas a cada 6 s (e pelas setas). */
TI.moldura._carrossel = function (mensagens) {
  const { el } = TI.dom;
  let atual = 0;
  let timer = null;
  const titulo = el('strong', { class: 'ti-lg-msg-titulo' }, [mensagens[0].titulo]);
  const texto = el('span', { class: 'ti-lg-msg-texto' }, [mensagens[0].texto]);
  const bloco = el('div', { class: 'ti-lg-msg', 'aria-live': 'polite' }, [titulo, texto]);

  function mostrar(i) {
    atual = (i + mensagens.length) % mensagens.length;
    bloco.classList.add('saindo');
    setTimeout(() => {
      titulo.textContent = mensagens[atual].titulo;
      texto.textContent = mensagens[atual].texto;
      bloco.classList.remove('saindo');
    }, 220);
  }
  function reiniciar() {
    clearInterval(timer);
    timer = setInterval(() => { if (!raiz.isConnected) { clearInterval(timer); return; } mostrar(atual + 1); }, 6000);
  }
  const anterior = el('button', { class: 'ti-lg-seta', type: 'button', 'aria-label': 'Mensagem anterior', onClick: () => { mostrar(atual - 1); reiniciar(); } }, ['←']);
  const proxima = el('button', { class: 'ti-lg-seta', type: 'button', 'aria-label': 'Próxima mensagem', onClick: () => { mostrar(atual + 1); reiniciar(); } }, ['→']);

  const raiz = el('div', { class: 'ti-lg-arte-base' }, [
    el('span', { class: 'ti-lg-circulo' }, [TI.K.login.selo]),
    bloco,
    el('div', { class: 'ti-lg-setas' }, [anterior, proxima])
  ]);
  reiniciar();
  return raiz;
};

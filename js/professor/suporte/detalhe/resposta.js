/**
 * detalhe/resposta.js — bloco para responder ao chamado (ou o aviso, quando não dá mais para responder).
 * Parte da tela de detalhe (veja detalhe.js). Dados: Suporte.dados.comentarios.responder.
 */
window.Suporte = window.Suporte || {};
window.Suporte.detalheBlocos = window.Suporte.detalheBlocos || {};

/**
 * @param {Object} e  estado da aba (tipo, id)
 * @param {Object} chamado
 * @param {Function} recarregar  redesenha o detalhe depois de enviar
 * @returns {HTMLElement}
 */
window.Suporte.detalheBlocos.resposta = function (e, chamado, recarregar) {
  const S = window.Suporte;
  const { el } = S;
  const T = S.T;

  if (chamado.status === 'fechado') {
    return el('div', { class: 'su-dica' }, [T.dicaFechado]);
  }

  const dica = chamado.status === 'resolvido' ? T.dicaResolvido : (chamado.status === 'aguardando_usuario' ? T.dicaAguardando : '');
  const texto = el('textarea', { class: 'su-textarea', rows: '3', maxlength: '4000', placeholder: 'Escreva a sua mensagem…', 'aria-label': 'Mensagem' });

  return el('div', { class: 'su-resposta' }, [
    dica ? el('div', { class: 'su-dica' + (chamado.status === 'aguardando_usuario' ? ' atencao' : '') }, [dica]) : null,
    texto,
    el('div', { class: 'su-acoes' }, [
      S.botao(chamado.status === 'resolvido' ? 'Reabrir com esta mensagem' : 'Enviar mensagem', { tipo: 'primario', onClick: async () => {
        const mensagem = texto.value.trim();
        if (!mensagem) throw new Error('Escreva uma mensagem antes de enviar.');
        await S.dados.comentarios.responder(e.tipo, e.id, chamado.codigo, mensagem);
        S.toast(chamado.status === 'resolvido' ? 'Chamado reaberto.' : 'Mensagem enviada.');
        await recarregar();
      } })
    ])
  ]);
};

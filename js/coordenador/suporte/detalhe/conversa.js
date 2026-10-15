/**
 * detalhe/conversa.js — bloco da conversa do chamado: o pedido original e as mensagens, em ordem.
 * Parte da tela de detalhe (veja detalhe.js). Dados: tabela ti_chamados_comentarios (sem notas internas).
 */
window.Suporte = window.Suporte || {};
window.Suporte.detalheBlocos = window.Suporte.detalheBlocos || {};

/**
 * @param {Object} chamado      o chamado (descricao, solicitante_nome, criado_em)
 * @param {Object[]} comentarios  mensagens: { autor_tipo, autor_nome, texto, criado_em }
 * @returns {HTMLElement}
 */
window.Suporte.detalheBlocos.conversa = function (chamado, comentarios) {
  const S = window.Suporte;
  const { el } = S;

  const mensagem = (quem, meta, texto, classe) => el('div', { class: 'su-msg' }, [
    el('span', { class: 'su-avatar' }, [quem.charAt(0).toUpperCase()]),
    el('div', { class: 'su-msg-corpo' }, [
      el('div', { class: 'su-msg-meta' }, [el('strong', {}, [quem]), el('span', {}, [meta])]),
      el('div', { class: 'su-bolha ' + classe }, [texto])
    ])
  ]);

  const itens = [mensagem('Você', S.util.dataHora(chamado.criado_em), chamado.descricao || '(sem descrição)', 'eu')];
  comentarios.forEach((m) => {
    if (m.autor_tipo === 'ti') {
      itens.push(mensagem(S.util.primeiroNome(m.autor_nome) + ' · Equipe de TI', S.util.dataHora(m.criado_em), m.texto, 'ti'));
    } else {
      itens.push(mensagem('Você', S.util.dataHora(m.criado_em), m.texto, 'eu'));
    }
  });
  return el('div', { class: 'su-conversa' }, itens);
};

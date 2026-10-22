/**
 * conversa.js — Versão com TRAVA DE PRIVACIDADE.
 * Garante que notas internas nunca apareçam para o solicitante.
 */
window.Suporte = window.Suporte || {};
window.Suporte.detalheBlocos = window.Suporte.detalheBlocos || {};

window.Suporte.detalheBlocos.conversa = function (chamado, comentarios) {
  const S = window.Suporte;
  const { el } = S;

  const quemAbriu = chamado.solicitante_tipo === 'professor' ? 'Professor(a)' : chamado.solicitante_tipo === 'coordenador' ? 'Coordenação' : 'TI';

  const mensagens = [
    el('div', { class: 'ti-msg' }, [
      S.el('span', { class: 'su-avatar' }, [chamado.solicitante_nome.charAt(0).toUpperCase()]),
      el('div', { class: 'ti-msg-corpo' }, [
        el('div', { class: 'ti-msg-meta' }, [el('strong', {}, [chamado.solicitante_nome]), el('span', {}, [quemAbriu + ' · ' + S.util.dataHora(chamado.criado_em)])]),
        el('div', { class: 'ti-bolha' }, [chamado.descricao || '(sem descrição)'])
      ])
    ])
  ];

  comentarios.forEach((m) => {
    // TRAVA DE OURO: Se a mensagem for interna, ela SÓ aparece se o autor for da TI 
    // E se o usuário logado também for da TI. 
    // Como este arquivo é usado pelo SOLICITANTE, a regra é simples: SE FOR INTERNO, NÃO MOSTRA.
    if (m.interno) return; 

    mensagens.push(el('div', { class: 'ti-msg' }, [
      S.el('span', { class: 'su-avatar' }, [m.autor_nome.charAt(0).toUpperCase()]),
      el('div', { class: 'ti-msg-corpo' }, [
        el('div', { class: 'ti-msg-meta' }, [el('strong', {}, [m.autor_nome]), el('span', {}, [(m.autor_tipo === 'ti' ? 'TI' : 'Solicitante') + ' · ' + S.util.dataHora(m.criado_em)])]),
        el('div', { class: 'ti-bolha' + (m.autor_tipo === 'ti' ? ' ti' : '') }, [m.texto || ''])
      ])
    ]));
  });

  return el('div', { class: 'su-conversa' }, mensagens);
};

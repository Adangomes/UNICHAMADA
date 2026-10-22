/**
 * conversa.js — bloco "Conversa" do chamado + caixa para responder ou escrever nota interna.
 * Parte da tela "detalhe do chamado" (veja detalhe.js, que monta tudo).
 * Tabelas: ti_chamados_comentarios (escrita) e ti_auditoria (escrita).
 */
window.TI = window.TI || {};
TI.telas.detalheBlocos = TI.telas.detalheBlocos || {};

/**
 * @param {Object} e  estado da tela, montado em detalhe.js
 * @returns {HTMLElement[]} dois cartões: a conversa e a caixa de resposta
 */
TI.telas.detalheBlocos.conversa = function (e) {
  const { el } = TI.dom;
  const { ui, fmt } = TI;
  const { chamado, comentarios, recarregar, f, coord } = e;

  const quemAbriu = chamado.solicitante_tipo === 'professor' ? 'Professor(a)' : chamado.solicitante_tipo === 'coordenador' ? 'Coordenação' : 'TI';

  // ---- mensagens: primeiro o pedido original, depois os comentários ----
  const mensagens = [
    el('div', { class: 'ti-msg' }, [
      ui.avatar(chamado.solicitante_nome, 'grande'),
      el('div', { class: 'ti-msg-corpo' }, [
        el('div', { class: 'ti-msg-meta' }, [el('strong', {}, [chamado.solicitante_nome]), el('span', {}, [quemAbriu + ' · ' + fmt.dataHoraCompleta(chamado.criado_em)])]),
        el('div', { class: 'ti-bolha' }, [chamado.descricao || '(sem descrição)'])
      ])
    ])
  ];
  
  comentarios.forEach((m) => {
    // CORREÇÃO DE PRIVACIDADE: 
    // Se a mensagem for interna E o usuário NÃO for coordenador de TI, ignora a mensagem completamente.
    if (m.interno && !coord) return;

    mensagens.push(el('div', { class: 'ti-msg' }, [
      ui.avatar(m.autor_nome, 'grande'),
      el('div', { class: 'ti-msg-corpo' }, [
        el('div', { class: 'ti-msg-meta' }, m.interno
          ? [el('strong', {}, ['Nota interna']), el('span', {}, ['só o TI vê · ' + m.autor_nome + ' · ' + fmt.dataHoraCompleta(m.criado_em)])]
          : [el('strong', {}, [m.autor_nome]), el('span', {}, [(m.autor_tipo === 'ti' ? 'TI' : 'Solicitante') + ' · ' + fmt.dataHoraCompleta(m.criado_em)])]),
        el('div', { class: 'ti-bolha' + (m.interno ? ' interna' : (m.autor_tipo === 'ti' ? ' ti' : '')) }, [m.texto || m.mensagem || m.conteudo || ''])
      ])
    ]));
  });

  // ---- caixa de resposta (duas abas: responder / nota interna) ----
  let aba = 'resposta';
  const area = ui.textarea({ rows: '4', 'aria-label': 'Mensagem', placeholder: 'Escreva a resposta ao solicitante.' });
  const abaResposta = el('button', { class: 'ti-aba ativo', type: 'button', onClick: () => trocar('resposta') }, ['Responder ao solicitante']);
  const abaNota = el('button', { class: 'ti-aba', type: 'button', onClick: () => trocar('nota') }, ['Nota interna']);
  const enviar = ui.botao('Enviar resposta', { tipo: 'primario', onClick: async () => {
    const texto = area.value.trim();
    if (!texto) throw new Error('Escreva uma mensagem antes de enviar.');
    await TI.dados.comentarios.criar({ chamado_id: chamado.id, texto, interno: aba === 'nota' });
    await TI.dados.auditoria.registrar(aba === 'nota' ? 'chamado.nota' : 'chamado.resposta', 'chamado', chamado.id, {});
    ui.toast(aba === 'nota' ? 'Nota interna salva.' : 'Resposta registrada.');
    await recarregar();
  } });
  function trocar(nova) {
    aba = nova;
    abaResposta.classList.toggle('ativo', nova === 'resposta');
    abaNota.classList.toggle('ativo', nova === 'nota');
    area.placeholder = nova === 'resposta' ? 'Escreva a resposta ao solicitante.' : 'Nota interna: só o TI vê.';
    enviar.textContent = nova === 'resposta' ? 'Enviar resposta' : 'Salvar nota interna';
  }

  return [
    ui.cartao('Conversa', el('div', { class: 'ti-conversa' }, mensagens)),
    ui.cartao(null, [
      el('div', { class: 'ti-abas' }, [abaResposta, abaNota]),
      el('div', { class: 'ti-cartao-corpo com-topo' }, [area, el('div', { class: 'ti-acoes fim' }, [enviar])])
    ])
  ];
};

/**
 * ficha.js — o cartão de um chamado da infraestrutura (local, patrimônio, prazo) e os botões do próximo passo.
 * Parte da tela "Meus chamados" (veja meus-chamados.js). Tabelas: ti_chamados_comentarios (nota interna).
 */
window.TI = window.TI || {};
TI.telas.infraBlocos = TI.telas.infraBlocos || {};

/** Janela para registrar uma nota interna do atendimento. */
TI.telas.infraBlocos.registrarNota = function (x) {
  const { ui } = TI;
  const texto = ui.textarea({ rows: '4', placeholder: 'O que foi feito? (só o TI vê esta nota)' });
  const modal = ui.modal({
    titulo: 'Nota do atendimento — ' + x.codigo,
    corpo: [texto],
    botoes: [
      ui.botao('Cancelar', { onClick: () => modal.fechar() }),
      ui.botao('Salvar nota', { tipo: 'primario', onClick: async () => {
        if (!texto.value.trim()) throw new Error('Escreva a nota.');
        await TI.dados.comentarios.criar({ chamado_id: x.id, texto: texto.value.trim(), interno: true });
        ui.toast('Nota salva.');
        modal.fechar();
      } })
    ]
  });
  texto.focus();
};

/**
 * @param {Object} x  o chamado
 * @param {{f:Object, ctx:Object, mudar:Function}} contexto  mudar(x, campos, acao, mensagem) grava e recarrega
 * @returns {HTMLElement}
 */
TI.telas.infraBlocos.ficha = function (x, contexto) {
  const { el } = TI.dom;
  const { ui } = TI;
  const { f, ctx, mudar } = contexto;

  const acoes = [
    ui.botao('Nota', { pequeno: true, onClick: () => TI.telas.infraBlocos.registrarNota(x) }),
    ui.botao('Detalhes', { pequeno: true, onClick: () => ctx.navegar('chamado', { id: x.id }) })
  ];
  if (!x.responsavel_id) acoes.push(ui.botao('Assumir', { tipo: 'primario', pequeno: true, onClick: () => mudar(x, { responsavel_id: f.id, status: 'em_atendimento' }, 'chamado.assumido', 'Você assumiu ' + x.codigo + '.') }));
  else if (x.status === 'aguardando_usuario') acoes.push(ui.botao('Retomar', { tipo: 'primario', pequeno: true, onClick: () => mudar(x, { status: 'em_atendimento' }, 'chamado.status', 'Atendimento retomado.') }));
  else {
    acoes.push(ui.botao('Aguardando material', { pequeno: true, onClick: () => mudar(x, { status: 'aguardando_usuario' }, 'chamado.aguardando', 'Chamado em espera.') }));
    acoes.push(ui.botao('Marcar como resolvido', { tipo: 'primario', pequeno: true, onClick: () => mudar(x, { status: 'resolvido' }, 'chamado.resolvido', x.codigo + ' resolvido.') }));
  }

  return el('section', { class: 'ti-cartao' }, [el('div', { class: 'ti-cartao-corpo com-topo' }, [
    el('div', { class: 'ti-acoes ti-infra-topo' }, [
      el('div', { class: 'ti-acoes' }, [el('span', { class: 'ti-codigo' }, [x.codigo]), ui.chipPrioridade(x.prioridade)]),
      ui.chipStatusChamado(x.status)
    ]),
    el('div', { class: 'ti-linha-texto' }, [
      el('span', { class: 'ti-linha-titulo ti-infra-titulo' }, [x.titulo]),
      el('span', { class: 'ti-linha-sub' }, ['Pedido por ' + x.solicitante_nome])
    ]),
    el('div', { class: 'ti-aviso ti-infra-dados' }, [
      el('div', {}, [el('div', { class: 'ti-sub' }, ['LOCAL']), el('strong', {}, [x.local_texto || '—'])]),
      el('div', {}, [el('div', { class: 'ti-sub' }, ['PATRIMÔNIO']), el('strong', { class: 'ti-mono' }, [x.patrimonio || 'sem número'])]),
      el('div', {}, [el('div', { class: 'ti-sub' }, ['PRAZO']), ui.prazo(x.prazo_em)])
    ]),
    el('div', { class: 'ti-acoes fim' }, acoes)
  ])]);
};

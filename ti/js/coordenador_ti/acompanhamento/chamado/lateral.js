/**
 * lateral.js — coluna da direita do chamado (detalhes, contexto, ações) e os botões do topo.
 * Parte da tela "detalhe do chamado" (veja detalhe.js, que monta tudo).
 * Cada mudança passa por e.mudar(), que grava no banco, registra na auditoria e recarrega a tela.
 */
window.TI = window.TI || {};
TI.telas.detalheBlocos = TI.telas.detalheBlocos || {};

/**
 * @param {Object} e  estado da tela, montado em detalhe.js
 * @returns {{acoesTopo: HTMLElement[], cartoes: Array<HTMLElement|null>}}
 */
TI.telas.detalheBlocos.lateral = function (e) {
  const { el } = TI.dom;
  const { ui, fmt, K } = TI;
  const { f, coord, chamado, equipe, responsavel, encerrado, podeAgir, mudar } = e;

  // ---- botões do topo da página ----
  const acoesTopo = [];
  if (!encerrado && podeAgir) {
    if (!chamado.responsavel_id) acoesTopo.push(ui.botao('Assumir chamado', { tipo: 'primario', onClick: () => mudar({ responsavel_id: f.id, status: 'em_atendimento' }, 'chamado.assumido', 'Você assumiu o chamado.') }));
    acoesTopo.push(ui.botao('Resolver chamado', { tipo: chamado.responsavel_id ? 'primario' : 'secundario', onClick: () => mudar({ status: 'resolvido' }, 'chamado.resolvido', 'Chamado resolvido.') }));
  }

  // ---- cartão "Ações" ----
  const botoesLaterais = [];
  if (!encerrado && podeAgir) {
    botoesLaterais.push(ui.botao('Aguardar usuário', { onClick: () => mudar({ status: 'aguardando_usuario' }, 'chamado.aguardando') }));
    botoesLaterais.push(ui.botao('Encaminhar à coordenação', { onClick: () => mudar({ status: 'com_coordenacao' }, 'chamado.encaminhado') }));
  }
  if (encerrado && podeAgir) {
    botoesLaterais.push(ui.botao('Reabrir chamado', { onClick: () => mudar({ status: 'aberto', resolvido_em: null }, 'chamado.reaberto', 'Chamado reaberto.') }));
  }

  // ---- cartão "Detalhes": prioridade, status e responsável editáveis ----
  const selPrioridade = ui.select(Object.entries(K.prioridades), chamado.prioridade, {
    class: 'ti-select pequeno', disabled: !podeAgir, 'aria-label': 'Prioridade',
    onChange: (ev) => {
      const horas = K.slaHoras[ev.target.value];
      mudar({ prioridade: ev.target.value, prazo_em: new Date(new Date(chamado.criado_em).getTime() + horas * 3600000).toISOString() }, 'chamado.prioridade', 'Prioridade alterada.');
    }
  });
  const selStatus = ui.select(Object.entries(K.statusChamado), chamado.status, {
    class: 'ti-select pequeno', disabled: !podeAgir, 'aria-label': 'Status',
    onChange: (ev) => mudar({ status: ev.target.value }, 'chamado.status', 'Status alterado.')
  });
  const ativos = equipe.filter((p) => p.ativo && (!chamado.grupo_destino || K.grupoDoSetor(p.setor) === chamado.grupo_destino || p.papel === 'coordenador_ti'));
  const respControle = coord
    ? ui.select([['', '(ninguém)'], ...ativos.map((p) => [p.id, p.nome])], chamado.responsavel_id || '', {
      class: 'ti-select pequeno', 'aria-label': 'Responsável',
      onChange: (ev) => mudar({ responsavel_id: ev.target.value || null }, 'chamado.reatribuido', 'Responsável alterado.')
    })
    : el('span', {}, [responsavel ? (responsavel.id === f.id ? 'Você' : responsavel.nome) : 'Sem responsável']);

  const progresso = fmt.progressoPrazo(chamado.criado_em, chamado.prazo_em);
  const prazo = fmt.prazo(chamado.prazo_em);
  const contexto = Object.entries(chamado.contexto || {});

  const detalhes = ui.cartao('Detalhes', el('div', { class: 'ti-cartao-corpo' }, [
    ui.par('Solicitante', chamado.solicitante_nome),
    ui.par('Categoria', K.categorias[chamado.categoria] || chamado.categoria),
    chamado.grupo_destino ? ui.par('Equipe', K.grupos[chamado.grupo_destino]) : null,
    chamado.local_texto ? ui.par('Local', chamado.local_texto) : null,
    chamado.patrimonio ? ui.par('Patrimônio', el('span', { class: 'ti-mono' }, [chamado.patrimonio])) : null,
    ui.par('Prioridade', selPrioridade),
    ui.par('Status', selStatus),
    ui.par('Responsável', respControle),
    ui.par('Aberto em', fmt.dataHoraCompleta(chamado.criado_em)),
    encerrado ? null : el('div', { class: 'ti-barra-linha' }, [
      el('div', { class: 'ti-barra-topo' }, [el('span', { class: 'ti-par-rotulo' }, ['Prazo de resolução']), el('strong', { class: prazo.urgente ? 'ti-prazo urgente' : '' }, [prazo.texto])]),
      el('div', { class: 'ti-barra' }, [el('div', { style: { width: Math.max(2, progresso) + '%' } })])
    ])
  ]));

  return {
    acoesTopo,
    cartoes: [
      detalhes,
      contexto.length ? ui.cartao('Contexto capturado', el('div', { class: 'ti-cartao-corpo' }, contexto.map(([k, v]) => ui.par(k, String(v))))) : null,
      botoesLaterais.length ? ui.cartao('Ações', el('div', { class: 'ti-cartao-corpo' }, botoesLaterais)) : null
    ]
  };
};

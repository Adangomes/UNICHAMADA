/**
 * tarefa.js — janela de uma demanda: detalhes e o próximo passo (assumir, enviar para revisão...).
 * Tabelas: ti_demandas, ti_revisoes (leitura), ti_auditoria.
 * Fica dentro de TI.telas.dev (carregue depois de quadro.js).
 */
window.TI = window.TI || {};

TI.telas.dev.abrirTarefa = async function (demanda, ctx, aoMudar) {
  const { el } = TI.dom;
  const { ui, fmt, K } = TI;
  const f = ctx.f;
  const coord = f.papel === 'coordenador_ti';
  const doGrupo = demanda.grupo_destino === K.grupoDoSetor(f.setor);
  const ehMinha = demanda.responsavel_id === f.id;

  let ajuste = null;
  try {
    const revisoes = await TI.dados.revisoes.listarDaDemanda(demanda.id);
    if (revisoes.length && revisoes[0].decisao === 'ajustes') ajuste = revisoes[0];
  } catch (e) { /* sem acesso às revisões: segue sem elas */ }

  async function mover(campos, acao, mensagem) {
    await TI.dados.demandas.atualizar(demanda.id, campos);
    await TI.dados.auditoria.registrar(acao, 'demanda', demanda.id, campos);
    ui.toast(mensagem);
    modal.fechar();
    if (aoMudar) await aoMudar();
  }

  const botoes = [ui.botao('Fechar', { onClick: () => modal.fechar() })];
  if (demanda.status === 'backlog' && (coord || (doGrupo && !demanda.responsavel_id))) {
    botoes.push(ui.botao('Assumir', { tipo: 'primario', onClick: () => mover({ responsavel_id: f.id, status: 'desenvolvendo' }, 'demanda.assumida', 'Você assumiu ' + demanda.codigo + '.') }));
  }
  if (demanda.status === 'desenvolvendo' && (coord || ehMinha)) {
    botoes.push(ui.botao('Enviar para revisão', { tipo: 'primario', onClick: () => mover({ status: 'em_revisao' }, 'demanda.revisao', 'Enviada para a revisão da coordenação.') }));
  }
  if (demanda.status === 'em_revisao' && coord) {
    botoes.push(ui.botao('Abrir revisão', { tipo: 'primario', onClick: () => { modal.fechar(); ctx.navegar('aprovacao', { id: demanda.id }); } }));
  }
  if (demanda.status === 'aprovado' && coord) {
    botoes.push(ui.botao('Marcar como no ar', { tipo: 'primario', onClick: () => mover({ status: 'no_ar' }, 'demanda.no_ar', 'Demanda no ar.') }));
  }

  const modal = ui.modal({
    titulo: demanda.codigo + ' — ' + demanda.titulo,
    corpo: [
      el('div', { class: 'ti-acoes' }, [ui.chipStatusDemanda(demanda.status), ui.chipPrioridade(demanda.prioridade), demanda.area ? el('span', { class: 'ti-tag' }, [demanda.area]) : null]),
      el('div', { class: 'ti-texto-corrido' }, [demanda.descricao || '(sem descrição)']),
      ajuste ? el('div', { class: 'ti-alerta-amarelo' }, ['Ajustes pedidos pela coordenação: ' + (ajuste.comentario || '(sem comentário)')]) : null,
      ui.par('Pedido por', demanda.solicitante_nome),
      ui.par('Equipe', K.grupos[demanda.grupo_destino] || '—'),
      ui.par('Criada em', fmt.dataHoraCompleta(demanda.criado_em)),
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_ar_em)) : null
    ],
    botoes
  });
};

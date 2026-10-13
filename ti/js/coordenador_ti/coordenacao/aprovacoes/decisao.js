/**
 * decisao.js — coluna da direita da revisão: checklist, comentário e os botões de decisão
 * ("Aprovar e autorizar deploy", "Pedir ajustes", "Marcar como no ar").
 * Parte da tela de revisão (veja aprovacao-detalhe.js).
 * Tabelas: ti_revisoes, ti_demandas, ti_auditoria (escrita). Só a coordenação aprova (o banco também impõe isso).
 */
window.TI = window.TI || {};
TI.telas.aprovacaoBlocos = TI.telas.aprovacaoBlocos || {};

/**
 * @param {{demanda:Object, nomeDe:Function, recarregar:Function}} e
 * @returns {Array<HTMLElement|null>} cartões "Checklist de revisão" (só em revisão) e "Sua decisão"
 */
TI.telas.aprovacaoBlocos.decisao = function (e) {
  const { el } = TI.dom;
  const { ui, K } = TI;
  const { demanda, nomeDe, recarregar } = e;

  // ---- checklist ----
  const marcas = K.checklistRevisao.map(() => false);
  const aviso = el('div', { class: 'ti-alerta-amarelo' });
  const caixas = K.checklistRevisao.map((texto, i) => {
    const cx = el('input', { type: 'checkbox', onChange: () => { marcas[i] = cx.checked; atualizarAviso(); } });
    return el('label', { class: 'ti-checklist-item' }, [cx, texto]);
  });
  function atualizarAviso() {
    const falta = marcas.filter((m) => !m).length;
    aviso.textContent = falta ? falta + ' item(ns) ainda não conferido(s).' : 'Todos os itens conferidos.';
    aviso.hidden = false;
  }
  atualizarAviso();

  const comentario = ui.textarea({ rows: '3', 'aria-label': 'Comentário', placeholder: 'Comentário para ' + nomeDe(demanda.responsavel_id) + ' (obrigatório ao pedir ajustes)' });
  const checklistRegistro = () => K.checklistRevisao.map((item, i) => ({ item, ok: marcas[i] }));

  async function decidir(decisao, novoStatus, acao, mensagem) {
    await TI.dados.revisoes.criar({ demanda_id: demanda.id, decisao, checklist: checklistRegistro(), comentario: comentario.value.trim() });
    await TI.dados.demandas.atualizar(demanda.id, { status: novoStatus });
    await TI.dados.auditoria.registrar(acao, 'demanda', demanda.id, { decisao });
    ui.toast(mensagem);
    await recarregar();
  }

  // ---- botões, conforme a situação da demanda ----
  const botoes = [];
  if (demanda.status === 'em_revisao') {
    botoes.push(ui.botao('Aprovar e autorizar deploy', { tipo: 'primario', onClick: async () => {
      if (marcas.some((m) => !m) && !ui.confirmar('Ainda há itens do checklist sem conferir. Aprovar mesmo assim?')) return;
      await decidir('aprovada', 'aprovado', 'demanda.aprovada', 'Demanda aprovada. Deploy autorizado.');
    } }));
    botoes.push(ui.botao('Pedir ajustes', { onClick: async () => {
      if (!comentario.value.trim()) throw new Error('Explique o que precisa ser ajustado no comentário.');
      await decidir('ajustes', 'desenvolvendo', 'demanda.ajustes', 'Pedido de ajustes enviado.');
    } }));
  } else if (demanda.status === 'aprovado') {
    botoes.push(ui.botao('Marcar como no ar', { tipo: 'primario', onClick: async () => {
      await TI.dados.demandas.atualizar(demanda.id, { status: 'no_ar' });
      await TI.dados.auditoria.registrar('demanda.no_ar', 'demanda', demanda.id, {});
      ui.toast('Demanda marcada como no ar.');
      await recarregar();
    } }));
  }

  return [
    demanda.status === 'em_revisao' ? ui.cartao('Checklist de revisão', el('div', { class: 'ti-cartao-corpo' }, [...caixas, aviso])) : null,
    ui.cartao('Sua decisão', el('div', { class: 'ti-cartao-corpo' }, [
      demanda.status === 'em_revisao' ? comentario : el('div', { class: 'ti-sub' }, [demanda.status === 'aprovado' ? 'Aprovada. Falta publicar.' : 'Esta demanda não está em revisão.']),
      ...botoes,
      demanda.status === 'em_revisao' ? el('div', { class: 'ti-sub' }, ['Ao autorizar, a versão pode ir para o ar. Só a coordenação de TI tem essa permissão.']) : null
    ]))
  ];
};

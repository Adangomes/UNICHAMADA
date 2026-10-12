/**
 * auditoria.js — quem fez o quê e quando (últimas 100 ações). Só a coordenação enxerga.
 * Tabelas: ti_auditoria, ti_funcionarios.
 */
window.TI = window.TI || {};

TI.telas.auditoria = {
  async render(c) {
    const { el } = TI.dom;
    const { ui, fmt } = TI;
    c.replaceChildren(ui.carregando());

    let registros, equipe;
    try { [registros, equipe] = await Promise.all([TI.dados.auditoria.listar(100), TI.dados.funcionarios.listar()]); }
    catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const textos = {
      'chamado.assumido': 'assumiu o chamado', 'chamado.resolvido': 'resolveu o chamado', 'chamado.reaberto': 'reabriu o chamado',
      'chamado.resposta': 'respondeu ao solicitante', 'chamado.nota': 'escreveu uma nota interna', 'chamado.direcionado': 'direcionou o chamado',
      'chamado.prioridade': 'mudou a prioridade', 'chamado.status': 'mudou o status', 'chamado.aguardando': 'colocou para aguardar o usuário',
      'chamado.encaminhado': 'encaminhou à coordenação', 'chamado.reatribuido': 'trocou o responsável',
      'demanda.direcionado': 'direcionou a demanda', 'demanda.aprovada': 'aprovou a demanda e autorizou o deploy',
      'demanda.ajustes': 'pediu ajustes na demanda', 'demanda.no_ar': 'marcou a demanda como no ar',
      'demanda.assumida': 'assumiu a demanda', 'demanda.revisao': 'enviou a demanda para revisão', 'demanda.criada': 'criou a demanda',
      'funcionario.cadastrado': 'cadastrou um funcionário', 'funcionario.desativado': 'desativou um funcionário', 'funcionario.reativado': 'reativou um funcionário'
    };
    const nomeDe = (id) => (equipe.find((p) => p.id === id) || {}).nome || 'Sistema';

    c.replaceChildren(
      ui.cabecalhoPagina('últimas ' + registros.length + ' ações', 'Auditoria'),
      ui.cartao(null, registros.length ? registros.map((r) => el('div', { class: 'ti-linha' }, [
        el('span', { class: 'ti-codigo ti-aud-data' }, [fmt.dataHoraCompleta(r.criado_em)]),
        el('span', { class: 'ti-linha-texto' }, [
          el('span', {}, [el('strong', {}, [nomeDe(r.funcionario_id)]), ' ' + (textos[r.acao] || r.acao)]),
          r.alvo_tipo ? el('span', { class: 'ti-linha-sub' }, [r.alvo_tipo + (r.alvo_id ? ' · ' + String(r.alvo_id).slice(0, 8) : '')]) : null
        ])
      ])) : [ui.vazio('Nenhuma ação registrada ainda.')])
    );
  }
};

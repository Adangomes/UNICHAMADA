/**
 * detalhe.js — um chamado: carrega os dados e monta a página com os blocos de:
 *   conversa.js (conversa + resposta/nota interna)  e  lateral.js (detalhes, contexto, ações).
 * Tabelas: ti_chamados, ti_chamados_comentarios, ti_funcionarios, ti_auditoria (escrita).
 * Rota: navegar('chamado', { id })
 */
window.TI = window.TI || {};

TI.telas.detalhe = {
  async render(c, ctx, params) {
    const { el } = TI.dom;
    const { ui, K } = TI;
    c.replaceChildren(ui.carregando());

    let chamado, comentarios, equipe;
    try {
      [chamado, comentarios, equipe] = await Promise.all([
        TI.dados.chamados.buscar(params.id),
        TI.dados.comentarios.listarDoChamado(params.id),
        TI.dados.funcionarios.listar()
      ]);
    } catch (e) { c.replaceChildren(ui.erro(e.message)); return; }
    if (!chamado) { c.replaceChildren(ui.vazio('Chamado não encontrado ou sem permissão para vê-lo.')); return; }

    const f = ctx.f;
    const coord = f.papel === 'coordenador_ti';
    const meuGrupo = K.grupoDoSetor(f.setor);
    const recarregar = () => TI.telas.detalhe.render(c, ctx, params);

    /** Grava a mudança, registra na auditoria e recarrega a tela. Usado pelos botões e caixas da lateral. */
    async function mudar(campos, acao, mensagem) {
      try {
        await TI.dados.chamados.atualizar(chamado.id, campos);
        await TI.dados.auditoria.registrar(acao, 'chamado', chamado.id, campos);
        ui.toast(mensagem || 'Chamado atualizado.');
      } catch (err) { ui.toast(err.message, 'erro'); }
      await recarregar();
    }

    // estado compartilhado entre os blocos
    const e = {
      ctx, f, coord, chamado, comentarios, equipe, recarregar, mudar,
      responsavel: equipe.find((p) => p.id === chamado.responsavel_id),
      encerrado: K.chamadoEncerrado.includes(chamado.status),
      podeAgir: coord || chamado.responsavel_id === f.id || (!chamado.responsavel_id && chamado.grupo_destino === meuGrupo)
    };

    const lateral = TI.telas.detalheBlocos.lateral(e);

    c.replaceChildren(
      el('div', {}, [el('button', { class: 'ti-voltar', type: 'button', onClick: () => ctx.navegar('fila') }, ['← Fila de chamados'])]),
      el('header', { class: 'ti-pagina-cab' }, [
        el('div', {}, [
          el('div', { class: 'ti-acoes' }, [el('span', { class: 'ti-codigo' }, [chamado.codigo]), ui.chipPrioridade(chamado.prioridade), ui.chipStatusChamado(chamado.status), e.encerrado ? null : ui.prazo(chamado.prazo_em)]),
          el('h1', { class: 'ti-titulo menor' }, [chamado.titulo])
        ]),
        lateral.acoesTopo.length ? el('div', { class: 'ti-acoes' }, lateral.acoesTopo) : null
      ]),
      el('div', { class: 'ti-cols' }, [
        el('div', { class: 'ti-col-principal' }, TI.telas.detalheBlocos.conversa(e)),
        el('div', { class: 'ti-col-lateral' }, lateral.cartoes)
      ])
    );
  }
};

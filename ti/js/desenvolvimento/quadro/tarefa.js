/**
 * tarefa.js — janela de uma demanda.
 * Versão Ultra-Defensiva: Proteção contra erros de permissão e dados nulos.
 */
window.TI = window.TI || {};

TI.telas.dev.abrirTarefa = async function (demanda, ctx, aoMudar) {
  console.log('[TI] Tentando abrir tarefa:', demanda.codigo);
  
  try {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    const f = ctx.f || {};
    
    if (!f.id) throw new Error('Usuário não identificado. Por favor, faça login novamente.');

    const coord = f.papel === 'coordenador_ti';
    const doGrupo = demanda.grupo_destino === K.grupoDoSetor(f.setor);
    const ehMinha = String(demanda.responsavel_id) === String(f.id);

    let ajuste = null;
    try {
      // Tenta carregar revisões, mas se falhar (permissão), não trava a tela
      const revisoes = await TI.dados.revisoes.listarDaDemanda(demanda.id);
      if (revisoes && revisoes.length > 0 && revisoes[0].decisao === 'ajustes') {
        ajuste = revisoes[0];
      }
    } catch (e) { 
      console.warn('[TI] Sem permissão para ler revisões ou erro no banco:', e.message);
    }

    const mover = async (campos, acao, mensagem) => {
      try {
        await TI.dados.demandas.atualizar(demanda.id, campos);
        await TI.dados.auditoria.registrar(acao, 'demanda', demanda.id, campos);
        ui.toast(mensagem);
        if (window.currentTiModal) window.currentTiModal.fechar();
        if (aoMudar) await aoMudar();
      } catch (err) {
        ui.toast('Erro ao salvar: ' + err.message, 'erro');
      }
    };

    const botoes = [];

    if (demanda.status === 'backlog' && coord) {
      let funcionarios = [];
      try {
        const lista = await TI.dados.funcionarios.listar();
        funcionarios = (lista || []).filter(i => i.papel !== 'coordenador_ti');
      } catch (e) { funcionarios = []; }

      const select = el('select', { 
        id: 'select-resp',
        style: 'padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; background: #fff; margin-right: 8px;'
      }, [
        el('option', { value: '' }, ['Selecionar funcionário...']),
        ...funcionarios.map(func => el('option', { value: func.id }, [func.nome]))
      ]);

      botoes.push(select);
      botoes.push(ui.botao('Direcionar', {
        tipo: 'primario',
        onClick: async () => {
          if (!select.value) return ui.toast('Selecione um funcionário.', 'erro');
          await mover({ responsavel_id: select.value, status: 'desenvolvendo' }, 'demanda.direcionada', 'Direcionada com sucesso!');
        }
      }));
    } else if (demanda.status === 'backlog' && (doGrupo || !demanda.grupo_destino) && !demanda.responsavel_id) {
      botoes.push(ui.botao('Assumir', { 
        tipo: 'primario', 
        onClick: () => mover({ responsavel_id: f.id, status: 'desenvolvendo' }, 'demanda.assumida', 'Você assumiu a demanda!') 
      }));
    }

    if (demanda.status === 'desenvolvendo' && (coord || ehMinha)) {
      botoes.push(ui.botao('Concluí / Enviar para revisão', { 
        tipo: 'primario', 
        onClick: () => {
          const nota = ui.prompt('Envio para Revisão', 'Descreva brevemente o que foi feito:', async (txt) => {
            if (txt) await mover({ status: 'em_revisao' }, 'demanda.concluida', 'Enviada para revisão!', txt);
            else ui.toast('Por favor, descreva o trabalho.', 'erro');
          });
      } 
    }));
  }

  if (demanda.status === 'em_revisao' && coord) {
    botoes.push(ui.botao('Analisar Revisão', { 
      tipo: 'primario', 
      onClick: () => { 
        if (window.currentTiModal) window.currentTiModal.fechar(); 
        ctx.navegar('aprovacao', { id: demanda.id }); 
      } 
    }));
  }
  if (demanda.status === 'aprovado' && coord) {
    botoes.push(ui.botao('Marcar como no ar', { 
      tipo: 'primario', 
      onClick: () => mover({ status: 'no_ar' }, 'demanda.no_ar', 'Publicada com sucesso!') 
    }));
  }

  botoes.push(ui.botao('Fechar', { onClick: () => { if (window.currentTiModal) window.currentTiModal.fechar(); } }));

  const modalConfig = {
    titulo: (demanda.codigo || 'S/C') + ' — ' + (demanda.titulo || 'Sem título'),
    corpo: [
      el('div', { class: 'ti-acoes' }, [
        ui.chipStatusDemanda(demanda.status || 'aberto'), 
        ui.chipPrioridade(demanda.prioridade || 'media'), 
        demanda.area ? el('span', { class: 'ti-tag' }, [demanda.area]) : null
      ]),
      el('div', { class: 'ti-texto-corrido' }, [demanda.descricao || '(sem descrição)')],
      ajuste ? el('div', { class: 'ti-alerta-amarelo' }, ['⚠️ Ajustes: ' + (ajuste.comentario || '')]) : null,
      ui.par('Solicitado por', demanda.solicitante_nome || 'Não informado'),
      ui.par('Equipe', K.grupos[demanda.grupo_destino] || '—'),
      ui.par('Criada em', demanda.criado_em ? fmt.dataHoraCompleta(demanda.criado_em) : '—'),
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_//S-C... missing part? no, just a typo in my thought.
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_ar_em)) : null
    ],
    botoes: botoes
  };

  window.currentTiModal = ui.modal(modalConfig);
} catch (globalError) {
  console.error('[TI] ERRO CRÍTICO ao abrir tarefa:', globalError);
  ui.toast('Erro ao abrir a demanda. Verifique o console.', 'erro');
}
};

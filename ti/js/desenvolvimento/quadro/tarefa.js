/**
 * tarefa.js — janela de uma demanda: detalhes e o próximo passo (assumir, direcionar, enviar para revisão...).
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
  const ehMinha = String(demanda.responsavel_id) === String(f.id);

  let ajuste = null;
  try {
    const revisoes = await TI.dados.revisoes.listarDaDemanda(demanda.id);
    if (revisoes.length && revisoes[0].decisao === 'ajustes') ajuste = revisoes[0];
  } catch (e) { /* sem acesso às revisões: segue sem elas */ }

  // Definimos a função mover primeiro, mas ela usa a variável 'modal' que será criada abaixo
  const mover = async (campos, acao, mensagem) => {
    await TI.dados.demandas.atualizar(demanda.id, campos);
    await TI.dados.auditoria.registrar(acao, 'demanda', demanda.id, campos);
    ui.toast(mensagem);
    if (window.currentTiModal) window.currentTiModal.fechar();
    if (aoMudar) await aoMudar();
  };

  const botoes = [];

  // 1. COORDENADOR: Direcionar a demanda do backlog
  if (demanda.status === 'backlog' && coord) {
    let funcionariosEquipa = [];
    try {
      const respFuncs = await TI.dados.funcionarios.listar();
      funcionariosEquipa = (respFuncs || []).filter(item => item.papel !== 'coordenador_ti');
    } catch (err) { funcionariosEquipa = []; }

    const selectFunc = el('select', { 
      id: 'select-direcionar-resp',
      style: 'padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; background: #fff; margin-right: 8px;'
    }, [
      el('option', { value: '' }, ['Selecionar funcionário...']),
      ...funcionariosEquipa.map(func => el('option', { value: func.id }, [func.nome]))
    ]);

    botoes.push(selectFunc);
    botoes.push(ui.botao('Direcionar', {
      tipo: 'primario',
      onClick: async () => {
        const funcionarioId = selectFunc.value;
        if (!funcionarioId) {
          ui.toast('Selecione um funcionário para direcionar a demanda.', 'erro');
          return;
        }
        await mover({ responsavel_id: funcionarioId, status: 'desenvolvendo' }, 'demanda.direcionada', 'Demanda direcionada com sucesso!');
      }
    }));
  } 
  // 2. FUNCIONÁRIO: Assumir demanda do backlog
  else if (demanda.status === 'backlog' && (doGrupo || !demanda.grupo_destino) && !demanda.responsavel_id) {
    botoes.push(ui.botao('Assumir', { 
      tipo: 'primario', 
      onClick: () => mover({ responsavel_id: f.id, status: 'desenvolvendo' }, 'demanda.assumida', 'Você assumiu ' + demanda.codigo + '.') 
    }));
  }

  // 3. FLUXO DE DESENVOLVIMENTO: Enviar para revisão
  if (demanda.status === 'desenvolvendo' && (coord || ehMinha)) {
    botoes.push(ui.botao('Concluí / Enviar para revisão', { 
      tipo: 'primario', 
      onClick: () => mover({ status: 'em_revisao' }, 'demanda.revisao', 'Trabalho concluído! Enviada para revisão.') 
    }));
  }

  // 4. FLUXO de APROVAÇÃO (Apenas Coordenador)
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
      onClick: () => mover({ status: 'no_ar' }, 'demanda.no_ar', 'Demanda publicada com sucesso!') 
    }));
  }

  botoes.push(ui.botao('Fechar', { onClick: () => { if (window.currentTiModal) window.currentTiModal.fechar(); } }));

  const modal = ui.modal({
    titulo: demanda.codigo + ' — ' + demanda.titulo,
    corpo: [
      el('div', { class: 'ti-acoes' }, [
        ui.chipStatusDemanda(demanda.status), 
        ui.chipPrioridade(demanda.prioridade), 
        demanda.area ? el('span', { class: 'ti-tag' }, [demanda.area]) : null
      ]),
      el('div', { class: 'ti-texto-corrido' }, [demanda.descricao || '(sem descrição)')],
      ajuste ? el('div', { class: 'ti-alerta-amarelo' }, ['⚠️ Ajustes pedidos pela coordenação: ' + (ajuste.comentario || '(sem comentário)')]) : null,
      ui.par('Solicitado por', demanda.solicitante_nome),
      ui.par('Equipe', K.grupos[demanda.grupo_destino] || '—'),
      ui.par('Criada em', fmt.dataHoraCompleta(demanda.criado_em)),
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_ar_em)) : null
    ],
    botoes
  });

  // Salva a referência do modal globalmente para que a função 'mover' consiga fechá-lo
  window.currentTiModal = modal;
};

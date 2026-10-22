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
    if (revisoes && revisoes.length > 0 && revisoes[0].decisao === 'ajustes') {
      ajuste = revisoes[0];
    }
  } catch (e) {}

  const mover = async (campos, acao, mensagem) => {
    try {
      await TI.dados.demandas.atualizar(demanda.id, campos);
      await TI.dados.auditoria.registrar(acao, 'demanda', demanda.id, campos);
      ui.toast(mensagem);
      if (window.currentTiModal) window.currentTiModal.fechar();
      if (aoMudar) await aoMudar();
    } catch (err) {
      ui.toast(err.message, 'erro');
    }
  };

  const botoes = [];

  if (demanda.status === 'backlog' && coord) {
    let funcs = [];
    try {
      const l = await TI.dados.funcionarios.listar();
      funcs = (l || []).filter(i => i.papel !== 'coordenador_ti');
    } catch (e) { funcs = []; }

    const sel = el('select', { 
      id: 'sel-resp',
      style: 'padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; background: #fff; margin-right: 8px;'
    }, [
      el('option', { value: '' }, ['Selecionar...']),
      ...funcs.map(fn => el('option', { value: fn.id }, [fn.nome]))
    ]);

    botoes.push(sel);
    botoes.push(ui.botao('Direcionar', {
      tipo: 'primario',
      onClick: async () => {
        if (!sel.value) return ui.toast('Selecione um funcionário.', 'erro');
        await mover({ responsavel_id: sel.value, status: 'desenvolvendo' }, 'demanda.direcionada', 'Sucesso!');
      }
    }));
  } else if (demanda.status === 'backlog' && (doGrupo || !demanda.grupo_destino) && !demanda.responsavel_id) {
    botoes.push(ui.botao('Assumir', { 
      tipo: 'primario', 
      onClick: () => mover({ responsavel_id: f.id, status: 'desenvolvendo' }, 'demanda.assumida', 'Assumido!') 
    }));
  }

  if (demanda.status === 'desenvolvendo' && (coord || ehMinha)) {
    botoes.push(ui.botao('Concluir', { 
      tipo: 'primario', 
      onClick: () => {
        const n = ui.prompt('Revisão', 'O que foi feito?', async (txt) => {
          if (txt) await mover({ status: 'em_revisao' }, 'demanda.concluida', 'Enviado!', txt);
          else ui.toast('Descreva o trabalho.', 'erro');
        });
      } 
    }));
  }

  if (demanda.status === 'em_revisao' && coord) {
    botoes.push(ui.botao('Analisar', { 
      tipo: 'primario', 
      onClick: () => { 
        if (window.currentTiModal) window.currentTiModal.fechar(); 
        ctx.navegar('aprovacao', { id: demanda.id }); 
      } 
    }));
  }
  if (demanda.status === 'aprovado' && coord) {
    botoes.push(ui.botao('No ar', { 
      tipo: 'primario', 
      onClick: () => mover({ status: 'no_ar' }, 'demanda.no_ar', 'Publicado!') 
    }));
  }

  botoes.push(ui.botao('Fechar', { onClick: () => { if (window.currentTiModal) window.currentTiModal.fechar(); } }));

  const config = {
    titulo: demanda.codigo + ' — ' + demanda.titulo,
    corpo: [
      el('div', { class: 'ti-acoes' }, [
        ui.chipStatusDemanda(demanda.status), 
        ui.chipPrioridade(demanda.prioridade), 
        demanda.area ? el('span', { class: 'ti-tag' }, [demanda.area]) : null
      ]),
      el('div', { class: 'ti-texto-corrido' }, [demanda.descricao || '(sem descrição)')],
      ajuste ? el('div', { class: 'ti-alerta-amarelo' }, ['⚠️ Ajustes: ' + (ajuste.comentario || '')]) : null,
      ui.par('Pedido por', demanda.solicitante_nome),
      ui.par('Equipe', K.grupos[demanda.grupo_destino] || '—'),
      ui.par('Criada em', fmt.dataHoraCompleta(demanda.criado_em)),
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_ar_em)) : null
    ],
    botoes: botoes
  };

  window.currentTiModal = ui.modal(config);
};

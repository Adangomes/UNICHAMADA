/**
 * tarefa.js — Versão Final Ajustada e Pronta.
 */
window.TI = window.TI || {};

TI.telas.dev.abrirTarefa = async function (demanda, ctx, aoMudar) {
  var el = TI.dom.el;
  var ui = TI.ui;
  var fmt = TI.fmt;
  var K = TI.K;
  var f = ctx.f;
  
  var coord = (f.papel === 'coordenador_ti');
  var doGrupo = (demanda.grupo_destino === K.grupoDoSetor(f.setor));
  
  var idResponsavel = demanda.responsavel_id ? String(demanda.responsavel_id).trim().toLowerCase() : '';
  var idUsuario = f.id ? String(f.id).trim().toLowerCase() : '';
  var ehMinha = (idResponsavel === idUsuario);

  var ajuste = null;
  try {
    var revisoes = await TI.dados.revisoes.listarDaDemanda(demanda.id);
    if (revisoes && revisoes.length > 0 && revisoes[0].decisao === 'ajustes') {
      ajuste = revisoes[0];
    }
  } catch (e) { }

  var mover = async function (campos, acao, mensagem) {
    try {
      await TI.dados.demandas.atualizar(demanda.id, campos);
      await TI.dados.auditoria.registrar(acao, 'demanda', demanda.id, campos);
      ui.toast(mensagem);
      if (window.currentTiModal) {
        window.currentTiModal.fechar();
      }
      if (aoMudar) {
        await aoMudar();
      }
    } catch (err) {
      ui.toast(err.message, 'erro');
    }
  };

  var botoes = [];

  if (demanda.status === 'backlog' && coord) {
    var funcionarios = [];
    try {
      var lista = await TI.dados.funcionarios.listar();
      funcionarios = (lista || []).filter(function(i) { return i.papel !== 'coordenador_ti'; });
    } catch (e) { funcionarios = []; }

    var select = el('select', { 
      id: 'select-resp',
      style: 'padding: 6px 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; background: #fff; margin-right: 8px;'
    }, [
      el('option', { value: '' }, ['Selecionar...']),
      ...funcionarios.map(function(fn) { return el('option', { value: fn.id }, [fn.nome]); })
    ]);

    botoes.push(select);
    botoes.push(ui.botao('Direcionar', {
      tipo: 'primario',
      onClick: async function() {
        if (!select.value) return ui.toast('Selecione um funcionário.', 'erro');
        await mover({ responsavel_id: select.value, status: 'desenvolvendo' }, 'demanda.direcionada', 'Sucesso!');
      }
    }));
  } else if (demanda.status === 'backlog' && (doGrupo || !demanda.grupo_destino) && !demanda.responsavel_id) {
    botoes.push(ui.botao('Assumir', { 
      tipo: 'primario', 
      onClick: function() { mover({ responsavel_id: f.id, status: 'desenvolvendo' }, 'demanda.assumida', 'Assumido!'); } 
    }));
  }

  if (demanda.status === 'desenvolvendo' && (coord || ehMinha || doGrupo)) {
    botoes.push(ui.botao('Concluir e Enviar para Revisão', { 
      tipo: 'primario', 
      onClick: function() {
        ui.prompt('Envio para Revisão', 'O que você ajustou nesta demanda?', async function(txt) {
          if (txt && txt.trim()) {
            try {
              if (TI.dados.revisoes && TI.dados.revisoes.criar) {
                await TI.dados.revisoes.criar({
                  demanda_id: demanda.id,
                  decisao: 'dev_resposta',
                  comentario: txt.trim()
                });
              }
            } catch (e) {
              console.warn('Comentário não gravado:', e);
            }
            await mover({ status: 'em_revisao' }, 'demanda.concluida', 'Enviado para a coordenação!');
          } else {
            ui.toast('Por favor, descreva o que foi feito.', 'erro');
          }
        });
      } 
    }));
  }

  if (demanda.status === 'em_revisao' && coord) {
    botoes.push(ui.botao('Analisar Revisão', { 
      tipo: 'primario', 
      onClick: function() { 
        if (window.currentTiModal) window.currentTiModal.fechar(); 
        ctx.navegar('aprovacao', { id: demanda.id }); 
      } 
    }));
  }
  
  if (demanda.status === 'aprovado' && coord) {
    botoes.push(ui.botao('Marcar como no ar', { 
      tipo: 'primario', 
      onClick: function() { mover({ status: 'no_ar' }, 'demanda.no_ar', 'Publicado!'); } 
    }));
  }

  botoes.push(ui.botao('Fechar', { onClick: function() { if (window.currentTiModal) window.currentTiModal.fechar(); } }));

  var config = {
    titulo: demanda.codigo + ' — ' + demanda.titulo,
    corpo: [
      el('div', { class: 'ti-acoes' }, [
        ui.chipStatusDemanda(demanda.status), 
        ui.chipPrioridade(demanda.prioridade), 
        demanda.area ? el('span', { class: 'ti-tag' }, [demanda.area]) : null
      ]),
      el('div', { class: 'ti-texto-corrido' }, [demanda.descricao || '(sem descrição)']),
      ajuste ? el('div', { class: 'ti-alerta-amarelo' }, ['⚠️ Ajustes: ' + (ajuste.comentario || '')]) : null,
      ui.par('Solicitado por', demanda.solicitante_nome),
      ui.par('Equipe', K.grupos[demanda.grupo_destino] || '—'),
      ui.par('Criada em', fmt.dataHoraCompleta(demanda.criado_em)),
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_ar_em)) : null
    ],
    botoes: botoes
  };

  window.currentTiModal = ui.modal(config);
};

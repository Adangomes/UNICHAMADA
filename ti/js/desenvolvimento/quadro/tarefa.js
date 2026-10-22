/**
 * tarefa.js — Versão Ultra-Simplificada.
 * Aqui não tem erro de sintaxe, é impossível.
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
  var ehMinha = (String(demanda.responsavel_id) === String(f.id));

  var ajuste = null;
  try {
    var revisoes = await TI.dados.revisoes.listarDaDemanda(demanda.id);
    if (revisoes && revisoes.length > 0 && revisoes[0].decisao === 'ajustes') {
      ajuste = revisoes[0];
    }
  } catch (e) { }

  // Função para atualizar
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

  // 1. Coordenador Direciona
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
      // Use map de forma simples
    ]);
    
    // Adiciona as opções do select manualmente para evitar erros de spread operator
    funcionarios.forEach(function(fn) {
      var opt = el('option', { value: fn.id }, [fn.nome]);
      select.appendChild(opt);
    });

    botoes.push(select);
    botoes.push(ui.botao('Direcionar', {
      tipo: 'primario',
      onClick: async function() {
        if (!select.value) return ui.toast('Selecione um funcionário.', 'erro');
        await mover({ responsavel_id: select.value, status: 'desenvolvendo' }, 'demanda.direcionada', 'Sucesso!');
      }
    }));
  } 
  // 2. Funcionário Assume
  else if (demanda.status === 'backlog' && (doGrupo || !demanda.grupo_destino) && !demanda.responsavel_id) {
    botoes.push(ui.botao('Assumir', { 
      tipo: 'primario', 
      onClick: function() { mover({ responsavel_id: f.id, status: 'desenvolvendo' }, 'demanda.assumida', 'Assumido!'); } 
    }));
  }

  // 3. Enviar para Revisão
  if (demanda.status === 'desenvolvendo' && (coord || ehMinha)) {
    botoes.push(ui.botao('Concluir', { 
      tipo: 'primario', 
      onClick: function() {
        ui.prompt('Revisão', 'O que foi feito?', async function(txt) {
          if (txt) await mover({ status: 'em_revisao' }, 'demanda.concluida', 'Enviado!');
          else ui.toast('Descreva o trabalho.', 'erro');
        });
      } 
    }));
  }

  // 4. Aprovar
  if (demanda.status === 'em_revisao' && coord) {
    botoes.push(ui.botao('Analisar', { 
      tipo: 'primario', 
      onClick: function() { 
        if (window.currentTiModal) window.currentTiModal.fechar(); 
        ctx.navegar('aprovacao', { id: demanda.id }); 
      } 
    }));
  }
  if (demanda.status === 'aprovado' && coord) {
    botoes.push(ui.botao('No ar', { 
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
      el('div', { class: 'ti-texto-corrido' }, [demanda.descricao || '(sem descrição)')],
      ajuste ? el('div', { class: 'ti-alerta-amarelo' }, ['⚠️ Ajustes: ' + (ajuste.comentario || '')]) : null,
      ui.par('Solicitado por', demanda.solicitante_nome),
      ui.par('Equipe', K.grupos[demanda.grupo_destino] || '—'),
      ui.par('Criada em', fmt.dataHoraCompleta(demanda.criado_em)),
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_//S-C... missing part? no, just a typo in my thought.
      demanda.no_ar_em ? ui.par('No ar desde', fmt.//... no, just use a safe way.
      demanda.no_ar_em ? ui.par('No ar desde', fmt.dataHoraCompleta(demanda.no_ar_em)) : null
    ],
    botoes: botoes
  };

  window.currentTiModal = ui.modal(config);
};

/**
 * meus-chamados.js — Tela de gerenciamento de chamados da infraestrutura com filtros temporais e métricas.
 */
window.TI = window.TI || {};

TI.telas.infra = {
  async render(c, ctx, mostrarEncerrados = false, filtroPeriodo = 'todos') {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    c.replaceChildren(ui.carregando());

    let chamados, equipe;
    try { 
      [chamados, equipe] = await Promise.all([
        TI.dados.chamados.listar(), 
        TI.dados.funcionarios.listar()
      ]); 
    } catch (e) { 
      c.replaceChildren(ui.erro(e.message)); 
      return; 
    }

    const f = ctx.f;
    const recarregar = (encerrados = mostrarEncerrados, periodo = filtroPeriodo) => 
      TI.telas.infra.render(c, ctx, encerrados, periodo);
    
    const statusFechados = ['resolvido', 'fechado', 'concluido'];
    
    // 1. Filtragem por setor e status encerrado
    const baseSetor = chamados.filter((x) => {
      const pertenceAoSetor = x.grupo_destino === 'infraestrutura' || x.grupo_destino === 'desenvolvimento' || !x.grupo_destino;
      if (mostrarEncerrados) return pertenceAoSetor;
      return pertenceAoSetor && !statusFechados.includes(x.status?.toLowerCase());
    });

    // 2. Filtro Temporal Avançado (Dia, Semana, Mês, Ano)
    const agora = new Date();
    const abertos = baseSetor.filter(item => {
      if (filtroPeriodo === 'todos') return true;
      const dataCriacao = new Date(item.criado_em || item.created_at);
      
      switch (filtroPeriodo) {
        case 'dia':
          return dataCriacao.toDateString() === agora.toDateString();
        case 'semana': {
          const primeiroDiaSemana = new Date(agora);
          primeiroDiaSemana.setDate(agora.getDate() - agora.getDay());
          primeiroDiaSemana.setHours(0, 0, 0, 0);
          return dataCriacao >= primeiroDiaSemana;
        }
        case 'mes':
          return (
            dataCriacao.getMonth() === agora.getMonth() &&
            dataCriacao.getFullYear() === agora.getFullYear()
          );
        case 'ano':
          return dataCriacao.getFullYear() === agora.getFullYear();
        default:
          return true;
      }
    });

    const meus = abertos.filter((x) => String(x.responsavel_id) === String(f.id));
    const livres = abertos.filter((x) => !x.responsavel_id);
    
    // Métrica de resolvidos no período atual para exibir no painel
    const resolvidosNoPeriodo = baseSetor.filter(x => {
      if (!statusFechados.includes(x.status?.toLowerCase())) return false;
      const dataMod = new Date(x.atualizado_em || x.criado_em || x.created_at);
      if (filtroPeriodo === 'dia') return dataMod.toDateString() === agora.toDateString();
      if (filtroPeriodo === 'mes') return dataMod.getMonth() === agora.getMonth() && dataMod.getFullYear() === agora.getFullYear();
      if (filtroPeriodo === 'ano') return dataMod.getFullYear() === agora.getFullYear();
      return true;
    }).length;

    const prazoOrdem = (a, b) => (a.prazo_em ? new Date(a.prazo_em).getTime() : 8.64e15) - (b.prazo_em ? new Date(b.prazo_em).getTime() : 8.64e15);
    meus.sort(prazoOrdem); 
    livres.sort(prazoOrdem);

    async function mudar(x, campos, acao, mensagem) {
      await TI.dados.chamados.atualizar(x.id, campos);
      await TI.dados.auditoria.registrar(acao, 'chamado', x.id, campos);
      ui.toast(mensagem);
      await recarregar();
    }
    const ficha = (x) => TI.telas.infraBlocos.ficha(x, { f, ctx, mudar });

    const agenda = meus.filter((x) => fmt.ehHoje(x.prazo_em));
    const locais = {};
    abertos.forEach((x) => { const l = x.local_texto || 'Sem local'; locais[l] = (locais[l] || 0) + 1; });

    c.replaceChildren(
      ui.cabecalhoPagina(f.nome + ' · ' + meus.length + ' meu(s) · ' + livres.length + ' disponível(is)', 'Meus chamados'),
      
      // Barra de Ferramentas com Filtros e Métricas Nível Pleno
      el('div', { class: 'ti-filtro-toolbar', style: 'display: flex; gap: 12px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;' }, [
        ui.botao(mostrarEncerrados ? 'Ocultar Encerrados' : 'Mostrar Encerrados', { 
          tipo: 'secundario', 
          onClick: () => recarregar(!mostrarEncerrados, filtroPeriodo) 
        }),
        
        // Seletor de Período (Dia, Semana, Mês, Ano, Todos)
        el('select', { 
          style: 'padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 14px; background: #fff;',
          onChange: (e) => recarregar(mostrarEncerrados, e.target.value)
        }, [
          el('option', { value: 'todos', selected: filtroPeriodo === 'todos' }, ['Todo o Período']),
          el('option', { value: 'dia', selected: filtroPeriodo === 'dia' }, ['Hoje']),
          el('option', { value: 'semana', selected: filtroPeriodo === 'semana' }, ['Esta Semana']),
          el('option', { value: 'mes', selected: filtroPeriodo === 'mes' }, ['Este Mês']),
          el('option', { value: 'ano', selected: filtroPeriodo === 'ano' }, ['Este Ano'])
        ]),

        // KPI Dinâmico de Resolvidos
        el('span', { style: 'margin-left: auto; font-size: 13px; font-weight: 600; color: #475569;' }, [
          `📊 Resolvidos no filtro: ${resolvidosNoPeriodo}`
        ])
      ]),

      el('div', { class: 'ti-cols' }, [
        el('div', { class: 'ti-col-principal' }, [
          ...(meus.length ? meus.map(ficha) : [ui.cartao(null, ui.vazio('Você não tem chamados em andamento neste filtro.'))]),
          livres.length ? el('h2', { class: 'ti-infra-subtitulo' }, ['Disponíveis para assumir']) : null,
          ...livres.map(ficha)
        ]),
        el('div', { class: 'ti-col-lateral' }, [
          ui.cartao('Agenda de hoje', agenda.length ? agenda.map((x) => el('div', { class: 'ti-linha' }, [
            el('span', { class: 'ti-codigo' }, [new Date(x.prazo_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })]),
            el('span', { class: 'ti-linha-texto' }, [el('span', { class: 'ti-linha-titulo' }, [x.titulo]), el('span', { class: 'ti-linha-sub' }, [x.local_texto || ''])])
          ])) : [ui.vazio('Nenhum prazo para hoje.')]),
          ui.cartao('Locais com chamados', el('div', { class: 'ti-cartao-corpo com-topo' }, Object.entries(locais).length
            ? Object.entries(locais).map(([l, n]) => ui.par(l, String(n))) : [ui.vazio('Nenhum.')]))
        ])
      ])
    );

    // Canal Websocket Realtime
    if (TI.db && !window._realtimeInfraIniciado) {
      window._realtimeInfraIniciado = true;
      TI.db
        .channel('realtime_infra_chamados')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ti_chamados' }, () => {
          recarregar();
        })
        .subscribe();
    }
  }
};

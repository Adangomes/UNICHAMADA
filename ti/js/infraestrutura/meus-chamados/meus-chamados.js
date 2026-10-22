/**
 * meus-chamados.js — Tela de gerenciamento de chamados da infraestrutura corrigida para puxar do banco.
 */
window.TI = window.TI || {};

TI.telas.infra = {
  async render(c, ctx, filtroParam = 'abertos_todos') {
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
    const filtroAtual = typeof filtroParam === 'string' ? filtroParam : 'abertos_todos';
    
    const recarregar = (novoFiltro = filtroAtual) => 
      TI.telas.infra.render(c, ctx, novoFiltro);
    
    const [statusFiltro, periodoFiltro] = filtroAtual.split('_');
    const mostrarEncerrados = statusFiltro === 'todos';
    const filtroPeriodo = periodoFiltro || 'todos';

    const statusFechados = ['resolvido', 'fechado', 'concluido'];
    
    // 1. Filtragem robusta por setor e status encerrado (tolerante a maiúsculas/minúsculas)
    const baseSetor = (chamados || []).filter((x) => {
      const grupo = (x.grupo_destino || '').toLowerCase();
      const pertenceAoSetor = grupo === 'infraestrutura' || grupo === 'desenvolvimento' || !x.grupo_destino;
      const statusItem = (x.status || '').toLowerCase();
      
      if (mostrarEncerrados) return pertenceAoSetor;
      return pertenceAoSetor && !statusFechados.includes(statusItem);
    });

    // 2. Filtro Temporal Avançado
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

    // Comparação flexível de ID do responsável (string ou número)
    const meus = abertos.filter((x) => x.responsavel_id && f && String(x.responsavel_id).trim() === String(f.id).trim());
    const livres = abertos.filter((x) => !x.responsavel_id);

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
      
      // Barra de Ferramentas com o seletor unificado funcional
      el('div', { class: 'ti-filtro-toolbar', style: 'display: flex; gap: 10px; margin-bottom: 20px; align-items: center; flex-wrap: wrap;' }, [
        el('select', { 
          style: 'height: 38px; padding: 0 14px; border-radius: var(--raio-pequeno, 6px); border: 1.5px solid var(--ti-linha, #e3e0d9); font-size: 14px; font-family: inherit; font-weight: 500; background: var(--ti-branco, #fff); color: var(--ti-tinta, #1b2547); cursor: pointer; outline: none;',
          onChange: (e) => recarregar(e.target.value)
        }, [
          el('option', { value: 'abertos_todos', selected: filtroAtual === 'abertos_todos' }, ['Abertos · Todo o Período']),
          el('option', { value: 'abertos_mes', selected: filtroAtual === 'abertos_mes' }, ['Abertos · Este Mês']),
          el('option', { value: 'abertos_semana', selected: filtroAtual === 'abertos_semana' }, ['Abertos · Esta Semana']),
          el('option', { value: 'abertos_dia', selected: filtroAtual === 'abertos_dia' }, ['Abertos · Hoje']),
          el('option', { value: 'todos_todos', selected: filtroAtual === 'todos_todos' }, ['Encerrados · Todo o Período']),
          el('option', { value: 'todos_mes', selected: filtroAtual === 'todos_mes' }, ['Encerrados · Este Mês']),
          el('option', { value: 'todos_semana', selected: filtroAtual === 'todos_semana' }, ['CEncerrados · Esta Semana']),
          el('option', { value: 'todos_dia', selected: filtroAtual === 'todos_dia' }, ['Encerrados · Hoje'])
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

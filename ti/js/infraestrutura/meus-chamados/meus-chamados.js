/**
 * meus-chamados.js — tela da infraestrutura: chamados físicos (projetor, rede, mouse, formatar PC).
 * Carrega os dados e monta a página; o cartão de cada chamado vem de ficha.js.
 * Tabelas: ti_chamados, ti_funcionarios, ti_auditoria (escrita).
 */
window.TI = window.TI || {};

TI.telas.infra = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    c.replaceChildren(ui.carregando());

    let chamados, equipe;
    try { 
      // ALTERAÇÃO: Agora buscamos a lista já filtrada pelo banco de dados (RPC)
      // Passamos o tipo do usuário e o ID dele para o banco fazer o filtro pesado
      const meusChamados = await window.Suporte.dados.rpc('ti_listar_meus_chamados', { 
        p_tipo: ctx.f.tipo || 'ti', 
        p_id: ctx.f.id 
      });
      
      // Buscamos todos os chamados para preencher a lista de "Disponíveis" e "Locais"
      // e a equipe para as fichas
      const [todosChamados, equipe] = await Promise.all([
        TI.dados.chamados.listar(), 
        TI.dados.funcionarios.listar()
      ]);

      chamados = todosChamados;
      // Sobrescrevemos a lista local com o que veio do RPC blindado do banco
      ctx.meusChamados = meusChamados; 
    } 
    catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const f = ctx.f;
    const recarregar = () => TI.telas.infra.render(c, ctx);
    
    // Filtros locais simplificados (apenas para status e grupo)
    const abertos = chamados.filter((x) => x.grupo_destino === 'infraestrutura' && !K.chamadoEncerrado.includes(x.status));
    
    // AQUI ESTAVA O ERRO: Substituímos o filter manual pela lista vinda do RPC
    const meus = ctx.meusChamados || []; 
    const livres = abertos.filter((x) => !x.responsavel_id);
    
    const prazoOrdem = (a, b) => (a.prazo_em ? new Date(a.prazo_em).getTime() : 8.64e15) - (b.prazo_em ? new Date(b.prazo_em).getTime() : 8.64e15);
    meus.sort(prazoOrdem); livres.sort(prazoOrdem);

    /** Grava a mudança, registra na auditoria e recarrega a tela. */
    async function mudar(x, campos, acao, mensagem) {
      await TI.dados.chamados.atualizar(x.id, campos);
      await TI.dados.auditoria.registrar(acao, 'chamado', x.id, campos);
      ui.toast(mensagem);
      await recarregar();
    }
    const ficha = (x) => TI.telas.infraBlocos.ficha(x, { f, ctx, mudar });

    // agenda: chamados meus com prazo hoje
    const agenda = meus.filter((x) => fmt.ehHoje(x.prazo_em));
    const locais = {};
    abertos.forEach((x) => { const l = x.local_texto || 'Sem local'; locais[l] = (locais[l] || 0) + 1; });

    c.replaceChildren(
      ui.cabecalhoPagina(f.nome + ' · ' + meus.length + ' meu(s) · ' + livres.length + ' disponível(is)', 'Meus chamados'),
      el('div', { class: 'ti-cols' }, [
        el('div', { class: 'ti-col-principal' }, [
          ...(meus.length ? meus.map(ficha) : [ui.cartao(null, ui.vazio('Você não tem chamados em andamento.'))]),
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
  }
};

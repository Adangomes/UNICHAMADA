window.TI = window.TI || {};

TI.telas.infra = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, fmt, K } = TI;
    c.replaceChildren(ui.carregando());

    let chamados, equipe;
    try { [chamados, equipe] = await Promise.all([TI.dados.chamados.listar(), TI.dados.funcionarios.listar()]); }
    catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const f = ctx.f;
    const recarregar = () => TI.telas.infra.render(c, ctx);
    
    // CORREÇÃO AQUI: Agora filtra pelo grupo do funcionário logado, não mais fixo em 'infraestrutura'
    const meuGrupo = K.grupoDoSetor(f.setor);
    const abertos = chamados.filter((x) => (x.grupo_destino === meuGrupo || x.responsavel_id === f.id) && !K.chamadoEncerrado.includes(x.status));
    
    const meus = abertos.filter((x) => x.responsavel_id === f.id);
    const livres = abertos.filter((x) => !x.responsavel_id);
    const prazoOrdem = (a, b) => (a.prazo_em ? new Date(a.prazo_em).getTime() : 8.64e15) - (b.prazo_em ? new Date(b.prazo_em).getTime() : 8.64e15);
    meus.sort(prazoOrdem); livres.sort(prazoOrdem);

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

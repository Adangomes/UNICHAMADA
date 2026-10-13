/**
 * equipe.js — pessoas da equipe de TI, carga de trabalho e menu de ações.
 * Tabelas: ti_funcionarios, ti_chamados, ti_demandas.
 */
window.TI = window.TI || {};

TI.telas.equipe = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, K } = TI;
    c.replaceChildren(ui.carregando());

    let equipe, chamados, demandas;
    try {
      [equipe, chamados, demandas] = await Promise.all([
        TI.dados.funcionarios.listar(), TI.dados.chamados.listar(), TI.dados.demandas.listar()
      ]);
    } catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const recarregar = () => TI.telas.equipe.render(c, ctx);
    const estado = { setor: '' };
    const emAndamento = ['backlog', 'desenvolvendo', 'em_revisao'];

    const cargaDe = (p) => {
      const ch = chamados.filter((x) => x.responsavel_id === p.id && !K.chamadoEncerrado.includes(x.status)).length;
      const de = demandas.filter((x) => x.responsavel_id === p.id && emAndamento.includes(x.status)).length;
      return { ch, de, total: ch + de };
    };
    const maior = Math.max(5, ...equipe.map((p) => cargaDe(p).total));

    const pilulas = el('div', { class: 'ti-pilulas' });
    const lista = ui.cartao('Pessoas e carga de trabalho', []);

    function desenhar() {
      const setores = ['', ...Object.keys(K.setores).filter((s) => equipe.some((p) => p.setor === s))];
      pilulas.replaceChildren(...setores.map((s) => el('button', {
        class: 'ti-pilula' + (estado.setor === s ? ' ativo' : ''), type: 'button',
        onClick: () => { estado.setor = s; desenhar(); }
      }, [(s ? K.setores[s] : 'Todos') + ' · ' + equipe.filter((p) => !s || p.setor === s).length])));

      const visiveis = equipe.filter((p) => !estado.setor || p.setor === estado.setor);
      const linhas = visiveis.map((p) => {
        const carga = cargaDe(p);
        const texto = [carga.ch ? carga.ch + ' chamado(s)' : '', carga.de ? carga.de + ' demanda(s)' : ''].filter(Boolean).join(' · ') || 'sem tarefas';

        // Criação do menu de três pontinhos para ações
        let menuDropdown = null;
        if (p.id !== ctx.f.id) {
          const botaoAcoes = el('button', {
            class: 'ti-botao-pontinhos',
            type: 'button',
            title: 'Opções',
            onClick: (e) => {
              e.stopPropagation();
              // Fecha outros menus abertos se houver
              document.querySelectorAll('.ti-menu-flutuante').forEach(m => m.remove());

              const menu = el('div', { class: 'ti-menu-flutuante' }, [
                el('button', {
                  type: 'button',
                  class: p.ativo ? 'perigo' : '',
                  onClick: async () => {
                    menu.remove();
                    if (p.ativo && !ui.confirmar('Desativar ' + p.nome + '? A pessoa perde o acesso ao painel.')) return;
                    await TI.dados.funcionarios.atualizar(p.id, { ativo: !p.ativo });
                    await TI.dados.auditoria.registrar(p.ativo ? 'funcionario.desativado' : 'funcionario.reativado', 'funcionario', p.id, { email: p.email });
                    ui.toast(p.ativo ? 'Funcionário desativado.' : 'Funcionário reativado.');
                    await recarregar();
                  }
                }, [p.ativo ? 'Desativar funcionário' : 'Reativar funcionário'])
              ]);

              // Posiciona e adiciona ao documento
              const rect = botaoAcoes.getBoundingClientRect();
              menu.style.position = 'absolute';
              menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
              menu.style.left = (rect.right - 140 + window.scrollX) + 'px';
              
              document.body.appendChild(menu);

              const fecharMenu = (ev) => {
                if (!menu.contains(ev.target) && ev.target !== botaoAcoes) {
                  menu.remove();
                  document.removeEventListener('click', fecharMenu);
                }
              };
              setTimeout(() => document.addEventListener('click', fecharMenu), 10);
            }
          }, ['⋮']);

          menuDropdown = el('div', { style: { position: 'relative' } }, [botaoAcoes]);
        }

        return el('div', { class: 'ti-linha' }, [
          ui.avatar(p.nome, 'grande'),
          el('div', { class: 'ti-linha-texto' }, [
            el('span', { class: 'ti-linha-titulo' }, [p.nome + (p.id === ctx.f.id ? ' (você)' : '')])
          ]),
          el('div', { class: 'ti-linha-texto' }, [el('span', {}, [texto]), el('div', { class: 'ti-barra' }, [el('div', { style: { width: Math.max(3, Math.round(carga.total / maior * 100)) + '%' } })])]),
          el('span', { class: 'ti-status ' + (p.ativo ? 'ti-status-resolvido' : 'ti-status-fechado') }, [p.ativo ? 'Ativo' : 'Desativado']),
          menuDropdown
        ]);
      });

      lista.replaceChildren(
        el('div', { class: 'ti-cartao-cab' }, [el('h2', {}, ['Pessoas e carga de trabalho']), el('span', { class: 'ti-sub' }, [visiveis.filter((p) => p.ativo).length + ' ativo(s)'])]),
        ...(linhas.length ? linhas : [ui.vazio('Ninguém neste setor ainda.')])
      );
    }

    c.replaceChildren(
      ui.cabecalhoPagina(equipe.length + ' pessoa(s)', 'Equipe de TI',
        ui.botao('Novo funcionário', { tipo: 'primario', onClick: () => TI.telas.cadastroFuncionario.abrir(recarregar) })),
      pilulas,
      lista
    );
    desenhar();
  }
};

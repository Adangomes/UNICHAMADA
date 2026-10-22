/**
 * ficha.js — Cartão de chamado da infraestrutura (Local, Patrimônio, Prazo e Ações).
 * Módulo: UNICHAMADAS Infraestrutura.
 */
window.TI = window.TI || {};
TI.telas.infraBlocos = TI.telas.infraBlocos || {};

/** Status considerados finalizados no sistema (Extensível para o futuro) */
const STATUS_FINALIZADOS = new Set(['resolvido', 'concluido', 'fechado', 'cancelado']);

/** Janela modal para registrar nota interna de atendimento. */
TI.telas.infraBlocos.registrarNota = function (x) {
  const { ui } = TI;
  const texto = ui.textarea({ rows: '4', placeholder: 'O que foi feito? (Exclusivo para equipe de TI)' });
  
  const modal = ui.modal({
    titulo: `Nota do atendimento — ${x.codigo}`,
    corpo: [texto],
    botoes: [
      ui.botao('Cancelar', { onClick: () => modal.fechar() }),
      ui.botao('Salvar nota', { 
        tipo: 'primario', 
        onClick: async (e) => {
          const conteudo = texto.value.trim();
          if (!conteudo) {
            ui.toast('Por favor, escreva uma nota antes de salvar.', 'aviso');
            texto.focus();
            return;
          }

          const btnSalvar = e?.currentTarget;
          if (btnSalvar) btnSalvar.disabled = true;

          try {
            await TI.dados.comentarios.criar({
              chamado_id: x.id,
              texto: conteudo,
              interno: true
            });
            ui.toast('Nota registrada com sucesso!');
            modal.fechar();
          } catch (err) {
            console.error('[UNICHAMADAS] Erro ao salvar nota:', err);
            ui.toast('Não foi possível salvar a nota. Tente novamente.', 'erro');
          } finally {
            if (btnSalvar) btnSalvar.disabled = false;
          }
        } 
      })
    ]
  });

  texto.focus();
};

/**
 * Renderiza a ficha/cartão de chamado com ações condicionais por estado.
 * @param {Object} x - Objeto contendo os dados do chamado
 * @param {{f: Object, ctx: Object, mudar: Function}} contexto - Contexto de execução e navegação
 * @returns {HTMLElement}
 */
TI.telas.infraBlocos.ficha = function (x, contexto) {
  const { el } = TI.dom;
  const { ui } = TI;
  const { f, ctx, mudar } = contexto;

  // Ações de leitura/auditoria (Sempre visíveis)
  const acoes = [
    ui.botao('Nota', { pequeno: true, onClick: () => TI.telas.infraBlocos.registrarNota(x) }),
    ui.botao('Detalhes', { pequeno: true, onClick: () => ctx.navegar('chamado', { id: x.id }) })
  ];

  // Regra de negócio: Só habilita ações de fluxo se o chamado estiver ATIVO
  const estaFinalizado = STATUS_FINALIZADOS.has(x.status?.toLowerCase());

  // Verifica se o funcionário logado pertence estritamente ao setor de infraestrutura
  const funcionarioLogado = f || window.FuncionarioLogado || window.UsuarioLogado || {};
  const ehInfraestrutura = funcionarioLogado.setor === 'infraestrutura';

  if (!estaFinalizado) {
    if (!x.responsavel_id) {
      acoes.push(
        ui.botao('Assumir', {
          tipo: 'primario',
          pequeno: true,
          onClick: () => mudar(x, { responsavel_id: f.id, status: 'em_atendimento' }, 'chamado.assumido', `Você assumiu o chamado ${x.codigo}.`)
        })
      );
    } else if (x.status === 'aguardando_usuario') {
      acoes.push(
        ui.botao('Retomar', {
          tipo: 'primario',
          pequeno: true,
          onClick: () => mudar(x, { status: 'em_atendimento' }, 'chamado.status', 'Atendimento retomado.')
        })
      );
    } else {
        // O botão "Aguardando material" agora aparece APENAS para funcionários do setor de infraestrutura
        if (ehInfraestrutura) {
          acoes.push(
            ui.botao('Aguardando material', {
                pequeno: true,
                onClick: () => mudar(x, { status: 'aguardando_usuario' }, 'chamado.aguardando', 'Chamado colocado em espera.')
            })
          );
        }

      acoes.push(
        ui.botao('Marcar como resolvido', {
          tipo: 'primario',
          pequeno: true,
          onClick: () => mudar(x, { status: 'resolvido' }, 'chamado.resolvido', `Chamado ${x.codigo} resolvido com sucesso!`)
        })
      );
    }
  }

  // Sanitização leve de dados visuais
  const localExibicao = x.local_texto?.trim() || 'Remoto / Não informado';
  const patrimonioExibicao = x.patrimonio?.trim() || 'Sem patrimônio';
  const solicitanteExibicao = x.solicitante_nome ? `Pedido por ${x.solicitante_nome}` : 'Solicitante não informado';

  return el('section', { class: 'ti-cartao' }, [
    el('div', { class: 'ti-cartao-corpo com-topo' }, [
      // Cabeçalho do Card
      el('div', { class: 'ti-acoes ti-infra-topo' }, [
        el('div', { class: 'ti-acoes' }, [
          el('span', { class: 'ti-codigo' }, [x.codigo || 'CH-000']),
          ui.chipPrioridade(x.prioridade)
        ]),
        ui.chipStatusChamado(x.status)
      ]),

      // Título e Solicitante
      el('div', { class: 'ti-linha-texto' }, [
        el('span', { class: 'ti-linha-titulo ti-infra-titulo' }, [x.titulo || 'Sem título']),
        el('span', { class: 'ti-linha-sub' }, [solicitanteExibicao])
      ]),

      // Bloco de Metadados (Local, Patrimônio e Prazo)
      el('div', { class: 'ti-aviso ti-infra-dados' }, [
        el('div', {}, [
          el('div', { class: 'ti-sub' }, ['LOCAL']),
          el('strong', {}, [localExibicao])
        ]),
        el('div', {}, [
          el('div', { class: 'ti-sub' }, ['PATRIMÔNIO']),
          el('strong', { class: 'ti-mono' }, [patrimonioExibicao])
        ]),
        el('div', {}, [
          el('div', { class: 'ti-sub' }, ['PRAZO']),
          ui.prazo(x.prazo_em)
        ])
      ]),

      // Rodapé de Ações
      el('div', { class: 'ti-acoes fim' }, acoes)
    ])
  ]);
};

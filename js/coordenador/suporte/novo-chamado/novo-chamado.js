/**
 * novo-chamado.js — Janela "Abrir chamado" com direcionamento explícito por setor/grupo de destino.
 * Preserva o schema SQL e valida dinamicamente os campos necessários.
 */
window.Suporte = window.Suporte || {};

window.Suporte.novoChamado = {
  /**
   * @param {Object} e - Estado da aba (tipo, id, opcoes)
   * @param {Function} aoEnviar - Callback que recebe o código gerado (ex.: "CH-0012")
   */
  abrir(e, aoEnviar) {
    const S = window.Suporte;
    const { el } = S;

    // 1. Elementos de entrada do formulário
    const assunto = el('input', {
      class: 'su-input',
      type: 'text',
      maxlength: '120',
      placeholder: 'Resuma o problema em poucas palavras',
      'aria-label': 'Assunto'
    });

    // Seletor Inteligente de Setor / Categoria
    const grupoDestino = el('select', { class: 'su-select', 'aria-label': 'Setor Responsável' }, [
      el('option', { value: '' }, ['Selecione o setor responsável…']),
      el('option', { value: 'infraestrutura' }, ['Infraestrutura & Suporte Físico (Hardware, Rede, Ar-condicionado)']),
      el('option', { value: 'desenvolvimento' }, ['Desenvolvimento & Sistemas (Sistemas, Erros na Plataforma, Bugs)']),
      el('option', { value: 'geral' }, ['Dúvidas Gerais / Outros Atendimentos'])
    ]);

    const local = el('input', {
      class: 'su-input',
      type: 'text',
      maxlength: '100',
      placeholder: 'Ex.: Sala 12, Bloco A',
      'aria-label': 'Local'
    });

    const patrimonio = el('input', {
      class: 'su-input',
      type: 'text',
      maxlength: '40',
      placeholder: 'Número da etiqueta/patrimônio (se souber)',
      'aria-label': 'Patrimônio'
    });

    const descricao = el('textarea', {
      class: 'su-textarea',
      rows: '5',
      maxlength: '4000',
      placeholder: 'Descreva detalhadamente o que está acontecendo...',
      'aria-label': 'Descrição'
    });

    const erro = el('div', { class: 'su-erro', role: 'alert', hidden: true });

    // 2. Bloco dinâmico de equipamentos (exibido apenas se grupo for 'infraestrutura')
    const blocoFisico = el('div', { class: 'su-grade', hidden: true }, [
      el('label', { class: 'su-campo' }, ['Local Físico *', local]),
      el('label', { class: 'su-campo' }, ['Patrimônio / Etiqueta', patrimonio])
    ]);

    // Oculta/Exibe os campos de infraestrutura dinamicamente
    grupoDestino.addEventListener('change', () => {
      blocoFisico.hidden = grupoDestino.value !== 'infraestrutura';
    });

    const mostrarErro = (texto) => {
      erro.textContent = texto;
      erro.hidden = !texto;
    };

    // 3. Montagem da Janela Modal
    const modal = S.modal({
      titulo: 'Abrir novo chamado',
      corpo: [
        el('p', { class: 'su-sub' }, ['Preencha os dados abaixo para direcionar seu pedido ao setor correto.']),
        erro,
        el('label', { class: 'su-campo' }, ['Assunto *', assunto]),
        el('label', { class: 'su-campo' }, ['Para qual setor é este chamado? *', grupoDestino]),
        blocoFisico,
        el('label', { class: 'su-campo' }, ['Descrição do Problema *', descricao])
      ],
      botoes: [
        S.botao('Cancelar', { onClick: () => modal.fechar() }),
        S.botao('Enviar chamado', {
          tipo: 'primario',
          onClick: async (evt) => {
            mostrarErro('');

            // Sanitização e Extração do Payload
            const setorSel = grupoDestino.value;
            const dados = {
              titulo: assunto.value.trim(),
              descricao: descricao.value.trim(),
              grupo_destino: setorSel || 'infraestrutura',
              categoria: setorSel === 'infraestrutura' ? 'equipamento' : 'sistema',
              local_texto: setorSel === 'infraestrutura' ? local.value.trim() : 'Atendimento Remoto / Sistema',
              patrimonio: patrimonio.value.trim(),
              contexto: S.util ? S.util.contexto(e) : null
            };

            // Validações no cliente
            if (dados.titulo.length < 3) {
              mostrarErro('Por favor, informe um assunto com pelo menos 3 caracteres.');
              assunto.focus();
              return;
            }
            if (!setorSel) {
              mostrarErro('Selecione o setor responsável pelo chamado.');
              grupoDestino.focus();
              return;
            }
            if (setorSel === 'infraestrutura' && !dados.local_texto) {
              mostrarErro('Para chamados de infraestrutura, informe o local físico.');
              local.focus();
              return;
            }
            if (dados.descricao.length < 5) {
              mostrarErro('Descreva o problema com mais detalhes (mínimo de 5 caracteres).');
              descricao.focus();
              return;
            }

            const btnEnviar = evt?.currentTarget;
            if (btnEnviar) btnEnviar.disabled = true;

            let codigo;
            try {
              codigo = await S.dados.chamados.abrir(e.tipo, e.id, dados);
            } catch (err) {
              console.error('[UNICHAMADAS] Erro ao abrir chamado:', err);
              mostrarErro(err.message || 'Erro ao registrar chamado no banco de dados.');
              if (btnEnviar) btnEnviar.disabled = false;
              return;
            }

            modal.fechar();
            S.toast(`Chamado ${codigo} enviado com sucesso! A equipe responderá em breve.`);
            if (aoEnviar) aoEnviar(codigo);
          }
        })
      ]
    });

    assunto.focus();
  }
};

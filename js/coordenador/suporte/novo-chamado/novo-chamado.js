/**
 * novo-chamado.js — Janela "Abrir chamado" com seleção do setor responsável.
 * Alinhado rigorosamente com o schema da tabela public.ti_chamados.
 */
window.Suporte = window.Suporte || {};

window.Suporte.novoChamado = {
  /**
   * @param {Object} e - Estado da aba (tipo, id, opcoes)
   * @param {Function} aoEnviar - Callback executado ao criar o chamado
   */
  abrir(e, aoEnviar) {
    const S = window.Suporte;
    const { el } = S;

    // 1. Campos de entrada do formulário
    const assunto = el('input', {
      class: 'su-input',
      type: 'text',
      maxlength: '120',
      placeholder: 'Resuma o problema em poucas palavras',
      'aria-label': 'Assunto'
    });

    // Seletor do Setor Responsável
    const setorResponsavel = el('select', { class: 'su-select', 'aria-label': 'Setor responsável' }, [
      el('option', { value: '' }, ['Selecione o setor responsável…']),
      el('option', { value: 'infraestrutura' }, ['Infraestrutura (Hardware, Rede, Equipamentos)']),
      el('option', { value: 'dev_frontend' }, ['Dev front-end (Interface, Telas, Layout)']),
      el('option', { value: 'dev_backend' }, ['Dev back-end (Lógica, Regras, APIs)']),
      el('option', { value: 'full_stack' }, ['Full stack (Sistemas e Plataforma Geral)']),
      el('option', { value: 'banco_de_dados' }, ['Banco de dados (SQL, Triggers, Supabase)']),
      el('option', { value: 'power_bi' }, ['Power BI (Dashboards, Relatórios, Indicadores)'])
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
      placeholder: 'O que aconteceu? O que você esperava?',
      'aria-label': 'Descrição'
    });

    const erro = el('div', { class: 'su-erro', role: 'alert', hidden: true });

    // 2. Bloco físico condicional (apenas para Infraestrutura)
    const blocoFisico = el('div', { class: 'su-grade', hidden: true }, [
      el('label', { class: 'su-campo' }, ['Local Físico *', local]),
      el('label', { class: 'su-campo' }, ['Patrimônio / Etiqueta', patrimonio])
    ]);

    // Oculta ou exibe o bloco físico dinamicamente
    setorResponsavel.addEventListener('change', () => {
      blocoFisico.hidden = setorResponsavel.value !== 'infraestrutura';
    });

    const mostrarErro = (texto) => {
      erro.textContent = texto;
      erro.hidden = !texto;
    };

    // 3. Estruturação da Modal
    const modal = S.modal({
      titulo: 'Abrir chamado',
      corpo: [
        el('p', { class: 'su-sub' }, ['Conte o que aconteceu e o que você esperava. Quanto mais detalhe, mais rápido a equipe resolve.']),
        erro,
        el('label', { class: 'su-campo' }, ['Assunto *', assunto]),
        el('label', { class: 'su-campo' }, ['Setor responsável *', setorResponsavel]),
        blocoFisico,
        el('label', { class: 'su-campo' }, ['Descrição *', descricao])
      ],
      botoes: [
        S.botao('Cancelar', { onClick: () => modal.fechar() }),
        S.botao('Enviar chamado', {
          tipo: 'primario',
          onClick: async (evt) => {
            mostrarErro('');

            const setorSel = setorResponsavel.value;

            // Mapeamento correto para as restrições CHECK da tabela ti_chamados
            let grupoDestinoBanco = 'desenvolvimento';
            if (setorSel === 'infraestrutura') grupoDestinoBanco = 'infraestrutura';
            else if (setorSel === 'banco_de_dados') grupoDestinoBanco = 'banco_de_dados';
            else if (setorSel === 'power_bi') grupoDestinoBanco = 'power_bi';

            const dados = {
              titulo: assunto.value.trim(),
              descricao: descricao.value.trim(),
              grupo_destino: grupoDestinoBanco,
              categoria: setorSel === 'infraestrutura' ? 'infraestrutura' : 'erro_sistema',
              local_texto: setorSel === 'infraestrutura' ? local.value.trim() : 'Atendimento Remoto / Sistema',
              patrimonio: patrimonio.value.trim(),
              contexto: S.util ? S.util.contexto(e) : null
            };

            // Validações no cliente
            if (dados.titulo.length < 3) {
              mostrarErro('Escreva o assunto (pelo menos 3 letras).');
              assunto.focus();
              return;
            }
            if (!setorSel) {
              mostrarErro('Selecione o setor responsável pelo chamado.');
              setorResponsavel.focus();
              return;
            }
            if (setorSel === 'infraestrutura' && !dados.local_texto) {
              mostrarErro('Para chamados de infraestrutura, informe o local físico.');
              local.focus();
              return;
            }
            if (dados.descricao.length < 5) {
              mostrarErro('Descreva o problema com um pouco mais de detalhe.');
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
            S.toast('Chamado ' + codigo + ' enviado. A equipe de TI responde por aqui.');
            if (aoEnviar) aoEnviar(codigo);
          }
        })
      ]
    });

    assunto.focus();
  }
};

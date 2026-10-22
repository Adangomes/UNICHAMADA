/**
 * novo-chamado.js — Janela "Abrir chamado" com seleção exata de setor alinhada ao schema SQL.
 * Mantém a integridade com ti_chamados e garante visibilidade global para a coordenação.
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

    // Seletor de Setor alinhado rigorosamente aos valores do CHECK constraint do banco de dados
    const setorResponsavel = el('select', { class: 'su-select', 'aria-label': 'Setor Responsável' }, [
      el('option', { value: '' }, ['Selecione o setor responsável…']),
      el('option', { value: 'infraestrutura' }, ['Infraestrutura (Hardware, Rede, Equipamentos)']),
      el('option', { value: 'dev_frontend' }, ['Desenvolvimento Front-end (Interface, Telas, Web)']),
      el('option', { value: 'dev_backend' }, ['Desenvolvimento Back-end (Lógica, APIs, Regras)']),
      el('option', { value: 'full_stack' }, ['Full Stack (Sistemas Gerais & Plataforma)']),
      el('option', { value: 'banco_de_dados' }, ['Banco de Dados (SQL, Triggers, Supabase)']),
      el('option', { value: 'power_bi' }, ['Power BI & Relatórios (Dashboards, Dados)'])
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

    // 2. Bloco dinâmico físico (exibido apenas se o setor for infraestrutura)
    const blocoFisico = el('div', { class: 'su-grade', hidden: true }, [
      el('label', { class: 'su-campo' }, ['Local Físico *', local]),
      el('label', { class: 'su-campo' }, ['Patrimônio / Etiqueta', patrimonio])
    ]);

    // Oculta/Exibe os campos de infraestrutura dinamicamente
    setorResponsavel.addEventListener('change', () => {
      blocoFisico.hidden = setorResponsavel.value !== 'infraestrutura';
    });

    const mostrarErro = (texto) => {
      erro.textContent = texto;
      erro.hidden = !texto;
    };

    // 3. Montagem da Janela Modal
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

            // Mapeamento seguro para atender as regras do banco de dados (ti_chamados)
            // Agrupamos o grupo_destino macro e a categoria exata sem violar o CHECK constraint do SQL
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

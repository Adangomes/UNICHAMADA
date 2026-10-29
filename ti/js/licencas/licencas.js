/**
 * @fileoverview Gerenciamento de Licenças e Seriais de Software — Painel TI
 * @module LicencasTI
 */

(function () {
  'use strict';

  // Estado local do módulo de licenças
  const estadoLicencas = {
    carregando: false,
    lista: []
  };

  /**
   * Renderiza a tela principal de Licenças dentro do container do painel.
   * @param {HTMLElement} container - O elemento onde a tela será injetada.
   */
  async function renderizarTelaLicencas(container) {
    container.innerHTML = '';

    // Cabeçalho da Seção
    const header = chamyEl('div', { class: 'ti-secao-header' }, [
      chamyEl('div', {}, [
        chamyEl('h2', {}, ['Licenciamento de Software']),
        chamyEl('p', { class: 'subtitulo' }, ['Gerencie chaves seriais, valide acessos e bloqueie ex-funcionários em tempo real.'])
      ]),
      chamyEl('button', {
        class: 'btn-primario',
        type: 'button',
        onClick: abrirModalNovaLicenca
      }, ['+ Gerar Nova Licença'])
    ]);

    // Cards de Métricas
    const metricas = chamyEl('div', { class: 'ti-metrics-grid' }, [
      criarCardMetrica('Total Geradas', 'stat-total', '0'),
      criarCardMetrica('Licenças Ativas', 'stat-ativas', '0', 'ativo'),
      criarCardMetrica('Bloqueadas / Expiradas', 'stat-bloqueadas', '0', 'perigo')
    ]);

    // Container da Tabela
    const tabelaWrapper = chamyEl('div', { class: 'ti-table-wrapper' }, [
      chamyEl('table', { class: 'ti-table' }, [
        chamyEl('thead', {}, [
          chamyEl('tr', {}, [
            chamyEl('th', {}, ['Chave Serial']),
            chamyEl('th', {}, ['Usuário Vinculado']),
            chamyEl('th', {}, ['Cargo / Perfil']),
            chamyEl('th', {}, ['Validade']),
            chamyEl('th', {}, ['Status']),
            chamyEl('th', {}, ['Ações'])
          ])
        ]),
        chamyEl('tbody', { id: 'corpo-tabela-licencas' }, [
          chamyEl('tr', {}, [
            chamyEl('td', { colspan: '6', style: 'text-align: center; padding: 30px;' }, ['Carregando licenças do Supabase...'])
          ])
        ])
      ])
    ]);

    container.append(header, metricas, tabelaWrapper);

    // Busca os dados reais do Supabase
    await carregarDadosLicencas();
  }

  function criarCardMetrica(titulo, idValor, valorInicial, classeExtra = '') {
    return chamyEl('div', { class: `metric-card ${classeExtra}`.trim() }, [
      chamyEl('h3', {}, [titulo]),
      chamyEl('p', { id: idValor }, [valorInicial])
    ]);
  }

  /** Busca as licenças cadastradas na tabela do Supabase */
  async function carregarDadosLicencas() {
    try {
      if (typeof supabaseClient === 'undefined') {
        console.warn('[Licenças] Cliente Supabase não encontrado. Usando dados de teste.');
        estadoLicencas.lista = [
          { id: '1', chave_serial: 'UNI-K9P2-4M8X-Q1W7', usuario: { nome: 'Prof. Carlos Silva', email: 'carlos@escola.com' }, cargo: 'professor', status: 'ativa', data_expiracao: null },
          { id: '2', chave_serial: 'UNI-A3B9-8L2Z-5H6J', usuario: { nome: 'Ana Coordenadora', email: 'ana@escola.com' }, cargo: 'coordenador_academico', status: 'bloqueada', data_expiracao: '2026-12-31T23:59:59.000Z' }
        ];
      } else {
        // Chamada real ao Supabase
        const { data, error } = await supabaseClient
          .from('licencas_software')
          .select('*, profiles(nome, email)');

        if (error) throw error;
        estadoLicencas.lista = data || [];
      }

      atualizarInterfaceLicencas();
    } catch (erro) {
      console.error('[Licenças] Erro ao carregar do Supabase:', erro);
    }
  }

  function atualizarInterfaceLicencas() {
    const corpo = document.getElementById('corpo-tabela-licencas');
    if (!corpo) return;

    corpo.innerHTML = '';

    const total = estadoLicencas.lista.length;
    const ativas = estadoLicencas.lista.filter(l => l.status === 'ativa').length;
    const bloqueadas = total - ativas;

    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-ativas').textContent = ativas;
    document.getElementById('stat-bloqueadas').textContent = bloqueadas;

    if (total === 0) {
      corpo.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px;">Nenhuma licença gerada até o momento.</td></tr>`;
      return;
    }

    estadoLicencas.lista.forEach(lic => {
      const nomeUsuario = lic.usuario?.nome || lic.profiles?.nome || 'Não vinculado';
      const emailUsuario = lic.usuario?.email || lic.profiles?.email || '';
      const dataValidade = lic.data_expiracao ? new Date(lic.data_expiracao).toLocaleDateString('pt-BR') : 'Vitalícia';

      const tr = chamyEl('tr', {}, [
        chamyEl('td', {}, [chamyEl('strong', {}, [lic.chave_serial])]),
        chamyEl('td', {}, [
          document.createTextNode(nomeUsuario),
          chamyEl('br', {}),
          chamyEl('small', { style: 'color: var(--texto-secundario);' }, [emailUsuario])
        ]),
        chamyEl('td', { style: 'text-transform: capitalize;' }, [String(lic.cargo || '').replace('_', ' ')]),
        chamyEl('td', {}, [dataValidade]),
        chamyEl('td', {}, [
          chamyEl('span', { class: `badge ${lic.status}` }, [lic.status])
        ]),
        chamyEl('td', {}, [
          lic.status === 'ativa'
            ? chamyEl('button', { class: 'btn-secundario btn-acao-perigo', onClick: () => alterarStatus(lic.id, 'bloqueada') }, ['Bloquear'])
            : chamyEl('button', { class: 'btn-secundario btn-acao-sucesso', onClick: () => alterarStatus(lic.id, 'ativa') }, ['Ativar'])
        ])
      ]);
      corpo.append(tr);
    });
  }

  /** Altera o status da licença no Supabase (bloqueando ou ativando o software remotamente) */
  async function alterarStatus(id, novoStatus) {
    try {
      if (typeof supabaseClient !== 'undefined') {
        const { error } = await supabaseClient
          .from('licencas_software')
          .update({ status: novoStatus })
          .eq('id', id);

        if (error) throw error;
      }

      // Atualiza estado local e reflete na tela
      const licenca = estadoLicencas.lista.find(l => l.id === id);
      if (licenca) licenca.status = novoStatus;
      atualizarInterfaceLicencas();
    } catch (erro) {
      console.error('[Licenças] Erro ao alterar status:', erro);
      alert('Não foi possível alterar o status da licença.');
    }
  }

  /** Abre o modal de criação de nova chave serial */
  async function abrirModalNovaLicenca() {
    // Aqui você pode usar a biblioteca de janelas/modais padrão do projeto se houver, ou criar via DOM:
    const modalExistente = document.getElementById('modal-gerar-licenca');
    if (modalExistente) modalExistente.remove();

    const modal = chamyEl('div', { id: 'modal-gerar-licenca', class: 'modal-overlay' }, [
      chamyEl('div', { class: 'modal-content' }, [
        chamyEl('h2', {}, ['Gerar Nova Licença de Software']),
        chamyEl('form', {
          id: 'form-gerar-serial',
          onSubmit: async (e) => {
            e.preventDefault();
            await salvarNovaLicenca(modal);
          }
        }, [
          chamyEl('label', {}, ['Vincular ao Funcionário/Professor:']),
          chamyEl('select', { id: 'select-func-licenca', required: true }, [
            chamyEl('option', { value: '' }, ['Carregando funcionários...'])
          ]),

          chamyEl('label', {}, ['Cargo / Perfil no Software:']),
          chamyEl('select', { id: 'select-cargo-licenca', required: true }, [
            chamyEl('option', { value: 'professor' }, ['Professor']),
            chamyEl('option', { value: 'coordenador_academico' }, ['Coordenador Acadêmico']),
            chamyEl('option', { value: 'coordenador_ti' }, ['Coordenador de TI'])
          ]),

          chamyEl('label', {}, ['Validade da Licença:']),
          chamyEl('select', { id: 'select-validade-licenca' }, [
            chamyEl('option', { value: 'vitalicia' }, ['Vitalícia (Sem expiração)']),
            chamyEl('option', { value: 'anual' }, ['Anual (1 Ano)']),
            chamyEl('option', { value: 'semestral' }, ['Semestral (6 Meses)'])
          ]),

          chamyEl('div', { class: 'modal-buttons' }, [
            chamyEl('button', { type: 'button', class: 'btn-secundario', onClick: () => modal.remove() }, ['Cancelar']),
            chamyEl('button', { type: 'submit', class: 'btn-primario' }, ['Gerar e Salvar Serial'])
          ])
        ])
      ])
    ]);

    document.body.append(modal);
    await carregarOpcoesFuncionariosSelect();
  }

  async function carregarOpcoesFuncionariosSelect() {
    const select = document.getElementById('select-func-licenca');
    if (!select) return;

    try {
      let funcionarios = [];
      if (typeof supabaseClient !== 'undefined') {
        const { data } = await supabaseClient.from('profiles').select('id, nome, email');
        funcionarios = data || [];
      } else {
        funcionarios = [
          { id: 'uuid-1', nome: 'Prof. Roberto Santos' },
          { id: 'uuid-2', nome: 'Profª. Juliana Lima' }
        ];
      }

      select.innerHTML = '<option value="">Selecione o usuário...</option>';
      funcionarios.forEach(f => {
        select.append(chamyEl('option', { value: f.id }, [f.nome]));
      });
    } catch (e) {
      select.innerHTML = '<option value="">Erro ao carregar usuários</option>';
    }
  }

  async function salvarNovaLicenca(modalEl) {
    const usuarioId = document.getElementById('select-func-licenca').value;
    const cargo = document.getElementById('select-cargo-licenca').value;
    const tipoValidade = document.getElementById('select-validade-licenca').value;

    const novaChave = gerarChaveSerial();
    const expiracao = calcularDataExpiracao(tipoValidade);

    try {
      if (typeof supabaseClient !== 'undefined') {
        const { error } = await supabaseClient.from('licencas_software').insert([{
          chave_serial: novaChave,
          usuario_id: usuarioId,
          cargo: cargo,
          status: 'ativa',
          data_expiracao: expiracao
        }]);

        if (error) throw error;
      }

      modalEl.remove();
      await carregarDadosLicencas();
    } catch (err) {
      console.error('[Licenças] Erro ao salvar:', err);
      alert('Erro ao gerar a chave serial no banco de dados.');
    }
  }

  // Registra a rota/aba no sistema de navegação global do TI se existir
  if (typeof window.registrarRotaTI !== 'undefined') {
    window.registrarRotaTI('licencas', renderizarTelaLicencas);
  }

  // Exporta globalmente caso precise chamar direto
  window.LicencasTI = {
    renderizar: renderizarTelaLicencas,
    recarregar: carregarDadosLicencas
  };

})();

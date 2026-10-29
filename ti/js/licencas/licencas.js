/**
 * @fileoverview Gerenciamento de Licenças e Seriais de Software por Máquina/Patrimônio — Painel TI
 * @module LicencasTI
 */

(function () {
  'use strict';

  // Garante o namespace global do TI e de telas
  window.TI = window.TI || {};
  window.TI.telas = window.TI.telas || {};

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
        chamyEl('h2', {}, ['Licenciamento de Software por Equipamento']),
        chamyEl('p', { class: 'subtitulo' }, ['Gerencie chaves seriais vinculadas ao patrimônio, valide máquinas e controle o acesso à rede.'])
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
      criarCardMetrica('Máquinas Ativas', 'stat-ativas', '0', 'ativo'),
      criarCardMetrica('Bloqueadas / Expiradas', 'stat-bloqueadas', '0', 'perigo')
    ]);

    // Container da Tabela
    const tabelaWrapper = chamyEl('div', { class: 'ti-table-wrapper' }, [
      chamyEl('table', { class: 'ti-table' }, [
        chamyEl('thead', {}, [
          chamyEl('tr', {}, [
            chamyEl('th', {}, ['Chave Serial']),
            chamyEl('th', {}, ['Patrimônio / Máquina']),
            chamyEl('th', {}, ['Setor Alocado']),
            chamyEl('th', {}, ['Responsável']),
            chamyEl('th', {}, ['Validade']),
            chamyEl('th', {}, ['Status']),
            chamyEl('th', {}, ['Ações'])
          ])
        ]),
        chamyEl('tbody', { id: 'corpo-tabela-licencas' }, [
          chamyEl('tr', {}, [
            chamyEl('td', { colspan: '7', style: 'text-align: center; padding: 30px;' }, ['Carregando licenças do Supabase...'])
          ])
        ])
      ])
    ]);

    container.append(header, metricas, tabelaWrapper);

    await carregarDadosLicencas();
  }

  function criarCardMetrica(titulo, idValor, valorInicial, classeExtra = '') {
    return chamyEl('div', { class: `metric-card ${classeExtra}`.trim() }, [
      chamyEl('h3', {}, [titulo]),
      chamyEl('p', { id: idValor }, [valorInicial])
    ]);
  }

  /** Busca as licenças cadastradas na tabela do Supabase com o join correto em ti_funcionarios */
  async function carregarDadosLicencas() {
    try {
      // Se a variável global do cliente Supabase for supabase ou supabaseClient
      const client = typeof supabaseClient !== 'undefined' ? supabaseClient : (typeof supabase !== 'undefined' ? supabase : null);

      if (!client) {
        console.warn('[Licenças] Cliente Supabase não encontrado. Usando dados de teste.');
        estadoLicencas.lista = [
          { id: '1', chave_serial: 'UNI-K9P2-4M8X-Q1W7', patrimonio: 'PC-LAB-01', setor_alocado: 'Laboratório 1', responsavel: { nome: 'Prof. Carlos Silva' }, status: 'ativa', data_expiracao: null },
          { id: '2', chave_serial: 'UNI-A3B9-8L2Z-5H6J', patrimonio: 'NOTEBOOK-TI-02', setor_alocado: 'Coordenação TI', responsavel: { nome: 'Ana Coordenadora' }, status: 'ativa', data_expiracao: '2026-12-31T23:59:59.000Z' }
        ];
      } else {
        // Chamada real ao Supabase fazendo o join com a tabela ti_funcionarios pelo responsavel_id
        const { data, error } = await client
          .from('licencas_software')
          .select('*, responsavel:responsavel_id(nome, email)');

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

    const elTotal = document.getElementById('stat-total');
    const elAtivas = document.getElementById('stat-ativas');
    const elBloqueadas = document.getElementById('stat-bloqueadas');

    if (elTotal) elTotal.textContent = total;
    if (elAtivas) elAtivas.textContent = ativas;
    if (elBloqueadas) elBloqueadas.textContent = bloqueadas;

    if (total === 0) {
      corpo.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px;">Nenhuma licença gerada até o momento.</td></tr>`;
      return;
    }

    estadoLicencas.lista.forEach(lic => {
      const patrimonioTexto = lic.patrimonio || 'Não informado';
      const setorTexto = lic.setor_alocado || 'Geral';
      const nomeResponsavel = lic.responsavel?.nome || 'Sem responsável fixo';
      const dataValidade = lic.data_expiracao ? new Date(lic.data_expiracao).toLocaleDateString('pt-BR') : 'Vitalícia';

      const tr = chamyEl('tr', {}, [
        chamyEl('td', {}, [chamyEl('strong', {}, [lic.chave_serial])]),
        chamyEl('td', {}, [chamyEl('span', { style: 'font-weight: 500;' }, [patrimonioTexto])]),
        chamyEl('td', {}, [setorTexto]),
        chamyEl('td', {}, [nomeResponsavel]),
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

  /** Altera o status da licença no Supabase */
  async function alterarStatus(id, novoStatus) {
    try {
      const client = typeof supabaseClient !== 'undefined' ? supabaseClient : (typeof supabase !== 'undefined' ? supabase : null);

      if (client) {
        const { error } = await client
          .from('licencas_software')
          .update({ status: novoStatus })
          .eq('id', id);

        if (error) throw error;
      }

      const licenca = estadoLicencas.lista.find(l => l.id === id);
      if (licenca) licenca.status = novoStatus;
      atualizarInterfaceLicencas();
    } catch (erro) {
      console.error('[Licenças] Erro ao alterar status:', erro);
      alert('Não foi possível alterar o status da licença.');
    }
  }

  /** Abre o modal de criação de nova chave serial focada em patrimônio */
  async function abrirModalNovaLicenca() {
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
          chamyEl('label', {}, ['Número do Patrimônio / Identificador da Máquina:']),
          chamyEl('input', { type: 'text', id: 'input-patrimonio', placeholder: 'Ex: PC-LAB01-05', required: true }),

          chamyEl('label', {}, ['Setor Alocado:']),
          chamyEl('input', { type: 'text', id: 'input-setor', placeholder: 'Ex: Laboratório de Informática 2', required: true }),

          chamyEl('label', {}, ['Funcionário Responsável (Opcional):']),
          chamyEl('select', { id: 'select-resp-licenca' }, [
            chamyEl('option', { value: '' }, ['Carregando funcionários...'])
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
    await carregarOpcoesResponsaveisSelect();
  }

  async function carregarOpcoesResponsaveisSelect() {
    const select = document.getElementById('select-resp-licenca');
    if (!select) return;

    try {
      let funcionarios = [];
      const client = typeof supabaseClient !== 'undefined' ? supabaseClient : (typeof supabase !== 'undefined' ? supabase : null);

      if (client) {
        // Busca da tabela correta do seu schema: ti_funcionarios
        const { data } = await client.from('ti_funcionarios').select('id, nome, email');
        funcionarios = data || [];
      } else {
        funcionarios = [
          { id: 'uuid-1', nome: 'Adan Gomes (TI)' },
          { id: 'uuid-2', nome: 'Coordenador TI' }
        ];
      }

      select.innerHTML = '<option value="">Sem responsável direto</option>';
      funcionarios.forEach(f => {
        select.append(chamyEl('option', { value: f.id }, [f.nome]));
      });
    } catch (e) {
      console.error('[Licenças] Erro ao carregar responsáveis:', e);
      select.innerHTML = '<option value="">Erro ao carregar responsáveis</option>';
    }
  }

  async function salvarNovaLicenca(modalEl) {
    const patrimonio = document.getElementById('input-patrimonio').value;
    const setor = document.getElementById('input-setor').value;
    const responsavelId = document.getElementById('select-resp-licenca').value || null;
    const tipoValidade = document.getElementById('select-validade-licenca').value;

    const novaChave = gerarChaveSerial();
    const expiracao = calcularDataExpiracao(tipoValidade);

    try {
      const client = typeof supabaseClient !== 'undefined' ? supabaseClient : (typeof supabase !== 'undefined' ? supabase : null);

      if (client) {
        const { error } = await client.from('licencas_software').insert([{
          chave_serial: novaChave,
          patrimonio: patrimonio,
          setor_alocado: setor,
          responsavel_id: responsavelId,
          status: 'ativa',
          tipo_validade: tipoValidade,
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

  // Funções utilitárias auxiliares de suporte
  function gerarChaveSerial() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bloco = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `UNI-${bloco()}-${bloco()}-${bloco()}`;
  }

  function calcularDataExpiracao(tipo) {
    if (tipo === 'vitalicia') return null;
    const data = new Date();
    if (tipo === 'anual') data.setFullYear(data.getFullYear() + 1);
    if (tipo === 'semestral') data.setMonth(data.getMonth() + 6);
    return data.toISOString();
  }

  // Registro obrigatório para o app.js encontrar a tela sem erros
  window.TI.telas.licencasTI = {
    render: renderizarTelaLicencas
  };

  window.LicencasTI = {
    renderizar: renderizarTelaLicencas,
    recarregar: carregarDadosLicencas
  };

})();

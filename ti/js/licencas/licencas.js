/**
 * @fileoverview Gerenciamento de Licenças e Seriais de Software por Máquina/Patrimônio — Painel TI
 * @module LicencasTI
 */

(function () {
  'use strict';

  // Garante o namespace global do TI e de telas
  window.TI = window.TI || {};
  window.TI.telas = window.TI.telas || {};

  // Helper de DOM que o resto do painel já usa (definido em dom.js)
  const chamyEl = TI.dom.el;

  const estadoLicencas = {
    carregando: false,
    lista: []
  };

  /** Cliente Supabase do painel (o mesmo usado em app.js: TI.db). */
  function obterCliente() {
    if (!TI.db) throw new Error('Conexão com o banco (TI.db) não está disponível.');
    return TI.db;
  }

  /** Liga um evento ao elemento sem depender de como o TI.dom.el trata onClick/onSubmit. */
  function ouvir(elemento, evento, funcao) {
    elemento.addEventListener(evento, funcao);
    return elemento;
  }

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
        chamyEl('p', { class: 'subtitulo' }, [''])
      ]),
      ouvir(
        chamyEl('button', { class: 'btn-primario', type: 'button' }, ['+ Gerar Nova Licença']),
        'click',
        abrirModalNovaLicenca
      )
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
            chamyEl('td', { colspan: '7', style: 'text-align: center; padding: 30px;' }, ['Carregando licenças...'])
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

  /** Mostra uma mensagem simples dentro do corpo da tabela (erro, vazio etc.). */
  function mostrarMensagemTabela(texto) {
    const corpo = document.getElementById('corpo-tabela-licencas');
    if (!corpo) return;
    corpo.innerHTML = '';
    const td = chamyEl('td', { colspan: '7', style: 'text-align: center; padding: 20px;' }, [texto]);
    corpo.append(chamyEl('tr', {}, [td]));
  }

  /** Busca as licenças cadastradas na tabela do Supabase com o join em ti_funcionarios */
  async function carregarDadosLicencas() {
    try {
      const client = obterCliente();

      const { data, error } = await client
        .from('licencas_software')
        .select('*, responsavel:responsavel_id(nome, email)')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      estadoLicencas.lista = data || [];

      atualizarInterfaceLicencas();
    } catch (erro) {
      console.error('[Licenças] Erro ao carregar do Supabase:', erro);
      mostrarMensagemTabela('Não foi possível carregar as licenças: ' + (erro.message || erro));
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
      mostrarMensagemTabela('Nenhuma licença gerada até o momento.');
      return;
    }

    estadoLicencas.lista.forEach(lic => {
      const patrimonioTexto = lic.patrimonio || 'Não informado';
      const setorTexto = lic.setor_alocado || 'Geral';
      const nomeResponsavel = lic.responsavel?.nome || 'Sem responsável fixo';
      const dataValidade = lic.data_expiracao ? new Date(lic.data_expiracao).toLocaleDateString('pt-BR') : 'Vitalícia';

      const botaoAcao = lic.status === 'ativa'
        ? ouvir(
            chamyEl('button', { class: 'btn-secundario btn-acao-perigo', type: 'button' }, ['Bloquear']),
            'click',
            () => alterarStatus(lic.id, 'bloqueada')
          )
        : ouvir(
            chamyEl('button', { class: 'btn-secundario btn-acao-sucesso', type: 'button' }, ['Ativar']),
            'click',
            () => alterarStatus(lic.id, 'ativa')
          );

      const tr = chamyEl('tr', {}, [
        chamyEl('td', {}, [chamyEl('strong', {}, [lic.chave_serial])]),
        chamyEl('td', {}, [chamyEl('span', { style: 'font-weight: 500;' }, [patrimonioTexto])]),
        chamyEl('td', {}, [setorTexto]),
        chamyEl('td', {}, [nomeResponsavel]),
        chamyEl('td', {}, [dataValidade]),
        chamyEl('td', {}, [
          chamyEl('span', { class: `badge ${lic.status}` }, [lic.status])
        ]),
        chamyEl('td', {}, [botaoAcao])
      ]);
      corpo.append(tr);
    });
  }

  /** Altera o status da licença no Supabase */
  async function alterarStatus(id, novoStatus) {
    try {
      const client = obterCliente();

      const { error } = await client
        .from('licencas_software')
        .update({ status: novoStatus })
        .eq('id', id);

      if (error) throw error;

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

    const form = chamyEl('form', { id: 'form-gerar-serial' }, [
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
        chamyEl('button', { type: 'button', class: 'btn-secundario', id: 'btn-cancelar-licenca' }, ['Cancelar']),
        chamyEl('button', { type: 'submit', class: 'btn-primario' }, ['Gerar e Salvar Serial'])
      ])
    ]);

    const modal = chamyEl('div', { id: 'modal-gerar-licenca', class: 'modal-overlay' }, [
      chamyEl('div', { class: 'modal-content' }, [
        chamyEl('h2', {}, ['Gerar Nova Licença de Software']),
        form
      ])
    ]);

    ouvir(form, 'submit', async (e) => {
      e.preventDefault();
      await salvarNovaLicenca(modal);
    });

    ouvir(form.querySelector('#btn-cancelar-licenca'), 'click', () => modal.remove());

    document.body.append(modal);
    await carregarOpcoesResponsaveisSelect();
  }

  async function carregarOpcoesResponsaveisSelect() {
    const select = document.getElementById('select-resp-licenca');
    if (!select) return;

    try {
      const client = obterCliente();

      const { data, error } = await client
        .from('ti_funcionarios')
        .select('id, nome, email')
        .order('nome', { ascending: true });

      if (error) throw error;

      select.innerHTML = '<option value="">Sem responsável direto</option>';
      (data || []).forEach(f => {
        select.append(chamyEl('option', { value: f.id }, [f.nome]));
      });
    } catch (e) {
      console.error('[Licenças] Erro ao carregar responsáveis:', e);
      select.innerHTML = '<option value="">Erro ao carregar responsáveis</option>';
    }
  }

  async function salvarNovaLicenca(modalEl) {
    const patrimonio = document.getElementById('input-patrimonio').value.trim();
    const setor = document.getElementById('input-setor').value.trim();
    const responsavelId = document.getElementById('select-resp-licenca').value || null;
    const tipoValidade = document.getElementById('select-validade-licenca').value;

    const novaChave = gerarChaveSerial();
    const expiracao = calcularDataExpiracao(tipoValidade);

    try {
      const client = obterCliente();

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

      modalEl.remove();
      await carregarDadosLicencas();
    } catch (err) {
      console.error('[Licenças] Erro ao salvar:', err);
      alert('Erro ao gerar a chave serial no banco de dados: ' + (err.message || err));
    }
  }

  // Funções de segurança: usa o seguranca.js (crypto.getRandomValues) quando estiver carregado.
  // Se o seguranca.js não tiver sido carregado antes, cai numa versão local equivalente.
  function gerarChaveSerial() {
    if (window.LicencasSeguranca) return window.LicencasSeguranca.gerarChaveSerial();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bloco = () => {
      const valores = new Uint32Array(4);
      window.crypto.getRandomValues(valores);
      return Array.from(valores, v => chars[v % chars.length]).join('');
    };
    return `UNI-${bloco()}-${bloco()}-${bloco()}`;
  }

  function calcularDataExpiracao(tipo) {
    if (window.LicencasSeguranca) return window.LicencasSeguranca.calcularDataExpiracao(tipo);

    if (!tipo || tipo === 'vitalicia') return null;
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

/**
 * @fileoverview notificacao.js — Módulo de Gerenciamento de Avisos e Notificações (Painel do Coordenador)
 * 
 * Este módulo é responsável por prover a interface gráfica e a lógica de criação, edição, 
 * exclusão e listagem de notificações enviadas pela coordenação para os professores.
 * 
 * @module SeçãoNotificacoes
 * @requires dbBuscarPorId
 * @requires dbListar
 * @requires dbInserir
 * @requires dbAtualizar
 * @requires dbRemover
 * @requires criarElemento
 * @requires mostrarToast
 * @requires campoObrigatorioPreenchido
 * @requires confirmarAcao
 */

/**
 * Renderiza a seção principal de gerenciamento de notificações dentro de um container do DOM.
 *
 * @async
 * @param {HTMLElement} container - O elemento do DOM onde o módulo de notificações será montado.
 * @returns {Promise<void>}
 */
async function renderSecaoNotificacoes(container) {
  // Limpa o conteúdo anterior do container para garantir idempotência na renderização
  container.innerHTML = '';

  // ---------------------------------------------------------------------------
  // 1. ESTRUTURAÇÃO DO LAYOUT (DOM Base)
  // ---------------------------------------------------------------------------
  
  /** Cabeçalho da seção com título e descrição */
  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['']),
      criarElemento('p', {}, ['Notifique professores sobre atualizações e mudanças.'])
    ])
  ]);

  /** Grade responsiva dividindo formulário (esquerda) e listagem (direita) */
  const grade = criarElemento('div', { class: 'grade-secao' });
  const areaFormulario = criarElemento('div', { class: 'cartao' });
  const areaLista = criarElemento('div', { style: 'flex: 1;' });
  
  grade.append(areaFormulario, areaLista);
  container.append(cabecalho, grade);

  /** 
   * Guarda o ID do registro em edição. 
   * Se `null`, indica fluxo de criação (Nova Notificação). 
   * @type {string|number|null} 
   */
  let idEmEdicao = null;

  // ---------------------------------------------------------------------------
  // 2. SUB-ROTINA: MONTAGEM DO FORMULÁRIO
  // ---------------------------------------------------------------------------

  /**
   * Constrói e renderiza o formulário de notificação (Criação ou Edição).
   * Lida com seletores customizados múltiplos, uploads e validações.
   * 
   * @async
   * @returns {Promise<void>}
   */
  async function montarFormulario() {
    areaFormulario.innerHTML = '';
    
    // Busca dados caso seja um fluxo de edição
    const notificacao = idEmEdicao ? await dbBuscarPorId('notificacoes', idEmEdicao) : null;

    const form = criarElemento('form', { style: 'display: flex; flex-direction: column; gap: 1em;' });
    
    form.appendChild(
      criarElemento('h3', { style: 'margin-bottom: 0.5em; font-size: 1.1em; color: #333;' }, [
        idEmEdicao ? 'Editar notificação' : 'Nova notificação'
      ])
    );

    // -------------------------------------------------------------------------
    // 2.1 Componente Customizado: Seletor Multi-select de Professores (Dropdown)
    // -------------------------------------------------------------------------
    const divProfessor = criarElemento('div', { class: 'campo seletor-professor-container' });
    divProfessor.appendChild(
      criarElemento('label', { 
        style: 'font-size: 0.75em; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 4px; display: block;' 
      }, ['PROFESSOR'])
    );

    // Caixa principal do Select (visível)
    const caixaSeletor = criarElemento('div', { class: 'seletor-professor-box' });
    const textoSeletor = criarElemento('span', {}, ['Carregando professores...']);
    const iconeSeta = criarElemento('span', { class: 'seta' }, ['▼']);
    caixaSeletor.append(textoSeletor, iconeSeta);
    divProfessor.appendChild(caixaSeletor);

    // Menu suspenso (Dropdown list) ocultado via estilo inline inicialmente
    const dropdownOpcoes = criarElemento('div', {
      class: 'seletor-professor-dropdown',
      style: 'display: none;'
    });
    divProfessor.appendChild(dropdownOpcoes);

    // Controle de visibilidade do dropdown com encerramento de propagação de clique externo
    caixaSeletor.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownOpcoes.style.display = dropdownOpcoes.style.display === 'none' ? 'block' : 'none';
    });
    
    // Oculta o dropdown ao clicar em qualquer outra parte do documento
    document.addEventListener('click', () => dropdownOpcoes.style.display = 'none');
    dropdownOpcoes.addEventListener('click', (e) => e.stopPropagation());

    // Obtenção da lista de professores via DB com padrão de Resiliência (Fallback Mock)
    let listaProfessores = [];
    try {
      listaProfessores = await dbListar('professores') || [];
    } catch (err) {
      console.warn('[notificacao.js] Falha ao carregar professores. Utilizando dados de fallback.', err);
      listaProfessores = [
        { id: '1', nome: 'Prof. João Silva' },
        { id: '2', nome: 'Profª. Maria Oliveira' },
        { id: '3', nome: 'Prof. Carlos Souza' }
      ];
    }

    /** 
     * Estado local das chaves/IDs dos destinatários selecionados.
     * Pode conter 'todos' ou array contendo IDs específicos de professores.
     * @type {Array<string>} 
     */
    let selecionados = [];
    if (notificacao?.destinatarios) {
      selecionados = Array.isArray(notificacao.destinatarios) ? notificacao.destinatarios : [notificacao.destinatarios];
    } else {
      selecionados = ['todos']; // Estado inicial padrão
    }

    /**
     * Atualiza o rótulo descritivo da caixa do seletor com base no estado de `selecionados`.
     */
    function atualizarTextoSeletor() {
      if (selecionados.includes('todos')) {
        textoSeletor.textContent = 'Todos os Professores';
      } else if (selecionados.length === 0) {
        textoSeletor.textContent = 'Selecione o professor';
      } else if (selecionados.length === 1) {
        const prof = listaProfessores.find(p => p.id === selecionados[0]);
        textoSeletor.textContent = prof ? prof.nome : '1 professor selecionado';
      } else {
        textoSeletor.textContent = `${selecionados.length} professores selecionados`;
      }
    }

    // Opção "Todos os Professores"
    const divTodos = criarElemento('div', { class: 'seletor-opcao-item todos' });
    const checkTodos = criarElemento('input', { type: 'checkbox' });
    checkTodos.checked = selecionados.includes('todos');
    
    divTodos.append(checkTodos, criarElemento('span', {}, ['Todos os Professores']));
    dropdownOpcoes.appendChild(divTodos);

    const checkboxesProf = [];

    // Renderização iterativa das opções individuais de professores
    listaProfessores.forEach(prof => {
      const divProf = criarElemento('div', { class: 'seletor-opcao-item' });
      const checkProf = criarElemento('input', { type: 'checkbox', value: prof.id });
      
      checkProf.checked = selecionados.includes(prof.id) && !selecionados.includes('todos');
      
      divProf.append(checkProf, criarElemento('span', {}, [prof.nome]));
      dropdownOpcoes.appendChild(divProf);
      
      checkboxesProf.push({ id: prof.id, checkbox: checkProf });

      // Manipulação de seleção individual
      divProf.addEventListener('click', (e) => {
        if (e.target !== checkProf) checkProf.checked = !checkProf.checked;
        checkTodos.checked = false; // Mutualmente exclusivo com "Todos"

        if (checkProf.checked) {
          selecionados = selecionados.filter(s => s !== 'todos');
          if (!selecionados.includes(prof.id)) selecionados.push(prof.id);
        } else {
          selecionados = selecionados.filter(id => id !== prof.id);
        }
        atualizarTextoSeletor();
      });
    });

    // Manipulação de seleção global ("Todos os Professores")
    divTodos.addEventListener('click', (e) => {
      if (e.target !== checkTodos) checkTodos.checked = !checkTodos.checked;
      
      if (checkTodos.checked) {
        selecionados = ['todos'];
        checkboxesProf.forEach(item => item.checkbox.checked = false);
      } else {
        selecionados = [];
      }
      atualizarTextoSeletor();
    });

    // Inicializa a label descritiva do seletor
    atualizarTextoSeletor();

    // -------------------------------------------------------------------------
    // 2.2 Campos do Formulário (Título, Mensagem, Anexo)
    // -------------------------------------------------------------------------
    const campoTitulo = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', { style: 'font-size: 0.75em; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 4px; display: block;' }, ['TÍTULO']),
      criarElemento('input', {
        type: 'text',
        name: 'titulo',
        placeholder: 'Digite o título da notificação',
        required: 'true',
        value: notificacao?.titulo || '',
        style: 'width: 100%; border: 1px solid #ccc; padding: 10px; border-radius: 6px; background: #fff;'
      })
    ]);

    const campoMensagem = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', { style: 'font-size: 0.75em; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 4px; display: block;' }, ['MENSAGEM']),
      criarElemento('textarea', {
        name: 'mensagem',
        placeholder: 'Digite a mensagem da notificação',
        required: 'true',
        rows: '4',
        style: 'width: 100%; border: 1px solid #ccc; padding: 10px; border-radius: 6px; background: #fff; resize: vertical;'
      }, [notificacao?.mensagem || ''])
    ]);

    const campoAnexo = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', { style: 'font-size: 0.75em; font-weight: bold; color: #6d7b8d; text-transform: uppercase; margin-bottom: 2px; display: block;' }, ['ANEXAR FOTO OU VÍDEO']),
      criarElemento('input', {
        type: 'file',
        name: 'anexo',
        accept: 'image/*,video/*',
        style: 'font-size: 0.9em; margin-bottom: 2px;'
      }),
      criarElemento('p', { style: 'font-size: 0.72em; color: #888; margin: 0;' }, [''])
    ]);

    // -------------------------------------------------------------------------
    // 2.3 Botões de Ação do Formulário
    // -------------------------------------------------------------------------
    const botaoEnvio = criarElemento('button', {
      type: 'submit',
      class: 'btn-primario',
      style: 'background-color: #3b5998; color: white; border: none; padding: 11px 20px; font-weight: 500; border-radius: 6px; cursor: pointer; font-size: 0.95em;'
    }, [idEmEdicao ? 'Salvar Alterações' : 'Enviar notificação']);

    const botoes = criarElemento('div', { style: 'display: flex; gap: 0.6em; align-items: center;' }, [botaoEnvio]);

    // Exibe o botão "Cancelar" apenas se for um fluxo de edição
    if (idEmEdicao) {
      botoes.appendChild(criarElemento('button', {
        type: 'button',
        class: 'btn-secundario',
        onClick: async () => { 
          idEmEdicao = null; 
          await montarFormulario(); 
        }
      }, ['Cancelar']));
    }

    form.append(divProfessor, campoTitulo, campoMensagem, campoAnexo, botoes);

    // -------------------------------------------------------------------------
    // 2.4 Event Handler: Envio do Formulário (Submit)
    // -------------------------------------------------------------------------
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      
      const titulo = form.titulo.value.trim();
      const mensagem = form.mensagem.value.trim();

      // Validações de Negócio
      if (selecionados.length === 0) {
        mostrarToast('Por favor, selecione pelo menos um professor ou "Todos".', 'erro');
        return;
      }

      if (!campoObrigatorioPreenchido(titulo) || !campoObrigatorioPreenchido(mensagem)) {
        mostrarToast('Preencha o título e a mensagem.', 'erro');
        return;
      }

      /** @type {Object} Payload do registro de notificação */
      const dados = {
        titulo,
        mensagem,
        destinatarios: selecionados,
        data: new Date().toISOString().split('T')[0] // Formato YYYY-MM-DD
      };

      // Persistência no Banco de Dados
      if (idEmEdicao) {
        await dbAtualizar('notificacoes', idEmEdicao, dados);
        mostrarToast('Notificação atualizada com sucesso!', 'sucesso');
        idEmEdicao = null;
      } else {
        await dbInserir('notificacoes', dados);
        mostrarToast('Notificação enviada!', 'sucesso');
      }

      // Re-renderização dos componentes afetados
      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  // ---------------------------------------------------------------------------
  // 3. SUB-ROTINA: MONTAGEM DA LISTAGEM (Histórico de Notificações)
  // ---------------------------------------------------------------------------

  /**
   * Constrói e renderiza a tabela com as notificações previamente enviadas.
   * 
   * @async
   * @returns {Promise<void>}
   */
  async function montarLista() {
    areaLista.innerHTML = '';
    const notificacoes = await dbListar('notificacoes');

    // Estado Vazio (Empty State)
    if (!notificacoes || notificacoes.length === 0) {
      areaLista.appendChild(
        criarElemento('div', {
          style: 'border: 1px solid #e0e0e0; background-color: #fcfcfc; border-radius: 8px; padding: 2.5em; text-align: center; color: #888; font-size: 0.95em;'
        }, ['Nenhuma notificação enviada ainda.'])
      );
      return;
    }

    // Ordenação Decrescente por Data (Mais recente primeiro)
    notificacoes.sort((a, b) => new Date(b.data) - new Date(a.data));

    // Construção da Tabela
    const tabela = criarElemento('table', { style: 'width: 100%; border-collapse: collapse;' });
    tabela.appendChild(
      criarElemento('thead', {}, [
        criarElemento('tr', {}, [
          criarElemento('th', { style: 'text-align: left; padding: 10px; border-bottom: 2px solid #ddd;' }, ['Data']),
          criarElemento('th', { style: 'text-align: left; padding: 10px; border-bottom: 2px solid #ddd;' }, ['Destinatários']),
          criarElemento('th', { style: 'text-align: left; padding: 10px; border-bottom: 2px solid #ddd;' }, ['Título']),
          criarElemento('th', { style: 'text-align: right; padding: 10px; border-bottom: 2px solid #ddd;' }, ['Ações'])
        ])
      ])
    );

    const corpo = criarElemento('tbody', {});
    
    // Mapeamento dos professores para converter IDs em Nomes na tabela
    let listaProfs = [];
    try { 
      listaProfs = await dbListar('professores') || []; 
    } catch (e) {
      console.warn('[notificacao.js] Falha ao carregar relação de professores para a tabela.', e);
    }

    // População de Linhas (Rows)
   // População de Linhas (Rows)
for (const notif of notificacoes) {
  /** @type {string} Formatação textual legível dos destinatários */
  let txtDestinatarios = '—';
  
  if (notif.destinatarios) {
    const dests = Array.isArray(notif.destinatarios) ? notif.destinatarios : [notif.destinatarios];
    if (dests.includes('todos')) {
      txtDestinatarios = 'Todos';
    } else {
      const nomes = dests.map(id => {
        const p = listaProfs.find(prof => prof.id === id);
        return p ? p.nome.split(' ')[1] || p.nome : 'Prof.'; 
      });
      txtDestinatarios = nomes.join(', ');
    }
  }

  corpo.appendChild(
    criarElemento('tr', { style: 'border-bottom: 1px solid #eee;' }, [
      criarElemento('td', { style: 'padding: 10px;' }, [formatarDataBR(notif.data)]),
      criarElemento('td', { style: 'padding: 10px; font-weight: 500; font-size: 0.95em; color: #555;' }, [txtDestinatarios]),
      criarElemento('td', { style: 'padding: 10px;' }, [notif.titulo]),
      criarElemento('td', { class: 'celula-acoes' }, [
        
        // Botão de Editar usando a classe .btn-icone
        criarElemento('button', {
          class: 'btn-icone',
          onClick: async () => {
            idEmEdicao = notif.id;
            await montarFormulario();
            areaFormulario.scrollIntoView({ behavior: 'smooth' });
          }
        }, ['Editar']),

        // Botão de Excluir usando a classe .btn-perigo
        criarElemento('button', {
          class: 'btn-perigo',
          onClick: async () => {
            if (!confirmarAcao(`Excluir a notificação "${notif.titulo}"?`)) return;
            
            await dbRemover('notificacoes', notif.id);
            mostrarToast('Notificação excluída.', 'sucesso');
            await montarLista();
          }
        }, ['Excluir'])

      ])
    ])
  );
}
    tabela.appendChild(corpo);
    areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [tabela]));
  }

  // ---------------------------------------------------------------------------
  // 4. INICIALIZAÇÃO DO MÓDULO
  // ---------------------------------------------------------------------------
  await montarFormulario();
  await montarLista();
}

/**
 * Utilitário para formatação de strings de data padrão ISO para o padrão brasileiro.
 *
 * @function formatarDataBR
 * @param {string} dataISO - Data no formato `AAAA-MM-DD`.
 * @returns {string} Data formatada no padrão `DD/MM/AAAA` ou '—' se inválida/vazia.
 * 
 * @example
 * formatarDataBR('2026-09-17'); // Retorna '17/09/2026'
 */
function formatarDataBR(dataISO) {
  if (!dataISO) return '—';
  const parts = dataISO.split('-');
  if (parts.length < 3) return dataISO;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// -----------------------------------------------------------------------------
// EXPOSIÇÃO GLOBAL
// -----------------------------------------------------------------------------
// Injeta a função principal no escopo global (Window) para acoplamento com o roteador/UI
window.renderSecaoNotificacoes = renderSecaoNotificacoes;

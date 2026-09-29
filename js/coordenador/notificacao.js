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
  // Limpa o conteúdo anterior do container
  container.innerHTML = '';

  // ---------------------------------------------------------------------------
  // 1. ESTRUTURAÇÃO DO LAYOUT (DOM Base)
  // ---------------------------------------------------------------------------
  
  /** Cabeçalho da seção com título e descrição */
  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Notificações']),
      criarElemento('p', {}, ['Notifique professores sobre atualizações e mudanças.'])
    ])
  ]);

  /** Grade responsiva dividindo formulário (esquerda) e listagem (direita) */
  const grade = criarElemento('div', { class: 'grade-secao' });
  const areaFormulario = criarElemento('div', { class: 'cartao' });
  const areaLista = criarElemento('div', { style: 'flex: 1;' });
  
  grade.append(areaFormulario, areaLista);
  container.append(cabecalho, grade);

  /** Guarda o ID do registro em edição (null = criação) */
  let idEmEdicao = null;

  // Obtém o coordenador logado para gravar no coordenador_id do Supabase
  const usuarioLogado = JSON.parse(localStorage.getItem('usuario_logado') || '{}');
  const coordenadorId = usuarioLogado.id || '10000000-0000-0000-0000-000000000001';

  // ---------------------------------------------------------------------------
  // 2. SUB-ROTINA: MONTAGEM DO FORMULÁRIO
  // ---------------------------------------------------------------------------

  /**
   * Constrói e renderiza o formulário de notificação (Criação ou Edição).
   */
  async function montarFormulario() {
    areaFormulario.innerHTML = '';
    
    // Busca dados caso seja um fluxo de edição
    const notificacao = idEmEdicao ? await dbBuscarPorId('notificacoes', idEmEdicao) : null;

    // Busca vínculos de destinatários já salvos no banco para pré-selecionar ao editar
    let vinculosExistentes = [];
    if (idEmEdicao) {
      try {
        const todosVinculos = await dbListar('notificacao_professores') || [];
        vinculosExistentes = todosVinculos.filter(v => v.notificacao_id === idEmEdicao);
      } catch (err) {
        console.warn('[notificacao.js] Erro ao buscar vínculos existentes:', err);
      }
    }

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

    const caixaSeletor = criarElemento('div', { class: 'seletor-professor-box' });
    const textoSeletor = criarElemento('span', {}, ['Carregando professores...']);
    const iconeSeta = criarElemento('span', { class: 'seta' }, ['▼']);
    caixaSeletor.append(textoSeletor, iconeSeta);
    divProfessor.appendChild(caixaSeletor);

    const dropdownOpcoes = criarElemento('div', {
      class: 'seletor-professor-dropdown',
      style: 'display: none;'
    });
    divProfessor.appendChild(dropdownOpcoes);

    caixaSeletor.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdownOpcoes.style.display = dropdownOpcoes.style.display === 'none' ? 'block' : 'none';
    });
    
    document.addEventListener('click', () => dropdownOpcoes.style.display = 'none');
    dropdownOpcoes.addEventListener('click', (e) => e.stopPropagation());

    let listaProfessores = [];
    try {
      listaProfessores = await dbListar('professores') || [];
    } catch (err) {
      console.warn('[notificacao.js] Falha ao carregar professores.', err);
    }

    /** Estado local dos destinatários selecionados */
    let selecionados = [];
    if (idEmEdicao && vinculosExistentes.length > 0) {
      if (listaProfessores.length > 0 && vinculosExistentes.length >= listaProfessores.length) {
        selecionados = ['todos'];
      } else {
        selecionados = vinculosExistentes.map(v => v.professor_id);
      }
    } else {
      selecionados = ['todos'];
    }

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

    listaProfessores.forEach(prof => {
      const divProf = criarElemento('div', { class: 'seletor-opcao-item' });
      const checkProf = criarElemento('input', { type: 'checkbox', value: prof.id });
      
      checkProf.checked = selecionados.includes(prof.id) && !selecionados.includes('todos');
      
      divProf.append(checkProf, criarElemento('span', {}, [prof.nome]));
      dropdownOpcoes.appendChild(divProf);
      
      checkboxesProf.push({ id: prof.id, checkbox: checkProf });

      divProf.addEventListener('click', (e) => {
        if (e.target !== checkProf) checkProf.checked = !checkProf.checked;
        checkTodos.checked = false;

        if (checkProf.checked) {
          selecionados = selecionados.filter(s => s !== 'todos');
          if (!selecionados.includes(prof.id)) selecionados.push(prof.id);
        } else {
          selecionados = selecionados.filter(id => id !== prof.id);
        }
        atualizarTextoSeletor();
      });
    });

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
      })
    ]);

    // -------------------------------------------------------------------------
    // 2.3 Botões de Ação
    // -------------------------------------------------------------------------
    const botaoEnvio = criarElemento('button', {
      type: 'submit',
      class: 'btn-primario',
      style: 'background-color: #3b5998; color: white; border: none; padding: 11px 20px; font-weight: 500; border-radius: 6px; cursor: pointer; font-size: 0.95em;'
    }, [idEmEdicao ? 'Salvar Alterações' : 'Enviar notificação']);

    const botoes = criarElemento('div', { style: 'display: flex; gap: 0.6em; align-items: center;' }, [botaoEnvio]);

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
    // 2.4 Event Handler: Submit
    // -------------------------------------------------------------------------
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      
      const titulo = form.titulo.value.trim();
      const mensagem = form.mensagem.value.trim();

      if (selecionados.length === 0) {
        mostrarToast('Por favor, selecione pelo menos um professor ou "Todos".', 'erro');
        return;
      }

      if (!campoObrigatorioPreenchido(titulo) || !campoObrigatorioPreenchido(mensagem)) {
        mostrarToast('Preencha o título e a mensagem.', 'erro');
        return;
      }

      // Payload compatível com a tabela 'notificacoes' do Supabase
      const dadosNotificacao = {
        coordenador_id: coordenadorId,
        titulo: titulo,
        mensagem: mensagem
      };

      if (idEmEdicao) {
        await dbAtualizar('notificacoes', idEmEdicao, dadosNotificacao);
        
        // Remove vínculos antigos para regravar atualizado
        if (typeof supabase !== 'undefined') {
          await supabase.from('notificacao_professores').delete().eq('notificacao_id', idEmEdicao);
        }
        await vincularProfessores(idEmEdicao, selecionados, listaProfessores);

        mostrarToast('Notificação atualizada com sucesso!', 'sucesso');
        idEmEdicao = null;
      } else {
        const novaNotificacao = await dbInserir('notificacoes', dadosNotificacao);
        const notifId = novaNotificacao?.id || (Array.isArray(novaNotificacao) ? novaNotificacao[0]?.id : null);

        if (notifId) {
          await vincularProfessores(notifId, selecionados, listaProfessores);
        }

        mostrarToast('Notificação enviada!', 'sucesso');
      }

      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  // ---------------------------------------------------------------------------
  // HELPER: Insere as linhas na tabela 'notificacao_professores'
  // ---------------------------------------------------------------------------
  async function vincularProfessores(notificacaoId, selecionados, listaProfessores) {
    let idsProfessores = [];

    if (selecionados.includes('todos')) {
      idsProfessores = listaProfessores.map(p => p.id);
    } else {
      idsProfessores = selecionados;
    }

    if (idsProfessores.length === 0) return;

    const registros = idsProfessores.map(profId => ({
      notificacao_id: notificacaoId,
      professor_id: profId,
      lida: false
    }));

    if (typeof supabase !== 'undefined') {
      await supabase.from('notificacao_professores').insert(registros);
    } else {
      for (const reg of registros) {
        await dbInserir('notificacao_professores', reg);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. SUB-ROTINA: MONTAGEM DA LISTAGEM (Histórico)
  // ---------------------------------------------------------------------------
  async function montarLista() {
    areaLista.innerHTML = '';
    const notificacoes = await dbListar('notificacoes');

    if (!notificacoes || notificacoes.length === 0) {
      areaLista.appendChild(
        criarElemento('div', {
          style: 'border: 1px solid #e0e0e0; background-color: #fcfcfc; border-radius: 8px; padding: 2.5em; text-align: center; color: #888; font-size: 0.95em;'
        }, ['Nenhuma notificação enviada ainda.'])
      );
      return;
    }

    let vinculosProfessores = [];
    try {
      vinculosProfessores = await dbListar('notificacao_professores') || [];
    } catch (e) {
      console.warn('[notificacao.js] Erro ao carregar notificacao_professores:', e);
    }

    let listaProfs = [];
    try { 
      listaProfs = await dbListar('professores') || []; 
    } catch (e) {
      console.warn('[notificacao.js] Erro ao carregar professores:', e);
    }

    // Ordenação Decrescente por Data de criação (criado_em / data)
    notificacoes.sort((a, b) => new Date(b.criado_em || b.data || 0) - new Date(a.criado_em || a.data || 0));

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

    for (const notif of notificacoes) {
      let txtDestinatarios = '—';
      
      // Busca no banco quais professores estão vinculados a essa notificação
      const vinculos = vinculosProfessores.filter(v => v.notificacao_id === notif.id);
      
      if (vinculos.length > 0) {
        if (listaProfs.length > 0 && vinculos.length >= listaProfs.length) {
          txtDestinatarios = 'Todos';
        } else {
          const nomes = vinculos.map(v => {
            const p = listaProfs.find(prof => prof.id === v.professor_id);
            return p ? p.nome.split(' ')[0] : 'Prof.';
          });
          txtDestinatarios = nomes.join(', ');
        }
      } else if (notif.destinatarios) {
        const dests = Array.isArray(notif.destinatarios) ? notif.destinatarios : [notif.destinatarios];
        txtDestinatarios = dests.includes('todos') ? 'Todos' : dests.length + ' prof(s)';
      }

      // Tratamento para formatar 'criado_em' do Supabase ou 'data' do localStorage
      const dataExibicao = notif.criado_em 
        ? new Date(notif.criado_em).toLocaleDateString('pt-BR') 
        : formatarDataBR(notif.data);

      corpo.appendChild(
        criarElemento('tr', { style: 'border-bottom: 1px solid #eee;' }, [
          criarElemento('td', { style: 'padding: 10px;' }, [dataExibicao]),
          criarElemento('td', { style: 'padding: 10px; font-weight: 500; font-size: 0.95em; color: #555;' }, [txtDestinatarios]),
          criarElemento('td', { style: 'padding: 10px;' }, [notif.titulo]),
          criarElemento('td', { class: 'celula-acoes' }, [
            criarElemento('button', {
              class: 'btn-icone',
              onClick: async () => {
                idEmEdicao = notif.id;
                await montarFormulario();
                areaFormulario.scrollIntoView({ behavior: 'smooth' });
              }
            }, ['Editar']),

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

  // Inicialização
  await montarFormulario();
  await montarLista();
}

/**
 * Utilitário para formatação de strings de data ISO para o padrão brasileiro.
 */
function formatarDataBR(dataISO) {
  if (!dataISO) return '—';
  const parts = dataISO.split('-');
  if (parts.length < 3) return dataISO;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Exposição Global
window.renderSecaoNotificacoes = renderSecaoNotificacoes;

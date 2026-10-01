/**
 * @fileoverview notificacao.js — Módulo de Gerenciamento de Avisos e Notificações (Painel do Coordenador)
 * 
 * Este módulo é responsável por prover a interface gráfica e a lógica de criação, edição, 
 * exclusão e listagem de notificações enviadas pela coordenação para os professores,
 * integrando persistência no banco de dados e envio automatizado via webhook (n8n).
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
 * Dispara um webhook para o n8n contendo os dados da notificação.
 * Função isolada para manter a responsabilidade única e não bloquear o fluxo principal.
 * 
 * @async
 * @param {Object} payload - Dados da notificação a serem enviados.
 * @param {string} payload.titulo - Título da notificação.
 * @param {string} payload.mensagem - Corpo da mensagem.
 * @param {Array<string>} payload.destinatarios - Lista de IDs dos professores ou ['todos'].
 * @returns {Promise<void>}
 */
async function dispararWebhookN8n(payload) {
  try {
    // Verifica se a constante global do Webhook (definida em n8n.js) existe
    if (typeof N8N_WEBHOOK_URL === 'undefined' || !N8N_WEBHOOK_URL) {
      console.warn('[notificacao.js] N8N_WEBHOOK_URL não está definida. O disparo para o n8n foi ignorado.');
      return;
    }

    console.log('[notificacao.js] Disparando webhook para n8n...', payload);

    const resposta = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        data_envio: new Date().toISOString(),
        origem: 'UNICHAMADA - Painel do Coordenador'
      })
    });

    if (!resposta.ok) {
      throw new Error(`Erro na resposta do n8n: ${resposta.status} ${resposta.statusText}`);
    }

    console.log('[notificacao.js] Webhook n8n executado com sucesso!');
  } catch (erro) {
    // Apenas logamos o erro para não quebrar a experiência do usuário caso o túnel caia
    console.error('[notificacao.js] Falha ao comunicar com o n8n:', erro);
  }
}

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
  // 1. ESTRUTURAÇÃO DO LAYOUT (DOM Base Original)
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

  /** Guarda o ID do registro em edição */
  let idEmEdicao = null;

  // ---------------------------------------------------------------------------
  // 2. SUB-ROTINA: MONTAGEM DO FORMULÁRIO
  // ---------------------------------------------------------------------------
  async function montarFormulario() {
    areaFormulario.innerHTML = '';
    
    // Busca dados caso seja um fluxo de edição
    let notificacao = null;
    if (idEmEdicao) {
      try {
        notificacao = await dbBuscarPorId('notificacoes', idEmEdicao);
      } catch (e) {
        console.warn('[notificacao.js] Erro ao buscar notificação por ID:', e);
      }
    }

    const form = criarElemento('form', { style: 'display: flex; flex-direction: column; gap: 1em;' });
    
    form.appendChild(
      criarElemento('h3', { style: 'margin-bottom: 0.5em; font-size: 1.1em; color: #333;' }, [
        idEmEdicao ? 'Editar notificação' : 'Nova notificação'
      ])
    );

    // -------------------------------------------------------------------------
    // 2.1 Seletor Multi-select de Professores (Dropdown)
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

    let selecionados = ['todos'];
    if (notificacao?.destinatarios) {
      selecionados = Array.isArray(notificacao.destinatarios) ? notificacao.destinatarios : [notificacao.destinatarios];
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
    // 2.2 Campos do Formulário
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
    // 2.4 Event Handler: Submit (Persistência + Webhook N8N)
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

      // Desativa o botão temporariamente para evitar duplo clique
      botaoEnvio.disabled = true;
      botaoEnvio.textContent = 'Enviando...';

      let coordenadorId = null;
      try {
        const coords = await dbListar('coordenadores');
        if (coords && coords.length > 0) coordenadorId = coords[0].id;
      } catch (e) {
        console.warn(e);
      }
      if (!coordenadorId) coordenadorId = '10000000-0000-0000-0000-000000000001';

      const dadosNotificacao = {
        coordenador_id: coordenadorId,
        titulo: titulo,
        mensagem: mensagem
      };

      try {
        if (idEmEdicao) {
          // Atualiza registro existente
          await dbAtualizar('notificacoes', idEmEdicao, dadosNotificacao);
          mostrarToast('Notificação atualizada com sucesso!', 'sucesso');
          idEmEdicao = null;
        } else {
          // 1. Insere a notificação na tabela 'notificacoes'
          const res = await dbInserir('notificacoes', dadosNotificacao);
          const notifId = res?.id || (Array.isArray(res) ? res[0]?.id : null);

          // 2. Cria os vínculos na tabela 'notificacao_professores'
          let targetProfs = selecionados.includes('todos') 
            ? listaProfessores.map(p => p.id) 
            : selecionados;

          if (notifId) {
            for (const profId of targetProfs) {
              await dbInserir('notificacao_professores', {
                notificacao_id: notifId,
                professor_id: profId,
                lida: false
              });
            }
          }

          // 3. Integração n8n: Dispara o webhook após salvar no banco com sucesso
          await dispararWebhookN8n({
            titulo: titulo,
            mensagem: mensagem,
            destinatarios: selecionados.includes('todos') ? 'Todos os Professores' : targetProfs,
            quantidade_professores: targetProfs.length
          });

          mostrarToast('Notificação enviada e processada!', 'sucesso');
        }
      } catch (err) {
        console.error('[notificacao.js] Erro ao salvar:', err);
        mostrarToast('Erro ao salvar notificação.', 'erro');
      } finally {
        botaoEnvio.disabled = false;
      }

      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  // ---------------------------------------------------------------------------
  // 3. SUB-ROTINA: MONTAGEM DA LISTAGEM
  // ---------------------------------------------------------------------------
  async function montarLista() {
    areaLista.innerHTML = '';
    
    let notificacoes = [];
    try {
      notificacoes = await dbListar('notificacoes') || [];
    } catch (err) {
      console.warn('[notificacao.js] Erro ao listar notificações:', err);
    }

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

    // Ordenação Decrescente por Data
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
 * Utilitário para formatação de data
 */
function formatarDataBR(dataISO) {
  if (!dataISO) return '—';
  const parts = dataISO.split('-');
  if (parts.length < 3) return dataISO;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

window.renderSecaoNotificacoes = renderSecaoNotificacoes;
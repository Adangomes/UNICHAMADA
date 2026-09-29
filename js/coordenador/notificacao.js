/**
 * @fileoverview notificacao.js — Módulo de Gerenciamento de Avisos e Notificações (Painel do Coordenador)
 * Integração 100% nativa com o Supabase (tabelas 'notificacoes' e 'notificacao_professores')
 */

async function renderSecaoNotificacoes(container) {
  container.innerHTML = '';

  // ---------------------------------------------------------------------------
  // 1. ESTRUTURAÇÃO DO LAYOUT (DOM Base)
  // ---------------------------------------------------------------------------
  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Notificações']),
      criarElemento('p', {}, ['Notifique professores sobre atualizações e mudanças.'])
    ])
  ]);

  const grade = criarElemento('div', { class: 'grade-secao' });
  const areaFormulario = criarElemento('div', { class: 'cartao' });
  const areaLista = criarElemento('div', { style: 'flex: 1;' });
  
  grade.append(areaFormulario, areaLista);
  container.append(cabecalho, grade);

  let idEmEdicao = null;

  // ---------------------------------------------------------------------------
  // 2. MONTAGEM DO FORMULÁRIO
  // ---------------------------------------------------------------------------
  async function montarFormulario() {
    areaFormulario.innerHTML = '';
    
    // Busca notificação no Supabase em caso de edição
    let notificacao = null;
    let vinculosExistentes = [];

    if (idEmEdicao) {
      const { data: notifData } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('id', idEmEdicao)
        .single();
      
      notificacao = notifData;

      const { data: vincData } = await supabase
        .from('notificacao_professores')
        .select('professor_id')
        .eq('notificacao_id', idEmEdicao);

      vinculosExistentes = vincData || [];
    }

    const form = criarElemento('form', { style: 'display: flex; flex-direction: column; gap: 1em;' });
    form.appendChild(
      criarElemento('h3', { style: 'margin-bottom: 0.5em; font-size: 1.1em; color: #333;' }, [
        idEmEdicao ? 'Editar notificação' : 'Nova notificação'
      ])
    );

    // Seletor de Professores
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

    // Busca lista de professores do Supabase
    const { data: listaProfessores } = await supabase
      .from('professores')
      .select('id, nome')
      .order('nome');

    const profs = listaProfessores || [];

    let selecionados = ['todos'];
    if (idEmEdicao && vinculosExistentes.length > 0) {
      if (profs.length > 0 && vinculosExistentes.length >= profs.length) {
        selecionados = ['todos'];
      } else {
        selecionados = vinculosExistentes.map(v => v.professor_id);
      }
    }

    function atualizarTextoSeletor() {
      if (selecionados.includes('todos')) {
        textoSeletor.textContent = 'Todos os Professores';
      } else if (selecionados.length === 0) {
        textoSeletor.textContent = 'Selecione o professor';
      } else if (selecionados.length === 1) {
        const prof = profs.find(p => p.id === selecionados[0]);
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

    profs.forEach(prof => {
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

    // Campos Título e Mensagem
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

    // Envio do formulário direto para o Supabase
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

      // Busca o ID do Coordenador direto na tabela 'coordenadores'
      const { data: coordData } = await supabase.from('coordenadores').select('id').limit(1);
      const coordenadorId = coordData?.[0]?.id;

      if (!coordenadorId) {
        mostrarToast('Erro: Nenhum coordenador cadastrado no sistema.', 'erro');
        return;
      }

      let notificacaoId = idEmEdicao;

      if (idEmEdicao) {
        // Atualiza na tabela 'notificacoes'
        await supabase
          .from('notificacoes')
          .update({ titulo, mensagem })
          .eq('id', idEmEdicao);

        // Limpa vínculos antigos
        await supabase
          .from('notificacao_professores')
          .delete()
          .eq('notificacao_id', idEmEdicao);

        mostrarToast('Notificação atualizada!', 'sucesso');
        idEmEdicao = null;
      } else {
        // Insere na tabela 'notificacoes'
        const { data: novaNotif, error } = await supabase
          .from('notificacoes')
          .insert([{ coordenador_id: coordenadorId, titulo, mensagem }])
          .select();

        if (error || !novaNotif?.[0]) {
          console.error(error);
          mostrarToast('Erro ao enviar notificação.', 'erro');
          return;
        }

        notificacaoId = novaNotif[0].id;
        mostrarToast('Notificação enviada!', 'sucesso');
      }

      // Insere vínculos na tabela 'notificacao_professores'
      let idsParaVincular = selecionados.includes('todos') ? profs.map(p => p.id) : selecionados;
      
      if (idsParaVincular.length > 0) {
        const registros = idsParaVincular.map(pId => ({
          notificacao_id: notificacaoId,
          professor_id: pId,
          lida: false
        }));

        await supabase.from('notificacao_professores').insert(registros);
      }

      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  // ---------------------------------------------------------------------------
  // 3. MONTAGEM DA LISTAGEM (Histórico do Supabase)
  // ---------------------------------------------------------------------------
  async function montarLista() {
    areaLista.innerHTML = '';

    // Busca notificações do Supabase
    const { data: notificacoes, error } = await supabase
      .from('notificacoes')
      .select(`
        id,
        titulo,
        mensagem,
        criado_em,
        notificacao_professores (
          professor_id,
          professores ( nome )
        )
      `)
      .order('criado_em', { ascending: false });

    if (error || !notificacoes || notificacoes.length === 0) {
      areaLista.appendChild(
        criarElemento('div', {
          style: 'border: 1px solid #e0e0e0; background-color: #fcfcfc; border-radius: 8px; padding: 2.5em; text-align: center; color: #888; font-size: 0.95em;'
        }, ['Nenhuma notificação enviada ainda.'])
      );
      return;
    }

    // Busca total de professores para comparar se enviou para "Todos"
    const { count: totalProfessores } = await supabase
      .from('professores')
      .select('*', { count: 'exact', head: true });

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
      const vinculos = notif.notificacao_professores || [];

      if (vinculos.length > 0) {
        if (totalProfessores && vinculos.length >= totalProfessores) {
          txtDestinatarios = 'Todos';
        } else {
          const nomes = vinculos.map(v => v.professores?.nome?.split(' ')[0] || 'Prof.');
          txtDestinatarios = nomes.join(', ');
        }
      }

      const dataExibicao = notif.criado_em 
        ? new Date(notif.criado_em).toLocaleDateString('pt-BR') 
        : '—';

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
                
                await supabase.from('notificacoes').delete().eq('id', notif.id);
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

  await montarFormulario();
  await montarLista();
}

window.renderSecaoNotificacoes = renderSecaoNotificacoes;

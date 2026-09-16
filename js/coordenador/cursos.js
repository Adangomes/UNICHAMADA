/**
 * cursos.js — Cadastro de Cursos (Coordenador)
 * Curso: { nome }
 */

/**
 * Renderiza a seção de Cursos dentro do container passado (a aba "Cursos"
 * do painel do coordenador). Monta o formulário de cadastro/edição e a
 * lista de cursos já cadastrados.
 */
async function renderSecaoCursos(container) {
  // Limpa o conteúdo anterior (importante porque essa função é chamada
  // toda vez que o usuário clica na aba, então precisa remontar do zero)
  container.innerHTML = '';

  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Cursos']),
      criarElemento('p', {}, ['Cadastre os cursos oferecidos pela instituição.'])
    ])
  ]);

  // Layout em grade: formulário de um lado, lista do outro
  const grade = criarElemento('div', { class: 'grade-secao' });
  const areaFormulario = criarElemento('div', { class: 'cartao' });
  const areaLista = criarElemento('div', {});

  grade.append(areaFormulario, areaLista);
  container.append(cabecalho, grade);

  // Controla se o formulário tá em modo "cadastro novo" (null) ou
  // "edição" (guarda o id do curso sendo editado)
  let idEmEdicao = null;

  /**
   * (Re)monta o formulário de cadastro/edição de curso.
   * Se idEmEdicao estiver preenchido, busca o curso no banco e
   * pré-popula o campo com os dados existentes (modo edição).
   */
  async function montarFormulario() {
    areaFormulario.innerHTML = '';

    const curso = idEmEdicao ? await dbBuscarPorId('cursos', idEmEdicao) : null;

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar curso' : 'Novo curso']));

    // Único campo do formulário: nome do curso.
    // Se tiver curso carregado (edição), já vem preenchido com o valor atual.
    const campoNome = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Nome do curso']),
      criarElemento('input', { 
        type: 'text', 
        name: 'nome', 
        placeholder: 'Ex.: Análise e Desenvolvimento de Sistemas', 
        required: 'true',
        value: curso?.nome || ''
      })
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, [idEmEdicao ? 'Salvar alterações' : 'Cadastrar curso'])
    ]);

    // Botão "Cancelar" só aparece quando tá editando, pra dar a opção
    // de sair do modo edição sem salvar nada
    if (idEmEdicao) {
      botoes.appendChild(
        criarElemento('button', {
          type: 'button',
          class: 'btn-secundario',
          onClick: async () => { idEmEdicao = null; await montarFormulario(); }
        }, ['Cancelar'])
      );
    }

    form.append(campoNome, botoes);

    // Trata o envio do formulário (tanto cadastro quanto edição passam por aqui)
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();

      // Validação simples: não deixa salvar sem nome
      if (!campoObrigatorioPreenchido(nome)) {
        mostrarToast('Informe o nome do curso.', 'erro');
        return;
      }

      // Se tá editando, atualiza o registro existente; senão, cria um novo
      if (idEmEdicao) {
        await dbAtualizar('cursos', idEmEdicao, { nome });
        mostrarToast('Curso atualizado.', 'sucesso');
        idEmEdicao = null; // volta pro modo "novo cadastro" depois de salvar
      } else {
        await dbInserir('cursos', { nome });
        mostrarToast('Curso cadastrado.', 'sucesso');
      }

      // Depois de salvar, remonta o form (limpo/voltado pro modo cadastro)
      // e atualiza a lista pra refletir a mudança
      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  /**
   * (Re)monta a listagem de cursos cadastrados, com contagem de
   * disciplinas vinculadas a cada um e ações de editar/excluir.
   */
  async function montarLista() {
    areaLista.innerHTML = '';
    const cursos = await dbListar('cursos');
    const disciplinas = await dbListar('disciplinas'); // usado só pra contar quantas disciplinas cada curso tem

    // Estado vazio: se não tem curso nenhum, mostra uma mensagem em vez de tabela vazia
    if (cursos.length === 0) {
      areaLista.appendChild(
        criarElemento('div', { class: 'tabela-wrap' }, [
          criarElemento('div', { class: 'estado-vazio' }, ['Nenhum curso cadastrado ainda.'])
        ])
      );
      return;
    }

    const tabela = criarElemento('table', {});
    tabela.appendChild(
      criarElemento('thead', {}, [
        criarElemento('tr', {}, [
          criarElemento('th', {}, ['Curso']),
          criarElemento('th', {}, ['Disciplinas']),
          criarElemento('th', {}, ['Ações'])
        ])
      ])
    );

    const corpo = criarElemento('tbody', {});
    for (const curso of cursos) {
      // Conta quantas disciplinas têm esse curso como cursoId
      // (não é uma relação carregada do banco, é calculada aqui na hora)
      const qtdDisciplinas = disciplinas.filter((d) => d.cursoId === curso.id).length;

      corpo.appendChild(
        criarElemento('tr', {}, [
          criarElemento('td', {}, [curso.nome]),
          criarElemento('td', {}, [criarElemento('span', { class: 'tag' }, [`${qtdDisciplinas} disciplina(s)`])]),
          criarElemento('td', { class: 'celula-acoes' }, [
            // Editar: entra em modo edição, recarrega o form com os dados
            // do curso e rola a tela até o formulário (pra UX ficar boa em mobile,
            // onde o form pode estar fora da área visível)
            criarElemento('button', {
              class: 'btn-icone', title: 'Editar',
              onClick: async () => { 
                idEmEdicao = curso.id; 
                await montarFormulario(); 
                form_scrollTo(areaFormulario); 
              }
            }, ['Editar']),

            // Excluir: pede confirmação antes (evita exclusão por clique acidental)
            criarElemento('button', {
              class: 'btn-perigo', title: 'Excluir',
              onClick: async () => {
                if (!confirmarAcao(`Excluir o curso "${curso.nome}"?`)) return;
                await dbRemover('cursos', curso.id);
                mostrarToast('Curso excluído.', 'sucesso');
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

  // Helper simples pra rolar suavemente até um elemento (usado ao clicar em "Editar")
  function form_scrollTo(el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  // Monta tudo assim que a seção é aberta: formulário vazio + lista atual
  await montarFormulario();
  await montarLista();
}

// Expõe a função globalmente pra ser chamada pelo painel do coordenador (coordenadores.js)
window.renderSecaoCursos = renderSecaoCursos;

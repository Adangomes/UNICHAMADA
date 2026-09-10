/**
 * cursos.js — Cadastro de Cursos (Coordenador)
 * Curso: { nome }
 */

async function renderSecaoCursos(container) {
  container.innerHTML = '';

  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Cursos']),
      criarElemento('p', {}, ['Cadastre os cursos oferecidos pela instituição.'])
    ])
  ]);

  const grade = criarElemento('div', { class: 'grade-secao' });
  const areaFormulario = criarElemento('div', { class: 'cartao' });
  const areaLista = criarElemento('div', {});

  grade.append(areaFormulario, areaLista);
  container.append(cabecalho, grade);

  let idEmEdicao = null;

  async function montarFormulario() {
    areaFormulario.innerHTML = '';

    const curso = idEmEdicao ? await dbBuscarPorId('cursos', idEmEdicao) : null;

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar curso' : 'Novo curso']));

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

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();
      if (!campoObrigatorioPreenchido(nome)) {
        mostrarToast('Informe o nome do curso.', 'erro');
        return;
      }

      if (idEmEdicao) {
        await dbAtualizar('cursos', idEmEdicao, { nome });
        mostrarToast('Curso atualizado.', 'sucesso');
        idEmEdicao = null;
      } else {
        await dbInserir('cursos', { nome });
        mostrarToast('Curso cadastrado.', 'sucesso');
      }
      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  async function montarLista() {
    areaLista.innerHTML = '';
    const cursos = await dbListar('cursos');
    const disciplinas = await dbListar('disciplinas');

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
      const qtdDisciplinas = disciplinas.filter((d) => d.cursoId === curso.id).length;
      corpo.appendChild(
        criarElemento('tr', {}, [
          criarElemento('td', {}, [curso.nome]),
          criarElemento('td', {}, [criarElemento('span', { class: 'tag' }, [`${qtdDisciplinas} disciplina(s)`])]),
          criarElemento('td', { class: 'celula-acoes' }, [
            criarElemento('button', {
              class: 'btn-icone', title: 'Editar',
              onClick: async () => { 
                idEmEdicao = curso.id; 
                await montarFormulario(); 
                form_scrollTo(areaFormulario); 
              }
            }, ['Editar']),
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

  function form_scrollTo(el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  await montarFormulario();
  await montarLista();
}

window.renderSecaoCursos = renderSecaoCursos;

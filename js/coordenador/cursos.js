/**
 * cursos.js — Cadastro de Cursos (Coordenador)
 * Curso: { nome }
 */

function renderSecaoCursos(container) {
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

  function montarFormulario() {
    areaFormulario.innerHTML = '';

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar curso' : 'Novo curso']));

    const campoNome = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Nome do curso']),
      criarElemento('input', { type: 'text', name: 'nome', placeholder: 'Ex.: Análise e Desenvolvimento de Sistemas', required: 'true' })
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, [idEmEdicao ? 'Salvar alterações' : 'Cadastrar curso'])
    ]);

    if (idEmEdicao) {
      botoes.appendChild(
        criarElemento('button', {
          type: 'button',
          class: 'btn-secundario',
          onClick: () => { idEmEdicao = null; montarFormulario(); }
        }, ['Cancelar'])
      );
    }

    form.append(campoNome, botoes);

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();
      if (!campoObrigatorioPreenchido(nome)) {
        mostrarToast('Informe o nome do curso.', 'erro');
        return;
      }

      if (idEmEdicao) {
        dbAtualizar('cursos', idEmEdicao, { nome });
        mostrarToast('Curso atualizado.', 'sucesso');
        idEmEdicao = null;
      } else {
        dbInserir('cursos', { nome });
        mostrarToast('Curso cadastrado.', 'sucesso');
      }
      montarFormulario();
      montarLista();
    });

    areaFormulario.appendChild(form);
  }

  function montarLista() {
    areaLista.innerHTML = '';
    const cursos = dbListar('cursos');

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
    cursos.forEach((curso) => {
      const qtdDisciplinas = dbListar('disciplinas').filter((d) => d.cursoId === curso.id).length;
      corpo.appendChild(
        criarElemento('tr', {}, [
          criarElemento('td', {}, [curso.nome]),
          criarElemento('td', {}, [criarElemento('span', { class: 'tag' }, [`${qtdDisciplinas} disciplina(s)`])]),
          criarElemento('td', { class: 'celula-acoes' }, [
            criarElemento('button', {
              class: 'btn-icone', title: 'Editar',
              onClick: () => { idEmEdicao = curso.id; montarFormulario(); form_scrollTo(areaFormulario); }
            }, ['✏️ Editar']),
            criarElemento('button', {
              class: 'btn-perigo', title: 'Excluir',
              onClick: () => {
                if (!confirmarAcao(`Excluir o curso "${curso.nome}"?`)) return;
                dbRemover('cursos', curso.id);
                mostrarToast('Curso excluído.', 'sucesso');
                montarLista();
              }
            }, ['Excluir'])
          ])
        ])
      );
    });
    tabela.appendChild(corpo);

    areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [tabela]));
  }

  function form_scrollTo(el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  montarFormulario();
  montarLista();
}

window.renderSecaoCursos = renderSecaoCursos;

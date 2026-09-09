/**
 * disciplinas.js — Cadastro de Disciplinas (Coordenador)
 * Disciplina: { nome, cursoId (curso vinculado), turno, cargaHoraria, professorId }
 */

function renderSecaoDisciplinas(container) {
  container.innerHTML = '';

  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Disciplinas']),
      criarElemento('p', {}, ['Vincule cada disciplina a um curso, turno e professor responsável.'])
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
    const disciplina = idEmEdicao ? dbBuscarPorId('disciplinas', idEmEdicao) : null;
    const cursos = dbListar('cursos');
    const professores = dbListar('professores');

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar disciplina' : 'Nova disciplina']));

    const campoNome = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Nome da disciplina']),
      criarElemento('input', { type: 'text', name: 'nome', required: 'true', value: disciplina?.nome || '' })
    ]);

    const campoCurso = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Curso vinculado']),
      criarElemento('select', { name: 'cursoId', required: 'true' }, [
        criarElemento('option', { value: '' }, ['Selecione o curso']),
        ...cursos.map((c) => criarElemento('option', { value: c.id, ...(disciplina?.cursoId === c.id ? { selected: 'true' } : {}) }, [c.nome]))
      ])
    ]);

    const linha = criarElemento('div', { class: 'linha-campos' }, [
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['Turno']),
        criarElemento('select', { name: 'turno', required: 'true' }, [
          criarElemento('option', { value: '' }, ['Selecione']),
          ...TURNOS.map((t) => criarElemento('option', { value: t, ...(disciplina?.turno === t ? { selected: 'true' } : {}) }, [t]))
        ])
      ]),
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['Carga horária (h)']),
        criarElemento('input', { type: 'number', name: 'cargaHoraria', min: '1', value: disciplina?.cargaHoraria || '' })
      ])
    ]);

    const campoProfessor = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Professor responsável']),
      criarElemento('select', { name: 'professorId' }, [
        criarElemento('option', { value: '' }, ['A definir']),
        ...professores.map((p) => criarElemento('option', { value: p.id, ...(disciplina?.professorId === p.id ? { selected: 'true' } : {}) }, [p.nome]))
      ])
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, [idEmEdicao ? 'Salvar alterações' : 'Cadastrar disciplina'])
    ]);
    if (idEmEdicao) {
      botoes.appendChild(criarElemento('button', {
        type: 'button', class: 'btn-secundario',
        onClick: () => { idEmEdicao = null; montarFormulario(); }
      }, ['Cancelar']));
    }

    form.append(campoNome, campoCurso, linha, campoProfessor, botoes);

    if (cursos.length === 0) {
      form.appendChild(criarElemento('p', { style: 'font-size:.78rem;color:var(--coral);margin-top:.6em;' }, ['Cadastre ao menos um curso antes de criar disciplinas.']));
    }

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();
      const cursoId = form.cursoId.value;
      const turno = form.turno.value;
      const cargaHoraria = form.cargaHoraria.value ? Number(form.cargaHoraria.value) : null;
      const professorId = form.professorId.value || null;

      if (!campoObrigatorioPreenchido(nome) || !cursoId || !turno) {
        mostrarToast('Preencha nome, curso e turno.', 'erro');
        return;
      }

      const dados = { nome, cursoId, turno, cargaHoraria, professorId };

      if (idEmEdicao) {
        dbAtualizar('disciplinas', idEmEdicao, dados);
        mostrarToast('Disciplina atualizada.', 'sucesso');
        idEmEdicao = null;
      } else {
        dbInserir('disciplinas', dados);
        mostrarToast('Disciplina cadastrada.', 'sucesso');
      }
      montarFormulario();
      montarLista();
    });

    areaFormulario.appendChild(form);
  }

  function montarLista() {
    areaLista.innerHTML = '';
    const disciplinas = dbListar('disciplinas');

    if (disciplinas.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
        criarElemento('div', { class: 'estado-vazio' }, ['Nenhuma disciplina cadastrada ainda.'])
      ]));
      return;
    }

    const tabela = criarElemento('table', {});
    tabela.appendChild(criarElemento('thead', {}, [
      criarElemento('tr', {}, [
        criarElemento('th', {}, ['Disciplina']),
        criarElemento('th', {}, ['Curso']),
        criarElemento('th', {}, ['Turno']),
        criarElemento('th', {}, ['Professor']),
        criarElemento('th', {}, ['Ações'])
      ])
    ]));

    const corpo = criarElemento('tbody', {});
    disciplinas.forEach((disciplina) => {
      const curso = dbBuscarPorId('cursos', disciplina.cursoId);
      const professor = dbBuscarPorId('professores', disciplina.professorId);
      corpo.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [disciplina.nome]),
        criarElemento('td', {}, [curso ? curso.nome : '—']),
        criarElemento('td', {}, [disciplina.turno]),
        criarElemento('td', {}, [professor ? professor.nome : criarElemento('span', { class: 'tag' }, ['a definir'])]),
        criarElemento('td', { class: 'celula-acoes' }, [
          criarElemento('button', {
            class: 'btn-icone',
            onClick: () => { idEmEdicao = disciplina.id; montarFormulario(); areaFormulario.scrollIntoView({ behavior: 'smooth' }); }
          }, ['✏️ Editar']),
          criarElemento('button', {
            class: 'btn-perigo',
            onClick: () => {
              if (!confirmarAcao(`Excluir a disciplina "${disciplina.nome}"?`)) return;
              dbRemover('disciplinas', disciplina.id);
              mostrarToast('Disciplina excluída.', 'sucesso');
              montarLista();
            }
          }, ['Excluir'])
        ])
      ]));
    });
    tabela.appendChild(corpo);

    areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [tabela]));
  }

  montarFormulario();
  montarLista();
}

window.renderSecaoDisciplinas = renderSecaoDisciplinas;

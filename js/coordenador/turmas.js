/**
 * turmas.js — Cadastro de Turmas (Coordenador)
 * Mapeia os dados do front para o padrão do banco (curso_id, disciplina_id, professor_id)
 */

async function renderSecaoTurmas(container) {
  container.innerHTML = '';

  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Turmas']),
      criarElemento('p', {}, ['Crie turmas vinculando curso, disciplina, professor e turno.'])
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
    const turma = idEmEdicao ? await dbBuscarPorId('turmas', idEmEdicao) : null;
    const cursos = await dbListar('cursos');
    const disciplinas = await dbListar('disciplinas');

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar turma' : 'Nova turma']));

    const campoNome = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Nome/código da turma']),
      criarElemento('input', { type: 'text', name: 'nome', required: 'true', placeholder: 'Ex.: ADS-2026/2-A', value: turma?.nome || '' })
    ]);

    const cursoAtualId = turma?.curso_id || turma?.cursoId || '';
    const campoCurso = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Curso']),
      criarElemento('select', { name: 'cursoId', required: 'true' }, [
        criarElemento('option', { value: '' }, ['Selecione o curso']),
        ...cursos.map((c) => criarElemento('option', { value: c.id, ...(cursoAtualId === c.id ? { selected: 'true' } : {}) }, [c.nome]))
      ])
    ]);

    const campoDisciplina = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Disciplina']),
      criarElemento('select', { name: 'disciplinaId', required: 'true' })
    ]);

    function repopularDisciplinas(cursoIdSelecionado) {
      const select = campoDisciplina.querySelector('select');
      select.innerHTML = '';
      select.appendChild(criarElemento('option', { value: '' }, ['Selecione a disciplina']));
      
      const disciplinaAtualId = turma?.disciplina_id || turma?.disciplinaId || '';
      
      disciplinas
        .filter((d) => (d.curso_id || d.cursoId) === cursoIdSelecionado)
        .forEach((d) => {
          select.appendChild(criarElemento('option', { value: d.id, ...(disciplinaAtualId === d.id ? { selected: 'true' } : {}) }, [d.nome]));
        });
    }
    repopularDisciplinas(cursoAtualId);
    campoCurso.querySelector('select').addEventListener('change', (e) => repopularDisciplinas(e.target.value));

    const professores = await dbListar('professores');
    const professorAtualId = turma?.professor_id || turma?.professorId || '';
    const campoProfessor = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Professor']),
      criarElemento('select', { name: 'professorId' }, [
        criarElemento('option', { value: '' }, ['A definir']),
        ...professores.map((p) => criarElemento('option', { value: p.id, ...(professorAtualId === p.id ? { selected: 'true' } : {}) }, [p.nome]))
      ])
    ]);

    const linha = criarElemento('div', { class: 'linha-campos' }, [
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['Turno']),
        criarElemento('select', { name: 'turno', required: 'true' }, [
          criarElemento('option', { value: '' }, ['Selecione']),
          ...TURNOS.map((t) => criarElemento('option', { value: t, ...(turma?.turno === t ? { selected: 'true' } : {}) }, [t]))
        ])
      ]),
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['Período/semestre']),
        criarElemento('input', { type: 'text', name: 'periodo', placeholder: 'Ex.: 2026/2', value: turma?.periodo || '' })
      ])
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, [idEmEdicao ? 'Salvar alterações' : 'Criar turma'])
    ]);
    if (idEmEdicao) {
      botoes.appendChild(criarElemento('button', {
        type: 'button', class: 'btn-secundario',
        onClick: async () => { idEmEdicao = null; await montarFormulario(); }
      }, ['Cancelar']));
    }

    form.append(campoNome, campoCurso, campoDisciplina, professores.length ? campoProfessor : criarElemento('div'), linha, botoes);

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();
      const cursoId = form.cursoId.value;
      const disciplinaId = form.disciplinaId.value;
      const professorId = form.professorId ? form.professorId.value || null : null;
      const turno = form.turno.value;
      const periodo = form.periodo.value.trim();

      if (!campoObrigatorioPreenchido(nome) || !cursoId || !disciplinaId || !turno) {
        mostrarToast('Preencha nome, curso, disciplina e turno.', 'erro');
        return;
      }

      // ENVIANDO EXATAMENTE NO FORMATO DO SEU SQL (curso_id, disciplina_id, professor_id)
      const dados = { 
        nome, 
        curso_id: cursoId, 
        disciplina_id: disciplinaId, 
        professor_id: professorId, 
        turno, 
        periodo 
      };

      if (idEmEdicao) {
        await dbAtualizar('turmas', idEmEdicao, dados);
        mostrarToast('Turma atualizada.', 'sucesso');
        idEmEdicao = null;
      } else {
        await dbInserir('turmas', dados);
        mostrarToast('Turma criada.', 'sucesso');
      }
      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  async function montarLista() {
    areaLista.innerHTML = '';
    const turmas = await dbListar('turmas');
    const matriculas = await dbListar('matriculas');

    if (turmas.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
        criarElemento('div', { class: 'estado-vazio' }, ['Nenhuma turma criada ainda.'])
      ]));
      return;
    }

    const tabela = criarElemento('table', {});
    tabela.appendChild(criarElemento('thead', {}, [
      criarElemento('tr', {}, [
        criarElemento('th', {}, ['Turma']),
        criarElemento('th', {}, ['Disciplina']),
        criarElemento('th', {}, ['Professor']),
        criarElemento('th', {}, ['Turno']),
        criarElemento('th', {}, ['Alunos']),
        criarElemento('th', {}, ['Ações'])
      ])
    ]));

    const corpo = criarElemento('tbody', {});
    for (const turma of turmas) {
      const idDisciplina = turma.disciplina_id || turma.disciplinaId;
      const idProfessor = turma.professor_id || turma.professorId;

      const disciplina = idDisciplina ? await dbBuscarPorId('disciplinas', idDisciplina) : null;
      const professor = idProfessor ? await dbBuscarPorId('professores', idProfessor) : null;
      
      const qtdAlunos = matriculas.filter((m) => (m.turma_id || m.turmaId) === turma.id).length;

      corpo.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [turma.nome]),
        criarElemento('td', {}, [disciplina ? disciplina.nome : '—']),
        criarElemento('td', {}, [professor ? professor.nome : criarElemento('span', { class: 'tag' }, ['a definir'])]),
        criarElemento('td', {}, [turma.turno]),
        criarElemento('td', {}, [criarElemento('span', { class: 'tag' }, [`${qtdAlunos} matriculado(s)`])]),
        criarElemento('td', { class: 'celula-acoes' }, [
          criarElemento('button', {
            class: 'btn-icone',
            onClick: async () => { 
              idEmEdicao = turma.id; 
              await montarFormulario(); 
              areaFormulario.scrollIntoView({ behavior: 'smooth' }); 
            }
          }, ['Editar']),
          criarElemento('button', {
            class: 'btn-perigo',
            onClick: async () => {
              if (!confirmarAcao(`Excluir a turma "${turma.nome}"?`)) return;
              await dbRemover('turmas', turma.id);
              
              const matriculasParaRemover = matriculas.filter((m) => (m.turma_id || m.turmaId) === turma.id);
              for (const m of matriculasParaRemover) {
                await dbRemover('matriculas', m.id);
              }
              
              mostrarToast('Turma excluída.', 'sucesso');
              await montarLista();
            }
          }, ['Excluir'])
        ])
      ]));
    }
    tabela.appendChild(corpo);

    areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [tabela]));
  }

  await montarFormulario();
  await montarLista();
}

window.renderSecaoTurmas = renderSecaoTurmas;

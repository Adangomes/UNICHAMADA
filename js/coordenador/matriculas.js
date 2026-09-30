/**
 * matriculas.js — Matrículas (Coordenador)
 * Mapeia os dados do front para o padrão do banco (aluno_id, turma_id, data_matricula)
 */

async function renderSecaoMatriculas(container) {
  container.innerHTML = '';

  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Matrículas']),
      criarElemento('p', {}, ['Matricule alunos nas turmas já criadas.'])
    ])
  ]);

  const grade = criarElemento('div', { class: 'grade-secao' });
  const areaFormulario = criarElemento('div', { class: 'cartao' });
  const areaLista = criarElemento('div', {});
  grade.append(areaFormulario, areaLista);
  container.append(cabecalho, grade);

  async function montarFormulario() {
    areaFormulario.innerHTML = '';
    const alunos = await dbListar('alunos');
    const turmas = await dbListar('turmas');

    const opcoesTurmas = await Promise.all(
      turmas.map(async (t) => {
        const idDisciplina = t.disciplina_id || t.disciplinaId;
        const disciplina = idDisciplina ? await dbBuscarPorId('disciplinas', idDisciplina) : null;
        const rotulo = disciplina ? `${t.nome} — ${disciplina.nome}` : t.nome;
        return criarElemento('option', { value: t.id }, [rotulo]);
      })
    );

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, ['Nova matrícula']));

    const campoAluno = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Aluno']),
      criarElemento('select', { name: 'alunoId', required: 'true' }, [
        criarElemento('option', { value: '' }, ['Selecione o aluno']),
        ...alunos.map((a) => criarElemento('option', { value: a.id }, [`${a.nome} (RA ${a.ra})`]))
      ])
    ]);

    const campoTurma = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Turma']),
      criarElemento('select', { name: 'turmaId', required: 'true' }, [
        criarElemento('option', { value: '' }, ['Selecione a turma']),
        ...opcoesTurmas
      ])
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, ['Matricular aluno'])
    ]);

    form.append(campoAluno, campoTurma, botoes);

    if (alunos.length === 0 || turmas.length === 0) {
      form.appendChild(criarElemento('p', { style: 'font-size:.78rem;color:var(--coral);margin-top:.6em;' }, ['Cadastre ao menos um aluno e uma turma antes de matricular.']));
    }

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const alunoId = form.alunoId.value;
      const turmaId = form.turmaId.value;

      if (!alunoId || !turmaId) {
        mostrarToast('Selecione aluno e turma.', 'erro');
        return;
      }

      const matriculas = await dbListar('matriculas');
      const jaMatriculado = matriculas.find((m) => {
        const mAlunoId = m.aluno_id || m.alunoId;
        const mTurmaId = m.turma_id || m.turmaId;
        return mAlunoId === alunoId && mTurmaId === turmaId;
      });

      if (jaMatriculado) {
        mostrarToast('Este aluno já está matriculado nessa turma.', 'erro');
        return;
      }

      // ENVIANDO EXATAMENTE NO FORMATO DO SEU SQL (aluno_id, turma_id, data_matricula)
      const dados = { 
        aluno_id: alunoId, 
        turma_id: turmaId, 
        data_matricula: new Date().toISOString() 
      };

      await dbInserir('matriculas', dados);
      mostrarToast('Matrícula realizada.', 'sucesso');
      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  async function montarLista() {
    areaLista.innerHTML = '';
    const matriculas = await dbListar('matriculas');

    if (matriculas.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
        criarElemento('div', { class: 'estado-vazio' }, ['Nenhuma matrícula registrada ainda.'])
      ]));
      return;
    }

    const tabela = criarElemento('table', {});
    tabela.appendChild(criarElemento('thead', {}, [
      criarElemento('tr', {}, [
        criarElemento('th', {}, ['Aluno']),
        criarElemento('th', {}, ['RA']),
        criarElemento('th', {}, ['Turma']),
        criarElemento('th', {}, ['Data']),
        criarElemento('th', {}, ['Ações'])
      ])
    ]));

    const corpo = criarElemento('tbody', {});
    for (const matricula of matriculas) {
      const idAluno = matricula.aluno_id || matricula.alunoId;
      const idTurma = matricula.turma_id || matricula.turmaId;
      const dataMatricula = matricula.data_matricula || matricula.dataMatricula;

      const aluno = idAluno ? await dbBuscarPorId('alunos', idAluno) : null;
      const turma = idTurma ? await dbBuscarPorId('turmas', idTurma) : null;

      corpo.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [aluno ? aluno.nome : '(aluno removido)']),
        criarElemento('td', { class: 'mono' }, [aluno ? aluno.ra : '—']),
        criarElemento('td', {}, [turma ? turma.nome : '(turma removida)']),
        criarElemento('td', {}, [formatarData(dataMatricula)]),
        criarElemento('td', { class: 'celula-acoes' }, [
          criarElemento('button', {
            class: 'btn-perigo',
            onClick: async () => {
              if (!confirmarAcao('Cancelar esta matrícula?')) return;
              await dbRemover('matriculas', matricula.id);
              mostrarToast('Matrícula cancelada.', 'sucesso');
              await montarLista();
            }
          }, ['Cancelar'])
        ])
      ]));
    }
    tabela.appendChild(corpo);

    areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [tabela]));
  }

  await montarFormulario();
  await montarLista();
}

window.renderSecaoMatriculas = renderSecaoMatriculas;

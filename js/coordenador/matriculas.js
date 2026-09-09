/**
 * matriculas.js — Matrículas (Coordenador)
 * Matricula: { alunoId, turmaId, dataMatricula }
 */

function renderSecaoMatriculas(container) {
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

  function montarFormulario() {
    areaFormulario.innerHTML = '';
    const alunos = dbListar('alunos');
    const turmas = dbListar('turmas');

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
        ...turmas.map((t) => {
          const disciplina = dbBuscarPorId('disciplinas', t.disciplinaId);
          const rotulo = disciplina ? `${t.nome} — ${disciplina.nome}` : t.nome;
          return criarElemento('option', { value: t.id }, [rotulo]);
        })
      ])
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, ['Matricular aluno'])
    ]);

    form.append(campoAluno, campoTurma, botoes);

    if (alunos.length === 0 || turmas.length === 0) {
      form.appendChild(criarElemento('p', { style: 'font-size:.78rem;color:var(--coral);margin-top:.6em;' }, ['Cadastre ao menos um aluno e uma turma antes de matricular.']));
    }

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const alunoId = form.alunoId.value;
      const turmaId = form.turmaId.value;

      if (!alunoId || !turmaId) {
        mostrarToast('Selecione aluno e turma.', 'erro');
        return;
      }

      const jaMatriculado = dbListar('matriculas').find((m) => m.alunoId === alunoId && m.turmaId === turmaId);
      if (jaMatriculado) {
        mostrarToast('Este aluno já está matriculado nessa turma.', 'erro');
        return;
      }

      dbInserir('matriculas', { alunoId, turmaId, dataMatricula: new Date().toISOString() });
      mostrarToast('Matrícula realizada.', 'sucesso');
      montarFormulario();
      montarLista();
    });

    areaFormulario.appendChild(form);
  }

  function montarLista() {
    areaLista.innerHTML = '';
    const matriculas = dbListar('matriculas');

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
    matriculas.forEach((matricula) => {
      const aluno = dbBuscarPorId('alunos', matricula.alunoId);
      const turma = dbBuscarPorId('turmas', matricula.turmaId);
      corpo.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [aluno ? aluno.nome : '(aluno removido)']),
        criarElemento('td', { class: 'mono' }, [aluno ? aluno.ra : '—']),
        criarElemento('td', {}, [turma ? turma.nome : '(turma removida)']),
        criarElemento('td', {}, [formatarData(matricula.dataMatricula)]),
        criarElemento('td', { class: 'celula-acoes' }, [
          criarElemento('button', {
            class: 'btn-perigo',
            onClick: () => {
              if (!confirmarAcao('Cancelar esta matrícula?')) return;
              dbRemover('matriculas', matricula.id);
              mostrarToast('Matrícula cancelada.', 'sucesso');
              montarLista();
            }
          }, ['Cancelar'])
        ])
      ]));
    });
    tabela.appendChild(corpo);

    areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [tabela]));
  }

  montarFormulario();
  montarLista();
}

window.renderSecaoMatriculas = renderSecaoMatriculas;

/**
 * alunos.js — Cadastro de Alunos (Coordenador)
 * Aluno: { nome, ra, email, fotoRosto, cursoId }
 */

function renderSecaoAlunos(container) {
  container.innerHTML = '';

  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Alunos']),
      criarElemento('p', {}, ['Cadastre alunos com RA, e-mail e foto do rosto (câmera ou galeria).'])
    ])
  ]);

  const grade = criarElemento('div', { class: 'grade-secao' });
  const areaFormulario = criarElemento('div', { class: 'cartao' });
  const areaLista = criarElemento('div', {});
  grade.append(areaFormulario, areaLista);
  container.append(cabecalho, grade);

  let idEmEdicao = null;
  let fotoAtual = '';

  function montarFormulario() {
    areaFormulario.innerHTML = '';
    const aluno = idEmEdicao ? dbBuscarPorId('alunos', idEmEdicao) : null;
    fotoAtual = aluno?.fotoRosto || '';

    const cursos = dbListar('cursos');

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar aluno' : 'Novo aluno']));

    const containerFoto = criarElemento('div', {});
    form.appendChild(containerFoto);

    const campoNome = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Nome completo']),
      criarElemento('input', { type: 'text', name: 'nome', required: 'true', value: aluno?.nome || '' })
    ]);

    const linha1 = criarElemento('div', { class: 'linha-campos' }, [
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['RA']),
        criarElemento('input', { type: 'text', name: 'ra', required: 'true', 'data-mono': 'true', value: aluno?.ra || '' })
      ]),
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['E-mail']),
        criarElemento('input', { type: 'email', name: 'email', required: 'true', value: aluno?.email || '' })
      ])
    ]);

    const campoCurso = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Curso']),
      criarElemento('select', { name: 'cursoId', required: 'true' }, [
        criarElemento('option', { value: '' }, ['Selecione um curso']),
        ...cursos.map((c) => criarElemento('option', { value: c.id, ...(aluno?.cursoId === c.id ? { selected: 'true' } : {}) }, [c.nome]))
      ])
    ]);

    if (cursos.length === 0) {
      campoCurso.appendChild(criarElemento('p', { style: 'font-size:.78rem;color:var(--coral);margin-top:.3em;' }, ['Cadastre um curso antes de cadastrar alunos.']));
    }

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, [idEmEdicao ? 'Salvar alterações' : 'Cadastrar aluno'])
    ]);
    if (idEmEdicao) {
      botoes.appendChild(criarElemento('button', {
        type: 'button', class: 'btn-secundario',
        onClick: () => { idEmEdicao = null; montarFormulario(); }
      }, ['Cancelar']));
    }

    form.append(campoNome, linha1, campoCurso, botoes);

    montarCapturaFoto(containerFoto, fotoAtual, (dataUrl) => { fotoAtual = dataUrl; });

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();
      const ra = form.ra.value.trim();
      const email = form.email.value.trim();
      const cursoId = form.cursoId.value;

      if (!campoObrigatorioPreenchido(nome) || !campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email) || !cursoId) {
        mostrarToast('Preencha nome, RA, e-mail e curso.', 'erro');
        return;
      }
      if (!emailValido(email)) {
        mostrarToast('E-mail inválido.', 'erro');
        return;
      }

      const duplicado = dbListar('alunos').find(
        (a) => a.ra.toUpperCase() === ra.toUpperCase() && a.id !== idEmEdicao
      );
      if (duplicado) {
        mostrarToast('Já existe um aluno com esse RA.', 'erro');
        return;
      }

      const dados = { nome, ra, email, cursoId, fotoRosto: fotoAtual };

      if (idEmEdicao) {
        dbAtualizar('alunos', idEmEdicao, dados);
        mostrarToast('Aluno atualizado.', 'sucesso');
        idEmEdicao = null;
      } else {
        dbInserir('alunos', dados);
        mostrarToast('Aluno cadastrado.', 'sucesso');
      }
      montarFormulario();
      montarLista();
    });

    areaFormulario.appendChild(form);
  }

  function montarLista() {
    areaLista.innerHTML = '';
    const alunos = dbListar('alunos');

    if (alunos.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
        criarElemento('div', { class: 'estado-vazio' }, ['Nenhum aluno cadastrado ainda.'])
      ]));
      return;
    }

    const tabela = criarElemento('table', {});
    tabela.appendChild(criarElemento('thead', {}, [
      criarElemento('tr', {}, [
        criarElemento('th', {}, ['Foto']),
        criarElemento('th', {}, ['Nome']),
        criarElemento('th', {}, ['RA']),
        criarElemento('th', {}, ['E-mail']),
        criarElemento('th', {}, ['Curso']),
        criarElemento('th', {}, ['Ações'])
      ])
    ]));

    const corpo = criarElemento('tbody', {});
    alunos.forEach((aluno) => {
      const curso = dbBuscarPorId('cursos', aluno.cursoId);
      corpo.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [criarElemento('img', { class: 'celula-foto', src: aluno.fotoRosto || iconePadraoFoto(), alt: `Foto de ${aluno.nome}` })]),
        criarElemento('td', {}, [aluno.nome]),
        criarElemento('td', { class: 'mono' }, [aluno.ra]),
        criarElemento('td', {}, [aluno.email]),
        criarElemento('td', {}, [curso ? curso.nome : '—']),
        criarElemento('td', { class: 'celula-acoes' }, [
          criarElemento('button', {
            class: 'btn-icone',
            onClick: () => { idEmEdicao = aluno.id; montarFormulario(); areaFormulario.scrollIntoView({ behavior: 'smooth' }); }
          }, ['Editar']),
          criarElemento('button', {
            class: 'btn-perigo',
            onClick: () => {
              if (!confirmarAcao(`Excluir o aluno "${aluno.nome}"?`)) return;
              dbRemover('alunos', aluno.id);
              // remove também matrículas associadas para manter integridade referencial
              dbListar('matriculas').filter((m) => m.alunoId === aluno.id).forEach((m) => dbRemover('matriculas', m.id));
              mostrarToast('Aluno excluído.', 'sucesso');
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

window.renderSecaoAlunos = renderSecaoAlunos;

/**
 * professores.js — Cadastro de Professores (Coordenador)
 * Professor: { nome, ra, email }
 * OBS: o e-mail é necessário porque o login do professor é feito por RA + e-mail.
 */

function renderSecaoProfessores(container) {
  container.innerHTML = '';

  const cabecalho = criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Professores']),
      criarElemento('p', {}, ['Cadastre os professores. Eles acessam o próprio painel com RA + e-mail.'])
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
    const professor = idEmEdicao ? dbBuscarPorId('professores', idEmEdicao) : null;

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar professor' : 'Novo professor']));

    const campoNome = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Nome completo']),
      criarElemento('input', { type: 'text', name: 'nome', required: 'true', value: professor?.nome || '' })
    ]);

    const linha = criarElemento('div', { class: 'linha-campos' }, [
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['RA']),
        criarElemento('input', { type: 'text', name: 'ra', required: 'true', 'data-mono': 'true', value: professor?.ra || '' })
      ]),
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['E-mail']),
        criarElemento('input', { type: 'email', name: 'email', required: 'true', value: professor?.email || '' })
      ])
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, [idEmEdicao ? 'Salvar alterações' : 'Cadastrar professor'])
    ]);
    if (idEmEdicao) {
      botoes.appendChild(criarElemento('button', {
        type: 'button', class: 'btn-secundario',
        onClick: () => { idEmEdicao = null; montarFormulario(); }
      }, ['Cancelar']));
    }

    form.append(campoNome, linha, botoes);

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();
      const ra = form.ra.value.trim();
      const email = form.email.value.trim();

      if (!campoObrigatorioPreenchido(nome) || !campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
        mostrarToast('Preencha nome, RA e e-mail.', 'erro');
        return;
      }
      if (!emailValido(email)) {
        mostrarToast('E-mail inválido.', 'erro');
        return;
      }

      const duplicado = dbListar('professores').find(
        (p) => p.ra.toUpperCase() === ra.toUpperCase() && p.id !== idEmEdicao
      );
      if (duplicado) {
        mostrarToast('Já existe um professor com esse RA.', 'erro');
        return;
      }

      if (idEmEdicao) {
        dbAtualizar('professores', idEmEdicao, { nome, ra, email });
        mostrarToast('Professor atualizado.', 'sucesso');
        idEmEdicao = null;
      } else {
        dbInserir('professores', { nome, ra, email });
        mostrarToast('Professor cadastrado.', 'sucesso');
      }
      montarFormulario();
      montarLista();
    });

    areaFormulario.appendChild(form);
  }

  function montarLista() {
    areaLista.innerHTML = '';
    const professores = dbListar('professores');

    if (professores.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
        criarElemento('div', { class: 'estado-vazio' }, ['Nenhum professor cadastrado ainda.'])
      ]));
      return;
    }

    const tabela = criarElemento('table', {});
    tabela.appendChild(criarElemento('thead', {}, [
      criarElemento('tr', {}, [
        criarElemento('th', {}, ['Nome']),
        criarElemento('th', {}, ['RA']),
        criarElemento('th', {}, ['E-mail']),
        criarElemento('th', {}, ['Disciplinas']),
        criarElemento('th', {}, ['Ações'])
      ])
    ]));

    const corpo = criarElemento('tbody', {});
    professores.forEach((professor) => {
      const qtd = dbListar('disciplinas').filter((d) => d.professorId === professor.id).length;
      corpo.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [professor.nome]),
        criarElemento('td', { class: 'mono' }, [professor.ra]),
        criarElemento('td', {}, [professor.email]),
        criarElemento('td', {}, [criarElemento('span', { class: 'tag' }, [`${qtd} disciplina(s)`])]),
        criarElemento('td', { class: 'celula-acoes' }, [
          criarElemento('button', {
            class: 'btn-icone',
            onClick: () => { idEmEdicao = professor.id; montarFormulario(); areaFormulario.scrollIntoView({ behavior: 'smooth' }); }
          }, ['Editar']),
          criarElemento('button', {
            class: 'btn-perigo',
            onClick: () => {
              if (!confirmarAcao(`Excluir o professor "${professor.nome}"?`)) return;
              dbRemover('professores', professor.id);
              mostrarToast('Professor excluído.', 'sucesso');
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

window.renderSecaoProfessores = renderSecaoProfessores;

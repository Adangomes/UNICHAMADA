/**
 * disciplinas.js — Cadastro de Disciplinas (Coordenador)
 * Mapeia os dados do front para o padrão do banco (curso_id, carga_horaria, professor_id)
 */

/**
 * Renderiza a seção de Disciplinas: formulário de cadastro/edição vinculando
 * a disciplina a um curso, turno e (opcionalmente) um professor responsável,
 * mais a listagem das disciplinas já cadastradas.
 */
async function renderSecaoDisciplinas(container) {
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

  // Controla se o form está em modo cadastro (null) ou edição (id da disciplina)
  let idEmEdicao = null;

  /**
   * (Re)monta o formulário de cadastro/edição de disciplina.
   * Carrega cursos e professores pra popular os selects, e se estiver em
   * modo edição, pré-seleciona os valores atuais da disciplina.
   */
  async function montarFormulario() {
    areaFormulario.innerHTML = '';
    const disciplina = idEmEdicao ? await dbBuscarPorId('disciplinas', idEmEdicao) : null;
    const cursos = await dbListar('cursos');
    const professores = await dbListar('professores');

    const form = criarElemento('form', {});
    form.appendChild(criarElemento('h3', {}, [idEmEdicao ? 'Editar disciplina' : 'Nova disciplina']));

    const campoNome = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Nome da disciplina']),
      criarElemento('input', { type: 'text', name: 'nome', required: 'true', value: disciplina?.nome || '' })
    ]);

    // O banco salva como curso_id (snake_case), mas em algum momento o app
    // pode ter passado a usar cursoId (camelCase) — então checa os dois
    // formatos pra não quebrar caso existam registros salvos nos dois padrões.
    const cursoAtualId = disciplina?.curso_id || disciplina?.cursoId || '';
    const campoCurso = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Curso vinculado']),
      criarElemento('select', { name: 'cursoId', required: 'true' }, [
        criarElemento('option', { value: '' }, ['Selecione o curso']),
        // Monta uma <option> por curso, marcando como "selected" a que
        // corresponde ao curso atual da disciplina (no modo edição)
        ...cursos.map((c) => criarElemento('option', { value: c.id, ...(cursoAtualId === c.id ? { selected: 'true' } : {}) }, [c.nome]))
      ])
    ]);

    // Mesmo cuidado aqui: carga_horaria pode vir tanto em snake_case quanto
    // em cargaHoraria dependendo de como o registro foi salvo.
    // Usa !== undefined porque 0 é um valor válido (não pode cair no fallback à toa)
    const cargaAtual = disciplina?.carga_horaria !== undefined ? disciplina.carga_horaria : (disciplina?.cargaHoraria || '');
    const linha = criarElemento('div', { class: 'linha-campos' }, [
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['Turno']),
        criarElemento('select', { name: 'turno', required: 'true' }, [
          criarElemento('option', { value: '' }, ['Selecione']),
          // TURNOS é uma constante global (definida em outro arquivo) com as
          // opções fixas de turno, tipo ['Manhã', 'Tarde', 'Noite']
          ...TURNOS.map((t) => criarElemento('option', { value: t, ...(disciplina?.turno === t ? { selected: 'true' } : {}) }, [t]))
        ])
      ]),
      criarElemento('div', { class: 'campo' }, [
        criarElemento('label', {}, ['Carga horária (h)']),
        criarElemento('input', { type: 'number', name: 'cargaHoraria', min: '1', value: cargaAtual })
      ])
    ]);

    // Mesmo padrão de fallback snake_case/camelCase usado no curso
    const professorAtualId = disciplina?.professor_id || disciplina?.professorId || '';
    const campoProfessor = criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Professor responsável']),
      criarElemento('select', { name: 'professorId' }, [
        // Professor não é obrigatório — pode ficar "a definir"
        criarElemento('option', { value: '' }, ['A definir']),
        ...professores.map((p) => criarElemento('option', { value: p.id, ...(professorAtualId === p.id ? { selected: 'true' } : {}) }, [p.nome]))
      ])
    ]);

    const botoes = criarElemento('div', { style: 'display:flex; gap:.6em; margin-top:.4em;' }, [
      criarElemento('button', { type: 'submit', class: 'btn-primario' }, [idEmEdicao ? 'Salvar alterações' : 'Cadastrar disciplina'])
    ]);
    if (idEmEdicao) {
      botoes.appendChild(criarElemento('button', {
        type: 'button', class: 'btn-secundario',
        onClick: async () => { idEmEdicao = null; await montarFormulario(); }
      }, ['Cancelar']));
    }

    form.append(campoNome, campoCurso, linha, campoProfessor, botoes);

    // Aviso pro coordenador caso ainda não exista nenhum curso cadastrado —
    // sem curso, não dá pra vincular a disciplina a nada
    if (cursos.length === 0) {
      form.appendChild(criarElemento('p', { style: 'font-size:.78rem;color:var(--coral);margin-top:.6em;' }, ['Cadastre ao menos um curso antes de criar disciplinas.']));
    }

    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      const nome = form.nome.value.trim();
      const cursoId = form.cursoId.value;
      const turno = form.turno.value;
      // Converte pra number só se tiver valor preenchido; senão manda null
      const cargaHoraria = form.cargaHoraria.value ? Number(form.cargaHoraria.value) : null;
      // Professor é opcional — string vazia vira null
      const professorId = form.professorId.value || null;

      // Nome, curso e turno são obrigatórios; carga horária e professor não
      if (!campoObrigatorioPreenchido(nome) || !cursoId || !turno) {
        mostrarToast('Preencha nome, curso e turno.', 'erro');
        return;
      }

      // Aqui já salva direto no formato que o banco espera (snake_case),
      // independente de como os campos do form estão nomeados
      const dados = { 
        nome, 
        curso_id: cursoId, 
        turno, 
        carga_horaria: cargaHoraria, 
        professor_id: professorId 
      };

      if (idEmEdicao) {
        await dbAtualizar('disciplinas', idEmEdicao, dados);
        mostrarToast('Disciplina atualizada.', 'sucesso');
        idEmEdicao = null;
      } else {
        await dbInserir('disciplinas', dados);
        mostrarToast('Disciplina cadastrada.', 'sucesso');
      }
      await montarFormulario();
      await montarLista();
    });

    areaFormulario.appendChild(form);
  }

  /**
   * (Re)monta a lista de disciplinas cadastradas, exibindo o nome do
   * curso e do professor vinculados (buscando cada um no banco).
   */
  async function montarLista() {
    areaLista.innerHTML = '';
    const disciplinas = await dbListar('disciplinas');

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
    for (const disciplina of disciplinas) {
      // De novo, cobre os dois formatos possíveis de nome de campo
      const idCurso = disciplina.curso_id || disciplina.cursoId;
      const idProfessor = disciplina.professor_id || disciplina.professorId;

      // Busca o nome do curso e do professor pra exibir na tabela
      // (o registro da disciplina guarda só o id, não o nome)
      const curso = idCurso ? await dbBuscarPorId('cursos', idCurso) : null;
      const professor = idProfessor ? await dbBuscarPorId('professores', idProfessor) : null;
      
      corpo.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [disciplina.nome]),
        // Se por algum motivo o curso não for encontrado (foi excluído, por ex.), mostra "—"
        criarElemento('td', {}, [curso ? curso.nome : '—']),
        criarElemento('td', {}, [disciplina.turno]),
        // Sem professor definido, mostra uma tag "a definir" em vez de célula vazia
        criarElemento('td', {}, [professor ? professor.nome : criarElemento('span', { class: 'tag' }, ['a definir'])]),
        criarElemento('td', { class: 'celula-acoes' }, [
          criarElemento('button', {
            class: 'btn-icone',
            onClick: async () => { 
              idEmEdicao = disciplina.id; 
              await montarFormulario(); 
              areaFormulario.scrollIntoView({ behavior: 'smooth' }); 
            }
          }, ['Editar']),
          criarElemento('button', {
            class: 'btn-perigo',
            onClick: async () => {
              if (!confirmarAcao(`Excluir a disciplina "${disciplina.nome}"?`)) return;
              await dbRemover('disciplinas', disciplina.id);
              mostrarToast('Disciplina excluída.', 'sucesso');
              await montarLista();
            }
          }, ['Excluir'])
        ])
      ]));
    }
    tabela.appendChild(corpo);

    areaLista.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [tabela]));
  }

  // Monta o form (vazio) e a lista assim que a seção é aberta
  await montarFormulario();
  await montarLista();
}

// Expõe globalmente pra ser chamada pelo painel do coordenador
window.renderSecaoDisciplinas = renderSecaoDisciplinas;

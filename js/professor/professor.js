/**
 * professor.js — Painel do professor, com duas abas:
 *  - "Chamadas": central de chamadas — gerar chamada rápido por turma e
 *    ver TODAS as chamadas já feitas (de todas as turmas), com opção
 *    de ajustar presença/falta manualmente. É o coração do sistema,
 *    por isso é a aba que abre primeiro.
 *  - "Minhas turmas": turmas/disciplinas atribuídas pela coordenação.
 */

let elementoConteudoProfessor = null;
let abaAtivaProfessor = 'chamadas';
let pararAssinaturaAbaProfessor = null;
let professorLogado = null;

const ABAS_PROFESSOR = [
  { chave: 'chamadas', rotulo: 'Chamadas', render: (container, prof) => renderAbaChamadas(container, prof) },
  { chave: 'turmas', rotulo: 'Minhas turmas', render: (container, prof) => renderAbaTurmas(container, prof) }
];

async function montarPainelProfessor(sessao) {
  professorLogado = sessao.dados;
  const tela = $('#tela-professor');
  tela.innerHTML = '';

  tela.appendChild(montarCabecalhoPainel(sessao, 'professor'));

  const corpo = criarElemento('div', { class: 'painel-corpo' });
  const nav = criarElemento('nav', { class: 'painel-nav' });
  elementoConteudoProfessor = criarElemento('section', { class: 'painel-conteudo' });

  ABAS_PROFESSOR.forEach((aba) => {
    const botao = criarElemento('button', {
      class: aba.chave === abaAtivaProfessor ? 'ativo' : '',
      onClick: () => selecionarAbaProfessor(aba.chave, nav)
    }, [aba.rotulo]);
    botao.dataset.chave = aba.chave;
    nav.appendChild(botao);
  });

  corpo.append(nav, elementoConteudoProfessor);
  tela.appendChild(corpo);

  await renderizarAbaAtivaProfessor();
}

async function selecionarAbaProfessor(chave, nav) {
  abaAtivaProfessor = chave;
  $all('button', nav).forEach((btn) => btn.classList.toggle('ativo', btn.dataset.chave === chave));
  await renderizarAbaAtivaProfessor();
}

async function renderizarAbaAtivaProfessor() {
  if (pararAssinaturaAbaProfessor) { 
    pararAssinaturaAbaProfessor(); 
    pararAssinaturaAbaProfessor = null; 
  }
  const aba = ABAS_PROFESSOR.find((a) => a.chave === abaAtivaProfessor);
  await aba.render(elementoConteudoProfessor, professorLogado);
}

/* ============================== ABA: CHAMADAS ============================== */

async function renderAbaChamadas(container, professor) {
  container.innerHTML = '';

  const todasturmas = await dbListar('turmas');
  const turmas = todasturmas.filter((t) => t.professorId === professor.id);

  container.appendChild(criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Chamadas']),
      criarElemento('p', {}, ['Gere a chamada de uma turma e acompanhe/ajuste todas as chamadas já feitas.'])
    ])
  ]));

  if (turmas.length === 0) {
    container.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
      criarElemento('div', { class: 'estado-vazio' }, ['A coordenação ainda não atribuiu turmas a você.'])
    ]));
    return;
  }

  // ---- Ações rápidas: uma linha por turma pra gerar chamada na hora ----
  const acoesRapidas = criarElemento('div', { class: 'chamadas-acoes-rapidas' });
  const todasChamadas = await dbListar('chamadas');

  for (const turma of turmas) {
    const disciplina = turma.disciplinaId ? await dbBuscarPorId('disciplinas', turma.disciplinaId) : null;
    const chamadaAtiva = todasChamadas.find((c) => c.turmaId === turma.id && c.ativa);

    acoesRapidas.appendChild(criarElemento('div', { class: 'chamada-acao-rapida' }, [
      criarElemento('div', {}, [
        criarElemento('strong', {}, [turma.nome]),
        criarElemento('span', {}, [disciplina ? disciplina.nome : 'Disciplina não definida'])
      ]),
      criarElemento('button', {
        class: chamadaAtiva ? 'btn-secundario' : 'btn-primario',
        onClick: () => abrirModalChamada(turma, professor)
      }, [chamadaAtiva ? 'Chamada em andamento — continuar' : 'GERAR CHAMADA'])
    ]));
  }
  container.appendChild(acoesRapidas);

  // ---- Todas as chamadas já feitas, de todas as turmas ----
  container.appendChild(criarElemento('h3', { style: 'margin:1.6em 0 .8em;' }, ['Todas as chamadas']));

  const areaLista = criarElemento('div', { class: 'historico-lista' });
  container.appendChild(areaLista);

  async function renderizarTodasChamadas() {
    areaLista.innerHTML = '';
    const idsTurmas = turmas.map((t) => t.id);
    const chamadasAtuais = await dbListar('chamadas');
    const chamadasFiltradas = chamadasAtuais
      .filter((c) => idsTurmas.includes(c.turmaId))
      .sort((a, b) => new Date(b.geradaEm) - new Date(a.geradaEm));

    if (chamadasFiltradas.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'estado-vazio' }, ['Nenhuma chamada foi gerada ainda. Use os botões acima para começar.']));
      return;
    }

    for (const chamada of chamadasFiltradas) {
      const turma = turmas.find((t) => t.id === chamada.turmaId);
      if (!turma) continue;
      const cardComTurma = await montarCartaoChamadaComTurma(chamada, turma, renderizarTodasChamadas);
      areaLista.appendChild(cardComTurma);
    }
  }

  await renderizarTodasChamadas();

  if (typeof dbAoAtualizar === 'function') {
    pararAssinaturaAbaProfessor = dbAoAtualizar(async () => await renderizarTodasChamadas());
  }
}

/** Igual ao card do histórico, mas com uma etiqueta da turma em cima (lista é de várias turmas juntas). */
async function montarCartaoChamadaComTurma(chamada, turma, aoAtualizar) {
  const rotuloTurma = criarElemento('div', { class: 'chamada-card-turma-label' }, [turma.nome]);
  const card = await montarCartaoChamadaHistorico(chamada, turma, aoAtualizar);
  return criarElemento('div', {}, [rotuloTurma, card]);
}

/* ============================== ABA: MINHAS TURMAS ============================== */

async function renderAbaTurmas(container, professor) {
  container.innerHTML = '';

  const todasturmas = await dbListar('turmas');
  const turmas = todasturmas.filter((t) => t.professorId === professor.id);

  const todasDisciplinas = await dbListar('disciplinas');
  const disciplinas = todasDisciplinas.filter((d) => d.professorId === professor.id);

  const todasMatriculas = await dbListar('matriculas');
  const totalAlunos = new Set(
    todasMatriculas
      .filter((m) => turmas.some((t) => t.id === m.turmaId))
      .map((m) => m.alunoId)
  ).size;

  container.appendChild(criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Minhas turmas']),
      criarElemento('p', {}, ['Disciplinas e turmas atribuídas a você pela coordenação.'])
    ])
  ]));

  container.appendChild(criarElemento('div', { class: 'grade-resumo' }, [
    cartaoResumo(disciplinas.length, 'Disciplinas'),
    cartaoResumo(turmas.length, 'Turmas'),
    cartaoResumo(totalAlunos, 'Alunos')
  ]));

  if (turmas.length === 0) {
    container.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
      criarElemento('div', { class: 'estado-vazio' }, ['A coordenação ainda não atribuiu turmas a você.'])
    ]));
  } else {
    const lista = criarElemento('div', { class: 'lista-turmas-professor' });
    for (const turma of turmas) {
      const itemTurma = await montarItemTurma(turma, professor);
      lista.appendChild(itemTurma);
    }
    container.appendChild(lista);
  }
}

function cartaoResumo(numero, rotulo) {
  return criarElemento('div', { class: 'cartao cartao-resumo' }, [
    criarElemento('div', { class: 'numero' }, [String(numero)]),
    criarElemento('div', { class: 'rotulo' }, [rotulo])
  ]);
}

async function montarItemTurma(turma, professor) {
  const disciplina = turma.disciplinaId ? await dbBuscarPorId('disciplinas', turma.disciplinaId) : null;
  const curso = turma.cursoId ? await dbBuscarPorId('cursos', turma.cursoId) : null;
  
  const todasMatriculas = await dbListar('matriculas');
  const matriculas = todasMatriculas.filter((m) => m.turmaId === turma.id);

  const btnGerarChamada = criarElemento('button', {
    class: 'btn-primario',
    onClick: () => abrirModalChamada(turma, professor)
  }, ['GERAR CHAMADA']);

  const cabecalho = criarElemento('div', { class: 'cabecalho-turma' }, [
    criarElemento('div', {}, [
      criarElemento('h4', {}, [`${turma.nome}${disciplina ? ' — ' + disciplina.nome : ''}`]),
      criarElemento('span', { class: 'tag' }, [`${turma.turno}${turma.periodo ? ' · ' + turma.periodo : ''}`])
    ]),
    criarElemento('div', { class: 'turma-acoes' }, [btnGerarChamada])
  ]);

  const meta = criarElemento('p', { class: 'alunos-matriculados' }, [
    `${curso ? curso.nome : 'Curso não definido'} · ${matriculas.length} aluno(s) matriculado(s)`
  ]);

  const item = criarElemento('div', { class: 'item-turma' }, [cabecalho, meta]);

  if (matriculas.length > 0) {
    const tabelaWrap = criarElemento('div', { class: 'tabela-wrap oculto', style: 'margin-top:.8em;' });
    const tabela = criarElemento('table', {});
    tabela.appendChild(criarElemento('thead', {}, [
      criarElemento('tr', {}, [
        criarElemento('th', {}, ['Foto']),
        criarElemento('th', {}, ['Aluno']),
        criarElemento('th', {}, ['RA']),
        criarElemento('th', {}, ['E-mail'])
      ])
    ]));
    
    const corpoTabela = criarElemento('tbody', {});
    for (const matricula of matriculas) {
      const aluno = await dbBuscarPorId('alunos', matricula.alunoId);
      if (!aluno) continue;
      corpoTabela.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [criarElemento('img', { class: 'celula-foto', src: aluno.fotoRosto || iconePadraoFoto(), alt: `Foto de ${aluno.nome}` })]),
        criarElemento('td', {}, [aluno.nome]),
        criarElemento('td', { class: 'mono' }, [aluno.ra]),
        criarElemento('td', {}, [aluno.email])
      ]));
    }
    
    tabela.appendChild(corpoTabela);
    tabelaWrap.appendChild(tabela);

    const btnVerAlunos = criarElemento('button', { class: 'btn-link-discreto' }, ['Ver lista de alunos ▾']);
    btnVerAlunos.addEventListener('click', () => {
      const visivel = !tabelaWrap.classList.contains('oculto');
      tabelaWrap.classList.toggle('oculto', visivel);
      btnVerAlunos.textContent = visivel ? 'Ver lista de alunos ▾' : 'Ocultar lista de alunos ▴';
    });

    item.append(btnVerAlunos, tabelaWrap);
  }

  return item;
}

window.montarPainelProfessor = montarPainelProfessor;

/**
 * @fileoverview professor.js — Módulo do Painel do Professor
 * 
 * Este módulo gerencia o ciclo de vida da interface gráfica e funcionalidades
 * do painel do professor, incluindo:
 *  - Montagem e inicialização do cabeçalho com indicador de notificações (sino/badge);
 *  - Roteamento interno entre abas ("Chamadas" e "Minhas turmas");
 *  - Geração e acompanhamento de chamadas em tempo real com barreira anti-duplicação;
 *  - Tabela de frequência mensal (aluno x data) por turma, no lugar de uma lista
 *    infinita de cartões — evita que o histórico cresça sem controle ao longo do tempo;
 *  - Visualização de turmas e listagem de alunos matriculados.
 * 
 * @module PainelProfessor
 * @requires dbListar
 * @requires dbBuscarPorId
 * @requires dbAtualizar
 * @requires dbInserir
 * @requires dbAoAtualizar
 * @requires montarCabecalhoPainel
 * @requires inicializarSinoNotificacoes
 * @requires abrirModalChamada
 * @requires alunosMatriculadosNaTurma
 * @requires ROTULOS_STATUS_PRESENCA
 * @requires criarElemento
 * @requires $
 * @requires $all
 */

/**
 * Referência para o container dinâmico de conteúdo da aba ativa.
 * @type {HTMLElement|null}
 */
let elementoConteudoProfessor = null;

/**
 * Chave identificadora da aba ativa no momento.
 * @type {string}
 */
let abaAtivaProfessor = 'chamadas';

/**
 * Função de limpeza/desinscrição do listener de reatividade do banco de dados para a aba ativa.
 * @type {Function|null}
 */
let pararAssinaturaAbaProfessor = null;

/**
 * Dados do professor atualmente autenticado no sistema.
 * @type {Object|null}
 */
let professorLogado = null;

/**
 * Mapeamento das abas disponíveis e suas respetivas funções de renderização.
 * @type {Array<{chave: string, rotulo: string, render: Function}>}
 */
const ABAS_PROFESSOR = [
  { chave: 'chamadas', rotulo: 'Chamadas', render: (container, prof) => renderAbaChamadas(container, prof) },
  { chave: 'turmas', rotulo: 'Minhas turmas', render: (container, prof) => renderAbaTurmas(container, prof) }
];

/**
 * Nomes dos meses em português, usados para rotular as abas de mês da tabela de frequência.
 * @type {Array<string>}
 */
const NOMES_MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/**
 * Símbolo curto exibido dentro da célula de status de cada aluno na tabela de frequência.
 * @type {Object<string, string>}
 */
const SIMBOLOS_STATUS_PRESENCA = {
  aguardando: '–',
  presente: '✓',
  falta: '✕',
  falta_justificada: 'J'
};

/**
 * Ordem de ciclo ao clicar manualmente numa célula de frequência
 * (não inclui "aguardando" pois esse é o estado inicial, antes de qualquer confirmação).
 * @type {Array<string>}
 */
const ORDEM_CICLO_STATUS_FREQUENCIA = ['presente', 'falta', 'falta_justificada'];

/**
 * Ponto de entrada do painel do professor. Inicializa a estrutura do DOM, o cabeçalho,
 * o componente de notificações e carrega a aba padrão.
 *
 * @async
 * @param {Object} sessao - Objeto contendo a sessão ativa e dados do professor.
 * @returns {Promise<void>}
 */
async function montarPainelProfessor(sessao) {
  // Trata e garante acesso aos dados do professor com fallback para objeto vazio
  professorLogado = sessao?.dados || sessao || {};
  
  const tela = $('#tela-professor');
  tela.innerHTML = '';

  // 1. Renderiza o cabeçalho padrão
  const cabecalho = montarCabecalhoPainel({ dados: professorLogado }, 'professor');
  tela.appendChild(cabecalho);

  // 2. Inicializa o módulo de notificações (sino + badge numérico de avisos)
  if (typeof inicializarSinoNotificacoes === 'function') {
    await inicializarSinoNotificacoes(cabecalho, professorLogado);
  }

  // 3. Monta a estrutura da área de conteúdo e navegação por abas
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

  // 4. Renderiza a aba ativa inicial
  await renderizarAbaAtivaProfessor();
}

/**
 * Altera a aba ativa do painel e re-renderiza a interface.
 *
 * @async
 * @param {string} chave - Chave identificadora da aba selecionada.
 * @param {HTMLElement} nav - Elemento `<nav>` contendo os botões de seleção.
 * @returns {Promise<void>}
 */
async function selecionarAbaProfessor(chave, nav) {
  abaAtivaProfessor = chave;
  $all('button', nav).forEach((btn) => btn.classList.toggle('ativo', btn.dataset.chave === chave));
  await renderizarAbaAtivaProfessor();
}

/**
 * Executa a desmontagem de assinaturas antigas e renderiza o conteúdo da aba selecionada.
 *
 * @async
 * @returns {Promise<void>}
 */
async function renderizarAbaAtivaProfessor() {
  if (pararAssinaturaAbaProfessor) { 
    pararAssinaturaAbaProfessor(); 
    pararAssinaturaAbaProfessor = null; 
  }
  const aba = ABAS_PROFESSOR.find((a) => a.chave === abaAtivaProfessor);
  if (aba) {
    await aba.render(elementoConteudoProfessor, professorLogado);
  }
}

/* ==========================================================================
   ABA: CHAMADAS
   ========================================================================== */

/**
 * Renderiza a aba de gerenciamento de chamadas: ações rápidas por turma
 * (gerar chamada) e, abaixo, a tabela de frequência mensal.
 *
 * @async
 * @param {HTMLElement} container - Elemento do DOM onde a aba será montada.
 * @param {Object} professor - Dados do professor autenticado.
 * @returns {Promise<void>}
 */
async function renderAbaChamadas(container, professor) {
  container.innerHTML = '';

  const todasturmas = await dbListar('turmas');
  const turmas = todasturmas.filter((t) => {
    const pId = t.professor_id || t.professorId;
    return pId === professor.id;
  });

  container.appendChild(criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Chamadas']),
      criarElemento('p', {}, ['Gere a chamada de uma turma e acompanhe/ajuste a frequência de cada aluno.'])
    ])
  ]));

  if (turmas.length === 0) {
    container.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
      criarElemento('div', { class: 'estado-vazio' }, ['A coordenação ainda não atribuiu turmas a você.'])
    ]));
    return;
  }

  // ---- Seção: Ações Rápidas (Atalhos por Turma) ----
  const acoesRapidas = criarElemento('div', { class: 'chamadas-acoes-rapidas' });
  const todasChamadasIniciais = await dbListar('chamadas');

  for (const turma of turmas) {
    const idDisciplina = turma.disciplina_id || turma.disciplinaId;
    const disciplina = idDisciplina ? await dbBuscarPorId('disciplinas', idDisciplina) : null;
    
    const chamadaAtiva = todasChamadasIniciais.find((c) => {
      const tId = c.turma_id || c.turmaId;
      return tId === turma.id && c.ativa;
    });

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

  // ---- Seção: Frequência (tabela mensal aluno x data, por turma) ----
  container.appendChild(criarElemento('h3', { style: 'margin: 1.6em 0 .5em;' }, ['Frequências']));

  const painelFreq = criarElemento('div', { class: 'freq-painel' });
  container.appendChild(painelFreq);

  // Estado local da tabela de frequência: qual turma, ano e mês estão selecionados
  let turmaFreqId = turmas[0].id;
  let anoFreqSelecionado = null;
  let mesFreqSelecionado = null; // 1 a 12
  let renderizandoFreq = false;

  /**
   * (Re)desenha o painel de frequência: filtros (turma/ano/mês) + tabela aluno x data.
   * A barra de meses sempre mostra os 12 meses do ano selecionado — os que ainda não
   * têm chamada ficam esmaecidos, e vão "acendendo" conforme o professor gera chamadas.
   * @async
   */
  async function renderizarFrequencias() {
    if (renderizandoFreq) return;
    renderizandoFreq = true;

    try {
      painelFreq.innerHTML = '';

      const turmaAtual = turmas.find((t) => t.id === turmaFreqId) || turmas[0];
      turmaFreqId = turmaAtual.id;

      const todasChamadas = await dbListar('chamadas');
      const chamadasTurma = todasChamadas
        .filter((c) => (c.turma_id || c.turmaId) === turmaAtual.id)
        .sort((a, b) => {
          const dataA = new Date(a.gerada_em || a.geradaEm);
          const dataB = new Date(b.gerada_em || b.geradaEm);
          return dataA - dataB;
        });

      // Agrupa as chamadas por mês (chave 'AAAA-MM') pra saber quais meses já têm dado
      const chamadasPorChaveMes = new Map();
      for (const chamada of chamadasTurma) {
        const data = new Date(chamada.gerada_em || chamada.geradaEm);
        const chaveMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        if (!chamadasPorChaveMes.has(chaveMes)) chamadasPorChaveMes.set(chaveMes, []);
        chamadasPorChaveMes.get(chaveMes).push(chamada);
      }

      // Anos disponíveis pra navegar: do mais antigo com chamada até o ano atual real
      // (assim o professor sempre consegue ver o ano corrente, mesmo sem chamadas ainda)
      const anoAtualReal = new Date().getFullYear();
      const anosComChamada = chamadasTurma.map((c) => new Date(c.gerada_em || c.geradaEm).getFullYear());
      const anoMin = anosComChamada.length ? Math.min(...anosComChamada, anoAtualReal) : anoAtualReal;
      const anoMax = anosComChamada.length ? Math.max(...anosComChamada, anoAtualReal) : anoAtualReal;
      const anosDisponiveis = [];
      for (let ano = anoMin; ano <= anoMax; ano++) anosDisponiveis.push(ano);

      // Seleção padrão: ano/mês da chamada mais recente, ou o mês atual se não houver nenhuma
      if (!anoFreqSelecionado || !mesFreqSelecionado) {
        if (chamadasTurma.length > 0) {
          const maisRecente = chamadasTurma[chamadasTurma.length - 1];
          const dataRecente = new Date(maisRecente.gerada_em || maisRecente.geradaEm);
          anoFreqSelecionado = dataRecente.getFullYear();
          mesFreqSelecionado = dataRecente.getMonth() + 1;
        } else {
          anoFreqSelecionado = anoAtualReal;
          mesFreqSelecionado = new Date().getMonth() + 1;
        }
      }

      // ---- Linha de filtros: turma (se houver mais de uma) à esquerda, ano à direita ----
      const filhosFiltros = [];

      if (turmas.length > 1) {
        const seletorTurma = criarElemento('select', { class: 'freq-select-turma' });
        turmas.forEach((t) => {
          const opcao = criarElemento('option', { value: t.id }, [t.nome]);
          if (t.id === turmaAtual.id) opcao.selected = true;
          seletorTurma.appendChild(opcao);
        });
        seletorTurma.addEventListener('change', () => {
          turmaFreqId = seletorTurma.value;
          anoFreqSelecionado = null;
          mesFreqSelecionado = null; // volta a escolher o ano/mês mais recente da nova turma
          renderizarFrequencias();
        });
        filhosFiltros.push(criarElemento('label', { class: 'freq-label-select' }, ['Turma', seletorTurma]));
      }

      const indiceAno = anosDisponiveis.indexOf(anoFreqSelecionado);
      const temAnoAnterior = indiceAno > 0;
      const temAnoProximo = indiceAno < anosDisponiveis.length - 1;

      filhosFiltros.push(criarElemento('div', { class: 'freq-stepper-ano' }, [
        criarElemento('button', {
          class: `freq-stepper-seta${temAnoAnterior ? '' : ' desabilitado'}`,
          title: 'Ano anterior',
          onClick: () => {
            if (!temAnoAnterior) return;
            anoFreqSelecionado = anosDisponiveis[indiceAno - 1];
            renderizarFrequencias();
          }
        }, ['‹']),
        criarElemento('span', { class: 'freq-stepper-valor' }, [String(anoFreqSelecionado)]),
        criarElemento('button', {
          class: `freq-stepper-seta${temAnoProximo ? '' : ' desabilitado'}`,
          title: 'Próximo ano',
          onClick: () => {
            if (!temAnoProximo) return;
            anoFreqSelecionado = anosDisponiveis[indiceAno + 1];
            renderizarFrequencias();
          }
        }, ['›'])
      ]));

      painelFreq.appendChild(criarElemento('div', { class: 'freq-filtros' }, filhosFiltros));

      // Abas de mês — os 12 meses do ano selecionado, sempre visíveis;
      // os que ainda não têm chamada ficam com a classe "sem-dados" (esmaecida).
      const tabsMeses = criarElemento('div', { class: 'freq-tabs' });
      NOMES_MESES_PT.forEach((nomeMes, indice) => {
        const numeroMes = indice + 1;
        const chaveMes = `${anoFreqSelecionado}-${String(numeroMes).padStart(2, '0')}`;
        const temChamada = chamadasPorChaveMes.has(chaveMes);
        const classes = [
          numeroMes === mesFreqSelecionado ? 'ativo' : '',
          temChamada ? '' : 'sem-dados'
        ].filter(Boolean).join(' ');
        const botaoMes = criarElemento('button', {
          class: classes,
          title: temChamada ? '' : 'Nenhuma chamada gerada neste mês ainda',
          onClick: () => { mesFreqSelecionado = numeroMes; renderizarFrequencias(); }
        }, [nomeMes]);
        tabsMeses.appendChild(botaoMes);
      });
      painelFreq.appendChild(tabsMeses);

      const chaveMesSelecionado = `${anoFreqSelecionado}-${String(mesFreqSelecionado).padStart(2, '0')}`;
      const chamadasDoMes = chamadasPorChaveMes.get(chaveMesSelecionado) || [];

      if (chamadasDoMes.length === 0) {
        const mensagem = chamadasTurma.length === 0
          ? 'Nenhuma chamada foi gerada ainda para esta turma.'
          : `Nenhuma chamada gerada em ${NOMES_MESES_PT[mesFreqSelecionado - 1]}.`;
        painelFreq.appendChild(criarElemento('div', { class: 'tabela-wrap' }, [
          criarElemento('div', { class: 'estado-vazio' }, [mensagem])
        ]));
        return;
      }

      const alunosDaTurma = await alunosMatriculadosNaTurma(turmaAtual.id);
      const presencas = await dbListar('presencas');

      const areaTabela = criarElemento('div', { class: 'freq-tabela-wrap' });

      if (alunosDaTurma.length === 0) {
        areaTabela.appendChild(criarElemento('div', { class: 'estado-vazio' }, ['Nenhum aluno matriculado nesta turma ainda.']));
        painelFreq.appendChild(areaTabela);
        return;
      }

      const tabela = criarElemento('table', { class: 'freq-tabela' });

      const linhaCabecalho = criarElemento('tr', {}, [
        criarElemento('th', { class: 'freq-th-aluno' }, ['Aluno'])
      ]);
      chamadasDoMes.forEach((chamada) => {
        const data = new Date(chamada.gerada_em || chamada.geradaEm);
        const rotuloData = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const filhosTh = [criarElemento('span', {}, [rotuloData])];
        if (chamada.ativa) {
          filhosTh.push(criarElemento('span', { class: 'freq-badge-ativa' }, ['ativa']));
        }
        linhaCabecalho.appendChild(criarElemento('th', {
          class: 'freq-th-data',
          title: data.toLocaleString('pt-BR')
        }, filhosTh));
      });
      tabela.appendChild(criarElemento('thead', {}, [linhaCabecalho]));

      const corpoTabela = criarElemento('tbody', {});

      for (const aluno of alunosDaTurma) {
        const linha = criarElemento('tr', {});

        linha.appendChild(criarElemento('td', { class: 'freq-td-aluno' }, [
          criarElemento('img', {
            class: 'celula-foto celula-foto-mini',
            src: aluno.foto_rosto || aluno.fotoRosto || iconePadraoFoto(),
            alt: `Foto de ${aluno.nome}`
          }),
          criarElemento('div', {}, [
            criarElemento('strong', {}, [aluno.nome]),
            criarElemento('span', { class: 'mono freq-ra' }, [`RA ${aluno.ra}`])
          ])
        ]));

        chamadasDoMes.forEach((chamada) => {
          const presenca = presencas.find((p) => {
            const cId = p.chamada_id || p.chamadaId;
            const aId = p.aluno_id || p.alunoId;
            return cId === chamada.id && aId === aluno.id;
          });
          const status = presenca ? presenca.status : 'aguardando';

          linha.appendChild(criarElemento('td', { class: 'freq-td-status' }, [
            criarElemento('button', {
              class: `freq-status-botao status-${status}`,
              title: `${ROTULOS_STATUS_PRESENCA[status]} — clique para alterar manualmente`,
              onClick: async () => {
                await alternarStatusFrequencia(aluno, chamada, turmaAtual, status);
                await renderizarFrequencias();
              }
            }, [SIMBOLOS_STATUS_PRESENCA[status]])
          ]));
        });

        corpoTabela.appendChild(linha);
      }

      tabela.appendChild(corpoTabela);
      areaTabela.appendChild(tabela);
      painelFreq.appendChild(areaTabela);
    } finally {
      renderizandoFreq = false;
    }
  }

  await renderizarFrequencias();

  // Assina atualizações reativas no banco de dados com debounce de 150ms
  if (typeof dbAoAtualizar === 'function') {
    pararAssinaturaAbaProfessor = dbAoAtualizar(async () => {
      setTimeout(async () => {
        await renderizarFrequencias();
      }, 150);
    });
  }
}

/**
 * Avança manualmente o status de presença de um aluno numa chamada específica,
 * seguindo o ciclo Presente → Falta → Falta justificada → Presente...
 * (equivalente aos botões manuais do modal de chamada, só que direto na célula da tabela).
 *
 * @async
 * @param {Object} aluno - Aluno cujo status será alterado.
 * @param {Object} chamada - Chamada (coluna da tabela) sendo editada.
 * @param {Object} turma - Turma associada, usada ao criar um novo registro de presença.
 * @param {string} statusAtual - Status atual da célula, antes da alteração.
 * @returns {Promise<void>}
 */
async function alternarStatusFrequencia(aluno, chamada, turma, statusAtual) {
  const proximoStatus = statusAtual === 'aguardando'
    ? 'presente'
    : ORDEM_CICLO_STATUS_FREQUENCIA[(ORDEM_CICLO_STATUS_FREQUENCIA.indexOf(statusAtual) + 1) % ORDEM_CICLO_STATUS_FREQUENCIA.length];

  const presencas = await dbListar('presencas');
  const existente = presencas.find((p) => {
    const cId = p.chamada_id || p.chamadaId;
    const aId = p.aluno_id || p.alunoId;
    return cId === chamada.id && aId === aluno.id;
  });

  const timestamp = new Date().toISOString();
  if (existente) {
    await dbAtualizar('presencas', existente.id, {
      status: proximoStatus,
      origem: 'manual',
      confirmado_em: timestamp
    });
  } else {
    await dbInserir('presencas', {
      chamada_id: chamada.id,
      turma_id: turma.id,
      aluno_id: aluno.id,
      status: proximoStatus,
      origem: 'manual',
      confirmado_em: timestamp
    });
  }
}

/* ==========================================================================
   ABA: MINHAS TURMAS
   ========================================================================== */

/**
 * Renderiza a aba com informações resumidas de disciplinas, turmas e alunos matriculados.
 *
 * @async
 * @param {HTMLElement} container - Elemento do DOM onde a aba será montada.
 * @param {Object} professor - Dados do professor autenticado.
 * @returns {Promise<void>}
 */
async function renderAbaTurmas(container, professor) {
  container.innerHTML = '';

  const todasturmas = await dbListar('turmas');
  const turmas = todasturmas.filter((t) => {
    const pId = t.professor_id || t.professorId;
    return pId === professor.id;
  });

  const todasDisciplinas = await dbListar('disciplinas');
  const disciplinas = todasDisciplinas.filter((d) => {
    const pId = d.professor_id || d.professorId;
    return pId === professor.id;
  });

  const todasMatriculas = await dbListar('matriculas');
  const totalAlunos = new Set(
    todasMatriculas
      .filter((m) => {
        const tId = m.turma_id || m.turmaId;
        return turmas.some((t) => t.id === tId);
      })
      .map((m) => m.aluno_id || m.alunoId)
  ).size;

  container.appendChild(criarElemento('div', { class: 'secao-cabecalho' }, [
    criarElemento('div', {}, [
      criarElemento('h2', {}, ['Minhas turmas']),
      criarElemento('p', {}, ['Disciplinas e turmas atribuídas a você pela coordenação.'])
    ])
  ]));

  // Cartões de métricas e resumo
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

/**
 * Cria um cartão individual de resumo com número destacado e rótulo.
 *
 * @param {number|string} numero - Valor numérico a ser exibido.
 * @param {string} rotulo - Texto explicativo do métrico.
 * @returns {HTMLElement} Elemento do cartão construído.
 */
function cartaoResumo(numero, rotulo) {
  return criarElemento('div', { class: 'cartao cartao-resumo' }, [
    criarElemento('div', { class: 'numero' }, [String(numero)]),
    criarElemento('div', { class: 'rotulo' }, [rotulo])
  ]);
}

/**
 * Monta o item expansível com os detalhes da turma e a tabela de alunos matriculados.
 *
 * @async
 * @param {Object} turma - Objeto da turma.
 * @param {Object} professor - Objeto do professor logado.
 * @returns {Promise<HTMLElement>} Elemento da turma montado.
 */
async function montarItemTurma(turma, professor) {
  const idDisciplina = turma.disciplina_id || turma.disciplinaId;
  const idCurso = turma.curso_id || turma.cursoId;

  const disciplina = idDisciplina ? await dbBuscarPorId('disciplinas', idDisciplina) : null;
  const curso = idCurso ? await dbBuscarPorId('cursos', idCurso) : null;
  
  const todasMatriculas = await dbListar('matriculas');
  const matriculas = todasMatriculas.filter((m) => {
    const tId = m.turma_id || m.turmaId;
    return tId === turma.id;
  });

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

  // Lista interativa de alunos matriculados
  if (matriculas.length > 0) {
    const tabelaWrap = criarElemento('div', { class: 'tabela-wrap oculto', style: 'margin-top: .8em;' });
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
      const aId = matricula.aluno_id || matricula.alunoId;
      const aluno = await dbBuscarPorId('alunos', aId);
      if (!aluno) continue;
      const fotoRosto = aluno.foto_rosto || aluno.fotoRosto || iconePadraoFoto();
      
      corpoTabela.appendChild(criarElemento('tr', {}, [
        criarElemento('td', {}, [criarElemento('img', { class: 'celula-foto', src: fotoRosto, alt: `Foto de ${aluno.nome}` })]),
        criarElemento('td', {}, [aluno.nome]),
        criarElemento('td', { class: 'mono' }, [aluno.ra]),
        criarElemento('td', {}, [aluno.email])
      ]));
    }
    
    tabela.appendChild(corpoTabela);
    tabelaWrap.appendChild(tabela);

    // Botão de alternância para expansão da tabela de alunos
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

// Expõe a função de montagem do painel no escopo global
window.montarPainelProfessor = montarPainelProfessor;

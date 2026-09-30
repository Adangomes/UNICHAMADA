/**
 * historico.js — Histórico de chamadas (Professor)
 * ------------------------------------------------------------------
 * Lista todas as chamadas já geradas para uma turma (mais recente
 * primeiro). Cada uma pode ser expandida pra ver/ajustar a presença
 * de cada aluno — inclusive chamadas já encerradas, caso o professor
 * precise corrigir uma falta ou marcar uma justificativa depois.
 * ------------------------------------------------------------------
 */

async function abrirModalHistorico(turma, professor) {
  const idDisciplina = turma.disciplina_id || turma.disciplinaId;
  const disciplina = idDisciplina ? await dbBuscarPorId('disciplinas', idDisciplina) : null;

  const btnFechar = criarElemento('button', { class: 'btn-icone', title: 'Fechar' }, ['✕ Fechar']);
  const areaLista = criarElemento('div', { class: 'historico-lista' });

  const topo = criarElemento('div', { class: 'chamada-topo' }, [
    criarElemento('div', {}, [
      criarElemento('h3', {}, [`Histórico de chamadas — ${turma.nome}`]),
      criarElemento('p', {}, [disciplina ? disciplina.nome : 'Disciplina não definida'])
    ]),
    btnFechar
  ]);

  const cartao = criarElemento('div', { class: 'chamada-cartao historico-cartao' }, [topo, criarElemento('div', { class: 'historico-corpo' }, [areaLista])]);
  const modal = criarElemento('div', { class: 'chamada-modal' }, [cartao]);
  document.body.appendChild(modal);

  async function renderizarLista() {
    areaLista.innerHTML = '';
    const todasChamadas = await dbListar('chamadas');
    const chamadas = todasChamadas
      .filter((c) => (c.turma_id || c.turmaId) === turma.id)
      .sort((a, b) => {
        const dataA = new Date(a.gerada_em || a.geradaEm);
        const dataB = new Date(b.gerada_em || b.geradaEm);
        return dataB - dataA;
      });

    if (chamadas.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'estado-vazio' }, ['Nenhuma chamada foi gerada nesta turma ainda.']));
      return;
    }

    for (const chamada of chamadas) {
      const cartaoChamada = await montarCartaoChamadaHistorico(chamada, turma, renderizarLista);
      areaLista.appendChild(cartaoChamada);
    }
  }

  await renderizarLista();

  let pararAssinatura = null;
  if (typeof dbAoAtualizar === 'function') {
    pararAssinatura = dbAoAtualizar(async () => await renderizarLista());
  }

  function fecharModal() {
    if (pararAssinatura) pararAssinatura();
    modal.remove();
  }
  btnFechar.addEventListener('click', fecharModal);
  modal.addEventListener('click', (evento) => { if (evento.target === modal) fecharModal(); });
}

async function montarCartaoChamadaHistorico(chamada, turma, aoAtualizar) {
  const alunosDaTurma = await alunosMatriculadosNaTurma(turma.id);
  const todasPresencas = await dbListar('presencas');
  const presencasDaChamada = todasPresencas.filter((p) => (p.chamada_id || p.chamadaId) === chamada.id);

  const contagem = { presente: 0, falta: 0, falta_justificada: 0, aguardando: 0 };
  alunosDaTurma.forEach((aluno) => {
    const presenca = presencasDaChamada.find((p) => (p.aluno_id || p.alunoId) === aluno.id);
    contagem[presenca ? presenca.status : 'aguardando']++;
  });

  const dataGeracao = chamada.gerada_em || chamada.geradaEm;

  const cabecalho = criarElemento('button', { class: 'historico-item-cabecalho' }, [
    criarElemento('div', { class: 'historico-item-data' }, [
      criarElemento('strong', {}, [formatarDataHora(dataGeracao)]),
      criarElemento('span', { class: `tag ${chamada.ativa ? 'tag-status-presente' : ''}` }, [chamada.ativa ? 'Ativa' : 'Encerrada'])
    ]),
    criarElemento('div', { class: 'historico-item-resumo' }, [
      criarElemento('span', { class: 'tag tag-status-presente' }, [`${contagem.presente} presente(s)`]),
      criarElemento('span', { class: 'tag tag-status-falta' }, [`${contagem.falta} falta(s)`]),
      criarElemento('span', { class: 'tag tag-status-falta_justificada' }, [`${contagem.falta_justificada} justificada(s)`]),
      contagem.aguardando ? criarElemento('span', { class: 'tag' }, [`${contagem.aguardando} sem registro`]) : null
    ]),
    criarElemento('span', { class: 'historico-seta' }, ['▾'])
  ]);

  const corpoExpandido = criarElemento('div', { class: 'historico-item-alunos oculto' });

  async function preencherAlunos() {
    corpoExpandido.innerHTML = '';
    if (alunosDaTurma.length === 0) {
      corpoExpandido.appendChild(criarElemento('div', { class: 'estado-vazio' }, ['Nenhum aluno matriculado.']));
      return;
    }

    const presencasAtualizadas = await dbListar('presencas');
    for (const aluno of alunosDaTurma) {
      const presenca = presencasAtualizadas.find((p) => {
        const cId = p.chamada_id || p.chamadaId;
        const aId = p.aluno_id || p.alunoId;
        return cId === chamada.id && aId === aluno.id;
      });
      corpoExpandido.appendChild(
        montarLinhaAlunoChamada(aluno, presenca, chamada, turma, async () => {
          await preencherAlunos();
          await aoAtualizar();
        })
      );
    }
  }

  let aberto = false;
  cabecalho.addEventListener('click', async () => {
    aberto = !aberto;
    corpoExpandido.classList.toggle('oculto', !aberto);
    cabecalho.classList.toggle('historico-item-cabecalho-aberto', aberto);
    if (aberto) await preencherAlunos();
  });

  return criarElemento('div', { class: 'historico-item' }, [cabecalho, corpoExpandido]);
}

function formatarDataHora(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  return data.toLocaleDateString('pt-BR') + ' às ' + data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

window.abrirModalHistorico = abrirModalHistorico;

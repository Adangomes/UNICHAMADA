/**
 * chamada.js — Geração de chamada (Professor)
 * ------------------------------------------------------------------
 * Fluxo:
 *  1. Professor clica em "Gerar chamada" numa turma.
 *  2. Abre um modal com QR Code (link pra tela de confirmação do aluno)
 *     e um código curto que muda a cada 45s (INTERVALO_ROTACAO_MS).
 *  3. A lista de alunos da turma aparece embaixo, cinza (aguardando).
 *     Conforme os alunos confirmam presença pelo celular, a linha
 *     deles fica verde — automaticamente, via dbAoAtualizar().
 *  4. O professor também pode marcar manualmente: Presente / Falta /
 *     Falta justificada — pra quem não tem celular.
 * ------------------------------------------------------------------
 */

let paradaAssinaturaChamada = null;
let cronometroRotacaoCodigo = null;

const ROTULOS_STATUS_PRESENCA = {
  aguardando: 'Aguardando',
  presente: 'Presente',
  falta: 'Falta',
  falta_justificada: 'Falta justificada'
};

function obterOuCriarChamadaAtiva(turmaId, professorId) {
  const existente = dbListar('chamadas').find((c) => c.turmaId === turmaId && c.ativa);
  if (existente) return existente;

  return dbInserir('chamadas', {
    turmaId,
    professorId,
    codigoAtual: gerarCodigoChamada(),
    codigoAnterior: null,
    geradaEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    ativa: true
  });
}

function abrirModalChamada(turma, professor) {
  const chamada = obterOuCriarChamadaAtiva(turma.id, professor.id);
  const disciplina = dbBuscarPorId('disciplinas', turma.disciplinaId);

  const linkConfirmacao = `${window.location.origin}${window.location.pathname}#presenca/${chamada.id}`;

  const btnFechar = criarElemento('button', { class: 'btn-icone', title: 'Fechar' }, ['✕ Fechar']);
  const btnEncerrar = criarElemento('button', { class: 'btn-perigo' }, ['Encerrar chamada']);
  const btnDestacar = criarElemento('button', {
    class: 'btn-secundario',
    title: 'Abrir o QR Code e o código em uma janela separada, pra arrastar pro telão/projetor',
    onClick: () => abrirJanelaTelao(chamada.id)
  }, ['🖥️ Destacar pro telão']);

  const areaQr = criarElemento('div', { class: 'chamada-qr' });
  const areaCodigo = criarElemento('div', { class: 'chamada-codigo' });
  const areaBarraTempo = criarElemento('div', { class: 'chamada-barra-tempo' }, [criarElemento('div', { class: 'chamada-barra-preenchimento' })]);
  const areaLista = criarElemento('div', { class: 'chamada-lista' });

  const topo = criarElemento('div', { class: 'chamada-topo' }, [
    criarElemento('div', {}, [
      criarElemento('h3', {}, [`Chamada — ${turma.nome}`]),
      criarElemento('p', {}, [disciplina ? disciplina.nome : 'Disciplina não definida'])
    ]),
    criarElemento('div', { style: 'display:flex; gap:.5em; flex-wrap:wrap; justify-content:flex-end;' }, [btnDestacar, btnEncerrar, btnFechar])
  ]);

  const corpo = criarElemento('div', { class: 'chamada-corpo' }, [
    criarElemento('div', { class: 'chamada-lado-qr' }, [
      areaQr,
      areaCodigo,
      areaBarraTempo,
      criarElemento('p', { class: 'chamada-instrucao' }, [
        'O aluno lê o QR Code (ou acessa o link), confirma RA, e-mail, rosto e localização, e por fim digita este código.'
      ])
    ]),
    criarElemento('div', { class: 'chamada-lado-lista' }, [
      criarElemento('h4', {}, ['Alunos da turma']),
      areaLista
    ])
  ]);

  const cartao = criarElemento('div', { class: 'chamada-cartao' }, [topo, corpo]);
  const modal = criarElemento('div', { class: 'chamada-modal' }, [cartao]);
  document.body.appendChild(modal);

  // gera o QR code (biblioteca davidshimjs/qrcodejs carregada no index.html)
  // eslint-disable-next-line no-undef
  new QRCode(areaQr, { text: linkConfirmacao, width: 168, height: 168, colorDark: '#1F2D50', colorLight: '#ffffff' });

  function renderizarCodigo() {
    const atual = dbBuscarPorId('chamadas', chamada.id);
    if (!atual || !atual.ativa) return;
    areaCodigo.textContent = atual.codigoAtual;
  }

  function reiniciarBarraTempo() {
    const preenchimento = areaBarraTempo.querySelector('.chamada-barra-preenchimento');
    preenchimento.style.transition = 'none';
    preenchimento.style.width = '100%';
    // força repaint antes de religar a transição
    void preenchimento.offsetWidth;
    preenchimento.style.transition = `width ${INTERVALO_ROTACAO_MS}ms linear`;
    preenchimento.style.width = '0%';
  }

  function rotacionarCodigo() {
    const atual = dbBuscarPorId('chamadas', chamada.id);
    if (!atual || !atual.ativa) return;
    dbAtualizar('chamadas', chamada.id, {
      codigoAnterior: atual.codigoAtual,
      codigoAtual: gerarCodigoChamada(),
      atualizadoEm: new Date().toISOString()
    });
    renderizarCodigo();
    reiniciarBarraTempo();
  }

  function renderizarLista() {
    areaLista.innerHTML = '';
    const alunosDaTurma = alunosMatriculadosNaTurma(turma.id);

    if (alunosDaTurma.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'estado-vazio' }, ['Nenhum aluno matriculado nesta turma ainda.']));
      return;
    }

    alunosDaTurma.forEach((aluno) => {
      const presenca = dbListar('presencas').find((p) => p.chamadaId === chamada.id && p.alunoId === aluno.id);
      areaLista.appendChild(montarLinhaAlunoChamada(aluno, presenca, chamada, turma, () => renderizarLista()));
    });
  }

  renderizarCodigo();
  reiniciarBarraTempo();
  renderizarLista();

  cronometroRotacaoCodigo = setInterval(rotacionarCodigo, INTERVALO_ROTACAO_MS);
  paradaAssinaturaChamada = dbAoAtualizar(() => {
    renderizarLista();
    renderizarCodigo();
  });

  function fecharModal() {
    if (cronometroRotacaoCodigo) clearInterval(cronometroRotacaoCodigo);
    if (paradaAssinaturaChamada) paradaAssinaturaChamada();
    modal.remove();
  }

  btnFechar.addEventListener('click', fecharModal);
  modal.addEventListener('click', (evento) => { if (evento.target === modal) fecharModal(); });

  btnEncerrar.addEventListener('click', () => {
    if (!confirmarAcao('Encerrar esta chamada? Alunos não vão mais conseguir confirmar presença por ela.')) return;
    dbAtualizar('chamadas', chamada.id, { ativa: false });
    mostrarToast('Chamada encerrada.', 'sucesso');
    fecharModal();
  });
}

function abrirJanelaTelao(chamadaId) {
  const link = `${window.location.origin}${window.location.pathname}#telao/${chamadaId}`;
  const janela = window.open(link, `telao-${chamadaId}`, 'width=460,height=680,menubar=no,toolbar=no,location=no,status=no');
  if (janela) janela.focus();
  else mostrarToast('O navegador bloqueou o pop-up. Permita pop-ups para destacar o telão.', 'erro');
}

function alunosMatriculadosNaTurma(turmaId) {
  const idsAlunos = dbListar('matriculas').filter((m) => m.turmaId === turmaId).map((m) => m.alunoId);
  return dbListar('alunos').filter((a) => idsAlunos.includes(a.id));
}

function montarLinhaAlunoChamada(aluno, presenca, chamada, turma, aoAtualizar) {
  const status = presenca ? presenca.status : 'aguardando';

  const bolinha = criarElemento('span', { class: `bolinha-status status-${status}` });
  const foto = criarElemento('img', { class: 'celula-foto', src: aluno.fotoRosto || iconePadraoFoto(), alt: `Foto de ${aluno.nome}` });

  const info = criarElemento('div', { class: 'chamada-aluno-info' }, [
    criarElemento('strong', {}, [aluno.nome]),
    criarElemento('span', { class: 'mono' }, [`RA ${aluno.ra}`])
  ]);

  const tagStatus = criarElemento('span', { class: `tag tag-status-${status}` }, [ROTULOS_STATUS_PRESENCA[status]]);

  function marcar(novoStatus) {
    const existente = dbListar('presencas').find((p) => p.chamadaId === chamada.id && p.alunoId === aluno.id);
    if (existente) {
      dbAtualizar('presencas', existente.id, { status: novoStatus, origem: 'manual', confirmadoEm: new Date().toISOString() });
    } else {
      dbInserir('presencas', {
        chamadaId: chamada.id, turmaId: turma.id, alunoId: aluno.id,
        status: novoStatus, origem: 'manual', confirmadoEm: new Date().toISOString()
      });
    }
    aoAtualizar();
  }

  const acoesManuais = criarElemento('div', { class: 'chamada-acoes-manuais' }, [
    criarElemento('button', { class: 'btn-mini btn-mini-presente', title: 'Marcar presente', onClick: () => marcar('presente') }, ['Presente']),
    criarElemento('button', { class: 'btn-mini btn-mini-falta', title: 'Marcar falta', onClick: () => marcar('falta') }, ['Falta']),
    criarElemento('button', { class: 'btn-mini btn-mini-justificada', title: 'Marcar falta justificada', onClick: () => marcar('falta_justificada') }, ['F. justificada'])
  ]);

  return criarElemento('div', { class: 'chamada-linha-aluno' }, [
    bolinha, foto, info, tagStatus, acoesManuais
  ]);
}

window.abrirModalChamada = abrirModalChamada;
window.alunosMatriculadosNaTurma = alunosMatriculadosNaTurma;
window.montarLinhaAlunoChamada = montarLinhaAlunoChamada;
window.ROTULOS_STATUS_PRESENCA = ROTULOS_STATUS_PRESENCA;
window.abrirJanelaTelao = abrirJanelaTelao;

/**
 * telao.js
 * ------------------------------------------------------------------
 * Tela enxuta (só QR Code + código gigante) pensada pra ser aberta numa
 * janela separada (window.open, veja professor/chamada.js) e arrastada
 * pro monitor/projetor da sala.
 *
 * Ela só EXIBE o código — quem gera e faz o código trocar a cada 45s é
 * o modal de chamada, aberto na aba principal do professor. Ou seja:
 * mantenha o modal de chamada aberto (pode minimizar a janela) enquanto
 * o telão estiver projetado, senão o código para de trocar.
 * ------------------------------------------------------------------
 */

let paradaAssinaturaTelao = null;

async function montarTelaTelao(chamadaId) {
  const raiz = $('#tela-telao');
  raiz.innerHTML = '';

  if (paradaAssinaturaTelao) { 
    paradaAssinaturaTelao(); 
    paradaAssinaturaTelao = null; 
  }

  const chamada = await dbBuscarPorId('chamadas', chamadaId);

  if (!chamada) {
    raiz.appendChild(criarElemento('div', { class: 'telao-cartao' }, [
      criarElemento('p', { class: 'telao-aviso' }, ['Esta chamada não existe (mais).'])
    ]));
    return;
  }

  const tId = chamada.turma_id || chamada.turmaId;
  const turma = tId ? await dbBuscarPorId('turmas', tId) : null;
  const idDisciplina = turma ? (turma.disciplina_id || turma.disciplinaId) : null;
  const disciplina = idDisciplina ? await dbBuscarPorId('disciplinas', idDisciplina) : null;

  const areaQr = criarElemento('div', { class: 'telao-qr' });
  const areaCodigo = criarElemento('div', { class: 'telao-codigo' });
  const areaAviso = criarElemento('p', { class: 'telao-aviso oculto' });

  const btnTelaCheia = criarElemento('button', {
    class: 'btn-secundario telao-btn-flutuante',
    onClick: alternarTelaCheia
  }, ['⛶ Tela cheia']);

  const cartao = criarElemento('div', { class: 'telao-cartao' }, [
    criarElemento('p', { class: 'telao-turma' }, [turma ? turma.nome : '—']),
    criarElemento('p', { class: 'telao-disciplina' }, [disciplina ? disciplina.nome : '']),
    areaQr,
    areaCodigo,
    areaAviso,
    criarElemento('p', { class: 'telao-instrucao' }, ['Leia o QR Code ou acesse o link, e digite este código pra confirmar presença.'])
  ]);

  raiz.appendChild(btnTelaCheia);
  raiz.appendChild(cartao);

  const link = `${window.location.origin}${window.location.pathname}#presenca/${chamada.id}`;
  // eslint-disable-next-line no-undef
  new QRCode(areaQr, { text: link, width: 220, height: 220, colorDark: '#1F2D50', colorLight: '#ffffff' });

  async function renderizar() {
    const atual = await dbBuscarPorId('chamadas', chamadaId);
    if (!atual || !atual.ativa) {
      areaAviso.textContent = 'Esta chamada foi encerrada pelo professor.';
      areaAviso.classList.remove('oculto');
      areaCodigo.textContent = '——————';
      return;
    }
    areaAviso.classList.add('oculto');
    areaCodigo.textContent = atual.codigo_atual || atual.codigoAtual;
  }

  await renderizar();

  if (typeof dbAoAtualizar === 'function') {
    pararAssinaturaTelao = dbAoAtualizar(async () => await renderizar());
  }
}

function alternarTelaCheia() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

window.montarTelaTelao = montarTelaTelao;

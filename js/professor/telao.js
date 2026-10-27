/**
 * js/professor/telao.js
 * Tela enxuta (QR Code + código gigante + barra de tempo) pensada pra ser aberta numa
 * janela separada (window.open) e arrastada pro monitor/projetor da sala.
 */

let paradaAssinaturaTelao = null;

async function montarTelaTelao(chamadaId) {
  const raiz = $('#tela-telao');
  if (!raiz) return;
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
  
  // Adiciona a barra de tempo idêntica à do modal de chamada
  const areaBarraTempo = criarElemento('div', { class: 'chamada-barra-tempo' }, [
    criarElemento('div', { class: 'chamada-barra-preenchimento' })
  ]);

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
    areaBarraTempo, // Insere a barra logo abaixo do código
    areaAviso,
    criarElemento('p', { class: 'telao-instrucao' }, ['Leia o QR Code ou acesse o link, e digite este código pra confirmar presença.'])
  ]);

  raiz.appendChild(btnTelaCheia);
  raiz.appendChild(cartao);

  const link = `${window.location.origin}${window.location.pathname}#presenca/${chamada.id}`;
  // eslint-disable-next-line no-undef
  new QRCode(areaQr, { text: link, width: 220, height: 220, colorDark: '#1F2D50', colorLight: '#ffffff' });

  let codigoRenderizado = '';

  function reiniciarBarraTempo() {
    const preenchimento = areaBarraTempo.querySelector('.chamada-barra-preenchimento');
    if (!preenchimento) return;
    preenchimento.style.transition = 'none';
    preenchimento.style.width = '100%';
    void preenchimento.offsetWidth; // Força reflow para reiniciar a animação CSS
    // Utiliza a constante global de rotação (geralmente 45s) definida no projeto
    const tempoRotacao = typeof INTERVALO_ROTACAO_MS !== 'undefined' ? INTERVALO_ROTACAO_MS : 45000;
    preenchimento.style.transition = `width ${tempoRotacao}ms linear`;
    preenchimento.style.width = '0%';
  }

  async function renderizar() {
    const atual = await dbBuscarPorId('chamadas', chamadaId);
    if (!atual || !atual.ativa) {
      areaAviso.textContent = 'Esta chamada foi encerrada pelo professor.';
      areaAviso.classList.remove('oculto');
      areaCodigo.textContent = '——————';
      return;
    }
    
    areaAviso.classList.add('oculto');
    const codigo = atual.codigo_atual || atual.codigoAtual;
    areaCodigo.textContent = codigo;

    // Se o código mudou no banco, reinicia a barra de progresso visualmente no telão
    if (codigo !== codigoRenderizado) {
      codigoRenderizado = codigo;
      reiniciarBarraTempo();
    }
  }

  await renderizar();

  // Ouve atualizações em tempo real do banco de dados na janela do telão
  if (typeof dbAoAtualizar === 'function') {
    paradaAssinaturaTelao = dbAoAtualizar(async () => await renderizar());
  }

  // Fallback opcional por segurança caso a assinatura em tempo real demore: checa a cada 5 segundos
  const intervaloVerificacao = setInterval(async () => {
    if (!window.document.contains(raiz)) {
      clearInterval(intervaloVerificacao);
      return;
    }
    await renderizar();
  }, 5000);
}

function alternarTelaCheia() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

window.montarTelaTelao = montarTelaTelao;

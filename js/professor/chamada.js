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

async function obterOuCriarChamadaAtiva(turmaId, professorId) {
  const chamadas = await dbListar('chamadas');
  const existente = chamadas.find((c) => {
    const tId = c.turma_id || c.turmaId;
    return tId === turmaId && c.ativa;
  });
  
  if (existente) {
    // Se a chamada antiga já existe mas está sem latitude/longitude, 
    // tenta atualizar caso o navegador permita agora.
    if (!existente.latitude || !existente.longitude) {
      try {
        const pos = await obterPosicaoAtualAsync();
        await dbAtualizar('chamadas', existente.id, {
          latitude: pos.latitude,
          longitude: pos.longitude
        });
        existente.latitude = pos.latitude;
        existente.longitude = pos.longitude;
      } catch (e) {
        console.warn('Não foi possível atualizar a geolocalização da chamada existente:', e);
      }
    }
    return existente;
  }

  // Tenta capturar a localização atual do professor via GPS antes de salvar
  let latitude = null;
  let longitude = null;
  try {
    const pos = await obterPosicaoAtualAsync();
    latitude = pos.latitude;
    longitude = pos.longitude;
  } catch (erro) {
    console.warn('Geolocalização do professor não obtida:', erro);
  }

  return await dbInserir('chamadas', {
    turma_id: turmaId,
    professor_id: professorId,
    codigo_atual: gerarCodigoChamada(),
    codigo_anterior: null,
    latitude: latitude,
    longitude: longitude,
    gerada_em: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
    ativa: true
  });
}

// Função auxiliar baseada em Promise para capturar o GPS facilmente com async/await
function obterPosicaoAtualAsync() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste navegador.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
}

async function abrirModalChamada(turma, professor) {
  const chamada = await obterOuCriarChamadaAtiva(turma.id, professor.id);
  const idDisciplina = turma.disciplina_id || turma.disciplinaId;
  const disciplina = idDisciplina ? await dbBuscarPorId('disciplinas', idDisciplina) : null;

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

  // Gera o QR Code
  // eslint-disable-next-line no-undef
  new QRCode(areaQr, { text: linkConfirmacao, width: 168, height: 168, colorDark: '#1F2D50', colorLight: '#ffffff' });

  async function renderizarCodigo() {
    const atual = await dbBuscarPorId('chamadas', chamada.id);
    if (!atual || !atual.ativa) return;
    areaCodigo.textContent = atual.codigo_atual || atual.codigoAtual;
  }

  function reiniciarBarraTempo() {
    const preenchimento = areaBarraTempo.querySelector('.chamada-barra-preenchimento');
    preenchimento.style.transition = 'none';
    preenchimento.style.width = '100%';
    void preenchimento.offsetWidth;
    preenchimento.style.transition = `width ${INTERVALO_ROTACAO_MS}ms linear`;
    preenchimento.style.width = '0%';
  }

  async function rotacionarCodigo() {
    const atual = await dbBuscarPorId('chamadas', chamada.id);
    if (!atual || !atual.ativa) return;
    await dbAtualizar('chamadas', chamada.id, {
      codigo_anterior: atual.codigo_atual || atual.codigoAtual,
      codigo_atual: gerarCodigoChamada(),
      atualizado_em: new Date().toISOString()
    });
    await renderizarCodigo();
    reiniciarBarraTempo();
  }

  async function renderizarLista() {
    areaLista.innerHTML = '';
    const alunosDaTurma = await alunosMatriculadosNaTurma(turma.id);
    const presencas = await dbListar('presencas');

    if (alunosDaTurma.length === 0) {
      areaLista.appendChild(criarElemento('div', { class: 'estado-vazio' }, ['Nenhum aluno matriculado nesta turma ainda.']));
      return;
    }

    for (const aluno of alunosDaTurma) {
      const presenca = presencas.find((p) => {
        const cId = p.chamada_id || p.chamadaId;
        const aId = p.aluno_id || p.alunoId;
        return cId === chamada.id && aId === aluno.id;
      });
      areaLista.appendChild(montarLinhaAlunoChamada(aluno, presenca, chamada, turma, async () => await renderizarLista()));
    }
  }

  await renderizarCodigo();
  reiniciarBarraTempo();
  await renderizarLista();

  cronometroRotacaoCodigo = setInterval(rotacionarCodigo, INTERVALO_ROTACAO_MS);
  
  if (typeof dbAoAtualizar === 'function') {
    paradaAssinaturaChamada = dbAoAtualizar(async () => {
      await renderizarLista();
      await renderizarCodigo();
    });
  }

  function fecharModal() {
    if (cronometroRotacaoCodigo) clearInterval(cronometroRotacaoCodigo);
    if (paradaAssinaturaChamada) paradaAssinaturaChamada();
    modal.remove();
  }

  btnFechar.addEventListener('click', fecharModal);
  modal.addEventListener('click', (evento) => { if (evento.target === modal) fecharModal(); });

  btnEncerrar.addEventListener('click', async () => {
    if (!confirmarAcao('Encerrar esta chamada? Alunos não vão mais conseguir confirmar presença por ela.')) return;
    await dbAtualizar('chamadas', chamada.id, { ativa: false });
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

async function alunosMatriculadosNaTurma(turmaId) {
  const matriculas = await dbListar('matriculas');
  const alunos = await dbListar('alunos');
  const idsAlunos = matriculas
    .filter((m) => (m.turma_id || m.turmaId) === turmaId)
    .map((m) => m.aluno_id || m.alunoId);
  return alunos.filter((a) => idsAlunos.includes(a.id));
}

function montarLinhaAlunoChamada(aluno, presenca, chamada, turma, aoAtualizar) {
  const status = presenca ? presenca.status : 'aguardando';

  const bolinha = criarElemento('span', { class: `bolinha-status status-${status}` });
  const foto = criarElemento('img', { class: 'celula-foto', src: aluno.foto_rosto || aluno.fotoRosto || iconePadraoFoto(), alt: `Foto de ${aluno.nome}` });

  const info = criarElemento('div', { class: 'chamada-aluno-info' }, [
    criarElemento('strong', {}, [aluno.nome]),
    criarElemento('span', { class: 'mono' }, [`RA ${aluno.ra}`])
  ]);

  const tagStatus = criarElemento('span', { class: `tag tag-status-${status}` }, [ROTULOS_STATUS_PRESENCA[status]]);

  async function marcar(novoStatus) {
    const presencas = await dbListar('presencas');
    const existente = presencas.find((p) => {
      const cId = p.chamada_id || p.chamadaId;
      const aId = p.aluno_id || p.alunoId;
      return cId === chamada.id && aId === aluno.id;
    });

    const timestamp = new Date().toISOString();
    if (existente) {
      await dbAtualizar('presencas', existente.id, { 
        status: novoStatus, 
        origem: 'manual', 
        confirmado_em: timestamp 
      });
    } else {
      await dbInserir('presencas', {
        chamada_id: chamada.id, 
        turma_id: turma.id, 
        aluno_id: aluno.id,
        status: novoStatus, 
        origem: 'manual', 
        confirmado_em: timestamp
      });
    }
    await aoAtualizar();
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

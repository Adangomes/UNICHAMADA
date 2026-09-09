/**
 * confirmar-presenca.js
 * ------------------------------------------------------------------
 * Tela acessada pelo aluno ao ler o QR Code da chamada (rota
 * "#presenca/<idDaChamada>"). Não passa pelo login normal.
 *
 * Etapas: 1) RA + e-mail  2) foto do rosto (comparada com a foto
 * cadastrada)  3) localização (raio de 500m da faculdade)  4) código
 * que está mudando no telão do professor.
 * ------------------------------------------------------------------
 */

let streamAtivoConfirmacao = null;

function montarTelaConfirmarPresenca(chamadaId) {
  const raiz = $('#tela-confirmar-presenca');
  raiz.innerHTML = '';

  const chamada = dbBuscarPorId('chamadas', chamadaId);

  if (!chamada || !chamada.ativa) {
    raiz.appendChild(montarCartaoConfirmacao([
      criarElemento('div', { class: 'confirmacao-resultado' }, [
        criarElemento('div', { class: 'icone' }, ['⚠️']),
        criarElemento('h2', {}, ['Chamada indisponível']),
        criarElemento('p', {}, ['Este link de chamada não existe mais ou já foi encerrado pelo professor. Peça para gerar um novo QR Code.'])
      ])
    ]));
    return;
  }

  const turma = dbBuscarPorId('turmas', chamada.turmaId);
  const disciplina = turma ? dbBuscarPorId('disciplinas', turma.disciplinaId) : null;

  const estado = { chamada, turma, disciplina, aluno: null, fotoCapturada: null };

  renderPassoIdentificacao(raiz, estado);
}

/* ---------------------------- Casca visual comum ---------------------------- */

function montarCartaoConfirmacao(filhosCorpo, estado = null, passoAtual = 0) {
  const totalPassos = 4;

  const topo = criarElemento('div', { class: 'confirmacao-topo' }, [
    criarElemento('span', { class: 'selo' }, ['Confirmação de presença']),
    criarElemento('h1', {}, [estado?.turma ? estado.turma.nome : 'Sistema Acadêmico']),
    estado?.disciplina
      ? criarElemento('p', { class: 'contexto-turma' }, [disciplinaContexto(estado)])
      : null
  ]);

  const passos = criarElemento('div', { class: 'confirmacao-passos' });
  if (passoAtual > 0) {
    for (let i = 1; i <= totalPassos; i++) {
      const classe = i < passoAtual ? 'concluido' : i === passoAtual ? 'atual' : '';
      passos.appendChild(criarElemento('div', { class: `confirmacao-passo-bolinha ${classe}` }));
    }
  }

  const corpo = criarElemento('div', { class: 'confirmacao-corpo' }, filhosCorpo);
  const cartao = criarElemento('div', { class: 'confirmacao-cartao' }, [topo, passoAtual > 0 ? passos : null, corpo]);

  return cartao;
}

function disciplinaContexto(estado) {
  return `${estado.disciplina.nome} · ${estado.turma.turno}`;
}

/* ---------------------------- Passo 1: RA + e-mail ---------------------------- */

function renderPassoIdentificacao(raiz, estado) {
  raiz.innerHTML = '';

  const erro = criarElemento('p', { class: 'confirmacao-erro-caixa oculto' });

  const form = criarElemento('form', {}, [
    criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['RA']),
      criarElemento('input', { type: 'text', name: 'ra', required: 'true', 'data-mono': 'true' })
    ]),
    criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['E-mail']),
      criarElemento('input', { type: 'email', name: 'email', required: 'true' })
    ]),
    criarElemento('button', { type: 'submit', class: 'btn-primario' }, ['Continuar'])
  ]);

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const ra = form.ra.value.trim();
    const email = form.email.value.trim();

    if (!campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
      exibirErroPasso(erro, 'Preencha RA e e-mail.');
      return;
    }

    const alunosDaTurma = alunosMatriculadosNaTurma(estado.turma.id);
    const aluno = alunosDaTurma.find(
      (a) => a.ra.toUpperCase() === ra.toUpperCase() && a.email.toLowerCase() === email.toLowerCase()
    );

    if (!aluno) {
      exibirErroPasso(erro, 'RA/e-mail não encontrados ou você não está matriculado nesta turma.');
      return;
    }

    estado.aluno = aluno;
    renderPassoRosto(estado);
  });

  const conteudo = [
    criarElemento('h2', {}, ['Confirme quem você é']),
    criarElemento('p', { class: 'subtitulo' }, ['Digite seu RA e o e-mail cadastrados pela coordenação.']),
    erro,
    form
  ];

  raiz.appendChild(montarCartaoConfirmacao(conteudo, estado, 1));
}

function exibirErroPasso(elementoErro, mensagem) {
  elementoErro.textContent = mensagem;
  elementoErro.classList.remove('oculto');
}

/* ---------------------------- Passo 2: Reconhecimento facial ---------------------------- */

function renderPassoRosto(estado) {
  const raiz = $('#tela-confirmar-presenca');
  raiz.innerHTML = '';

  const wrapVideo = criarElemento('div', { class: 'confirmacao-video-wrap' });
  const video = criarElemento('video', { autoplay: 'true', playsinline: 'true', muted: 'true' });
  wrapVideo.appendChild(video);

  const status = criarElemento('div', { class: 'confirmacao-status-ia oculto' });
  const btnCapturar = criarElemento('button', { type: 'button', class: 'btn-primario' }, ['📷 Tirar foto e verificar']);

  const conteudo = [
    criarElemento('h2', {}, ['Verificação facial']),
    criarElemento('p', { class: 'subtitulo' }, ['Posicione seu rosto no centro da câmera.']),
    wrapVideo,
    status,
    btnCapturar
  ];

  raiz.appendChild(montarCartaoConfirmacao(conteudo, estado, 2));

  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'user' }, audio: false })
    .then((stream) => {
      streamAtivoConfirmacao = stream;
      video.srcObject = stream;
    })
    .catch(() => {
      status.classList.remove('oculto');
      status.classList.add('erro');
      status.textContent = 'Não foi possível acessar a câmera. Verifique as permissões do navegador.';
      btnCapturar.disabled = true;
    });

  btnCapturar.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 320;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    estado.fotoCapturada = canvas.toDataURL('image/jpeg', 0.85);

    pararCameraConfirmacao();

    btnCapturar.disabled = true;
    status.className = 'confirmacao-status-ia';
    status.innerHTML = '';
    status.appendChild(criarElemento('span', { class: 'girador' }));
    status.appendChild(criarElemento('span', {}, ['Verificando se é você...']));

    compararRosto(estado.fotoCapturada, estado.aluno.fotoRosto).then((resultado) => {
      if (resultado.aprovado) {
        status.className = 'confirmacao-status-ia sucesso';
        status.innerHTML = '';
        status.appendChild(criarElemento('span', {}, ['✅ Rosto reconhecido.']));
        setTimeout(() => renderPassoLocalizacao(estado), 500);
      } else {
        status.className = 'confirmacao-status-ia erro';
        status.innerHTML = '';
        status.appendChild(criarElemento('span', {}, [`❌ ${resultado.motivo}`]));
        setTimeout(() => renderPassoRosto(estado), 1800);
      }
    });
  });
}

function pararCameraConfirmacao() {
  if (streamAtivoConfirmacao) {
    streamAtivoConfirmacao.getTracks().forEach((faixa) => faixa.stop());
    streamAtivoConfirmacao = null;
  }
}

/* ---------------------------- Passo 3: Localização ---------------------------- */

function renderPassoLocalizacao(estado) {
  const raiz = $('#tela-confirmar-presenca');
  raiz.innerHTML = '';

  const status = criarElemento('div', { class: 'confirmacao-distancia oculto' });
  const btnVerificar = criarElemento('button', { type: 'button', class: 'btn-primario' }, ['📍 Permitir localização']);

  const conteudo = [
    criarElemento('div', { class: 'confirmacao-icone-central' }, ['📍']),
    criarElemento('h2', {}, ['Confirme que você está na faculdade']),
    criarElemento('p', { class: 'subtitulo' }, [`Você precisa estar a até ${RAIO_PERMITIDO_METROS}m de ${CAMPUS.nome}.`]),
    status,
    btnVerificar
  ];

  raiz.appendChild(montarCartaoConfirmacao(conteudo, estado, 3));

  btnVerificar.addEventListener('click', () => {
    btnVerificar.disabled = true;
    btnVerificar.textContent = 'Verificando localização...';
    status.classList.remove('oculto');
    status.textContent = 'Obtendo sua localização atual...';

    verificarLocalizacao().then((resultado) => {
      if (resultado.erro) {
        status.textContent = resultado.erro;
        btnVerificar.disabled = false;
        btnVerificar.textContent = 'Tentar novamente';
        return;
      }
      if (!resultado.permitido) {
        status.textContent = `Você está a ${resultado.distancia}m da faculdade — fora do raio permitido de ${RAIO_PERMITIDO_METROS}m.`;
        btnVerificar.disabled = false;
        btnVerificar.textContent = 'Tentar novamente';
        return;
      }
      status.textContent = `Localização confirmada (a ${resultado.distancia}m da faculdade).`;
      setTimeout(() => renderPassoCodigo(estado), 500);
    });
  });
}

/* ---------------------------- Passo 4: Código do telão ---------------------------- */

function renderPassoCodigo(estado) {
  const raiz = $('#tela-confirmar-presenca');
  raiz.innerHTML = '';

  const erro = criarElemento('p', { class: 'confirmacao-erro-caixa oculto' });

  const form = criarElemento('form', {}, [
    criarElemento('div', { class: 'campo' }, [
      criarElemento('label', {}, ['Código exibido no telão']),
      criarElemento('input', { id: 'input-codigo-confirmacao', type: 'text', name: 'codigo', maxlength: '6', required: 'true', autocomplete: 'off' })
    ]),
    criarElemento('button', { type: 'submit', class: 'btn-primario' }, ['Confirmar presença'])
  ]);

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const digitado = form.codigo.value.trim().toUpperCase();
    const chamadaAtual = dbBuscarPorId('chamadas', estado.chamada.id);

    if (!chamadaAtual || !chamadaAtual.ativa) {
      exibirErroPasso(erro, 'Esta chamada foi encerrada pelo professor.');
      return;
    }

    const codigoValido = digitado === chamadaAtual.codigoAtual || digitado === chamadaAtual.codigoAnterior;
    if (!codigoValido) {
      exibirErroPasso(erro, 'Código incorreto. Confira o código que está no telão e tente de novo.');
      return;
    }

    const existente = dbListar('presencas').find((p) => p.chamadaId === estado.chamada.id && p.alunoId === estado.aluno.id);
    if (existente) {
      dbAtualizar('presencas', existente.id, { status: 'presente', origem: 'qrcode', confirmadoEm: new Date().toISOString() });
    } else {
      dbInserir('presencas', {
        chamadaId: estado.chamada.id, turmaId: estado.turma.id, alunoId: estado.aluno.id,
        status: 'presente', origem: 'qrcode', confirmadoEm: new Date().toISOString()
      });
    }

    renderSucessoConfirmacao(estado);
  });

  const conteudo = [
    criarElemento('h2', {}, ['Último passo']),
    criarElemento('p', { class: 'subtitulo' }, ['Digite o código que está mudando na tela/telão do professor.']),
    erro,
    form
  ];

  raiz.appendChild(montarCartaoConfirmacao(conteudo, estado, 4));
  setTimeout(() => $('#input-codigo-confirmacao')?.focus(), 50);
}

/* ---------------------------- Resultado final ---------------------------- */

function renderSucessoConfirmacao(estado) {
  const raiz = $('#tela-confirmar-presenca');
  raiz.innerHTML = '';

  const conteudo = [
    criarElemento('div', { class: 'confirmacao-resultado' }, [
      criarElemento('div', { class: 'icone' }, ['✅']),
      criarElemento('h2', {}, ['Presença confirmada!']),
      criarElemento('p', {}, [`${estado.aluno.nome}, sua presença em ${estado.turma.nome} foi registrada com sucesso.`])
    ])
  ];

  raiz.appendChild(montarCartaoConfirmacao(conteudo, estado, 4));
}

window.montarTelaConfirmarPresenca = montarTelaConfirmarPresenca;

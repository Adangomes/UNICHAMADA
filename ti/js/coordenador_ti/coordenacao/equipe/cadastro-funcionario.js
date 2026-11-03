/**
 * cadastro-funcionario.js — janela "Novo funcionário".
 * A conta Auth é criada previamente no Supabase; o cadastro do funcionário
 * e o envio da foto são feitos diretamente ao Supabase pelo painel.
 * A conta Auth deve existir previamente. O cadastro e a foto são vinculados
 * diretamente ao Supabase, sem serviço intermediário.
 */
window.TI = window.TI || {};

TI.telas.cadastroFuncionario = {
  /** @param {Function} aoCriar chamada após o cadastro com sucesso */
  abrir(aoCriar) {
    const { el } = TI.dom;
    const { ui, K } = TI;

    const nome = ui.input({
      type: 'text',
      placeholder: 'Nome e sobrenome',
      autocomplete: 'off'
    });

    const email = ui.input({
      type: 'email',
      placeholder: 'nome@empresa.com',
      autocomplete: 'off'
    });

    const setor = ui.select(
      K.setoresCadastro.map((s) => [s, K.setores[s]]),
      K.setoresCadastro[0],
      {
        'aria-label': 'Setor',
        onChange: () => desenharPermissoes()
      }
    );

    const seletorFoto = ui.input({
      type: 'file',
      accept: 'image/jpeg,image/png,image/webp',
      'aria-label': 'Selecionar foto do funcionário'
    });
    seletorFoto.hidden = true;

    const videoFoto = el('video', {
      class: 'ti-foto-video',
      autoplay: true,
      playsinline: true,
      muted: true,
      hidden: true,
      'aria-label': 'Pré-visualização da câmera'
    });
    const imagemFoto = el('img', {
      class: 'ti-foto-previa',
      alt: 'Pré-visualização da foto selecionada',
      hidden: true
    });
    const areaFoto = el('div', { class: 'ti-foto-area' }, [videoFoto, imagemFoto]);
    const infoFoto = el('p', { class: 'ti-sub ti-foto-info' }, [
      'Obrigatória. Tire uma foto ou escolha JPG, PNG ou WEBP de até 5 MB.'
    ]);
    let arquivoFotoAtual = null;
    let fluxoCamera = null;
    let urlPreviaFoto = null;

    function pararCamera() {
      if (fluxoCamera) {
        fluxoCamera.getTracks().forEach((faixa) => faixa.stop());
        fluxoCamera = null;
      }
      videoFoto.srcObject = null;
      videoFoto.hidden = true;
    }

    function limparPrevia() {
      pararCamera();
      if (urlPreviaFoto) {
        URL.revokeObjectURL(urlPreviaFoto);
        urlPreviaFoto = null;
      }
      imagemFoto.removeAttribute('src');
      imagemFoto.hidden = true;
      areaFoto.classList.remove('ativo');
    }

    function mostrarFoto(arquivo, origem) {
      limparPrevia();
      arquivoFotoAtual = arquivo;
      urlPreviaFoto = URL.createObjectURL(arquivo);
      imagemFoto.src = urlPreviaFoto;
      imagemFoto.hidden = false;
      areaFoto.classList.add('ativo');
      infoFoto.textContent = origem === 'camera'
        ? 'Foto capturada. Você pode tirá-la novamente ou escolher outra imagem.'
        : `Foto selecionada: ${arquivo.name}`;
      botaoCapturar.hidden = true;
      botaoCancelarCamera.hidden = true;
    }

    const botaoArquivo = ui.botao('Escolher arquivo', {
      onClick: () => seletorFoto.click()
    });
    const botaoCamera = ui.botao('Tirar foto', {
      onClick: async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('A câmera não está disponível. Abra o sistema em HTTPS ou no aplicativo instalado.');
        }
        pararCamera();
        imagemFoto.hidden = true;
        try {
          fluxoCamera = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: { facingMode: 'user' }
          });
          if (!document.body.contains(modal.caixa)) {
            pararCamera();
            return;
          }
          imagemFoto.hidden = true;
          videoFoto.srcObject = fluxoCamera;
          videoFoto.hidden = false;
          areaFoto.classList.add('ativo');
          await videoFoto.play();
          botaoCapturar.hidden = false;
          botaoCancelarCamera.hidden = false;
          infoFoto.textContent = 'Enquadre o rosto e selecione “Capturar foto”.';
        } catch (erroCamera) {
          pararCamera();
          if (arquivoFotoAtual && urlPreviaFoto) {
            imagemFoto.src = urlPreviaFoto;
            imagemFoto.hidden = false;
          } else {
            areaFoto.classList.remove('ativo');
          }
          if (erroCamera.name === 'NotAllowedError' || erroCamera.name === 'PermissionDeniedError') {
            throw new Error('Permita o acesso à câmera nas configurações do navegador ou do aplicativo.');
          }
          throw new Error('Não foi possível abrir a câmera: ' + erroCamera.message);
        }
      }
    });
    const botaoCapturar = ui.botao('Capturar foto', {
      tipo: 'primario',
      onClick: async () => {
        if (!fluxoCamera || !videoFoto.videoWidth || !videoFoto.videoHeight) {
          throw new Error('A câmera ainda não está pronta. Aguarde um instante e tente novamente.');
        }
        const canvas = document.createElement('canvas');
        canvas.width = videoFoto.videoWidth;
        canvas.height = videoFoto.videoHeight;
        const contexto = canvas.getContext('2d');
        if (!contexto) throw new Error('Não foi possível preparar a captura da foto.');
        contexto.drawImage(videoFoto, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
        if (!blob) throw new Error('Não foi possível capturar a foto.');
        mostrarFoto(new File([blob], 'foto-funcionario.jpg', { type: 'image/jpeg' }), 'camera');
      }
    });
    botaoCapturar.hidden = true;
    const botaoCancelarCamera = ui.botao('Cancelar câmera', {
      onClick: () => {
        pararCamera();
        if (arquivoFotoAtual && urlPreviaFoto) {
          imagemFoto.src = urlPreviaFoto;
          imagemFoto.hidden = false;
          areaFoto.classList.add('ativo');
          infoFoto.textContent = `Foto selecionada: ${arquivoFotoAtual.name || 'captura da câmera'}`;
          botaoRemoverFoto.hidden = false;
        } else {
          areaFoto.classList.remove('ativo');
          infoFoto.textContent = 'Obrigatória. Tire uma foto ou escolha JPG, PNG ou WEBP de até 5 MB.';
        }
        botaoCancelarCamera.hidden = true;
        botaoCapturar.hidden = true;
      }
    });
    botaoCancelarCamera.hidden = true;
    const botaoRemoverFoto = ui.botao('Remover foto', {
      onClick: () => {
        limparPrevia();
        arquivoFotoAtual = null;
        seletorFoto.value = '';
        infoFoto.textContent = 'Obrigatória. Tire uma foto ou escolha JPG, PNG ou WEBP de até 5 MB.';
      }
    });
    botaoRemoverFoto.hidden = true;
    const acoesFoto = el('div', { class: 'ti-foto-acoes' }, [
      botaoArquivo,
      botaoCamera,
      botaoCapturar,
      botaoCancelarCamera,
      botaoRemoverFoto
    ]);

    seletorFoto.addEventListener('change', () => {
      const arquivo = seletorFoto.files && seletorFoto.files[0];
      if (!arquivo) return;
      const problemaFoto = validarFoto(arquivo);
      if (problemaFoto) {
        seletorFoto.value = '';
        arquivoFotoAtual = null;
        limparPrevia();
        infoFoto.textContent = problemaFoto;
        return;
      }
      mostrarFoto(arquivo, 'arquivo');
      botaoRemoverFoto.hidden = false;
    });

    const erro = el('div', { class: 'ti-erro', role: 'alert' });
    erro.hidden = true;

    const permissoes = el('div', { class: 'ti-aviso' });

    function desenharPermissoes() {
      const p = K.permissoesPorSetor(setor.value);

      permissoes.replaceChildren(
        el('strong', {}, [
          'Com o setor ' + K.setores[setor.value] + ', esta pessoa poderá:'
        ]),
        ...p.pode.map((texto) =>
          el('div', {}, [el('span', { class: 'sim' }, ['✓']), texto])
        ),
        ...p.naoPode.map((texto) =>
          el('div', {}, [
            el('span', { class: 'nao' }, ['✕']),
            'Não poderá: ' + texto.charAt(0).toLowerCase() + texto.slice(1)
          ])
        )
      );
    }

    function mostrarErro(texto) {
      erro.textContent = texto;
      erro.hidden = false;
    }

    function validarFoto(arquivo) {
      if (!arquivo) return '';

      const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

      if (!tiposPermitidos.includes(arquivo.type)) {
        return 'Selecione uma foto JPG, PNG ou WEBP.';
      }

      if (arquivo.size > 5 * 1024 * 1024) {
        return 'A foto deve ter no máximo 5 MB.';
      }

      return '';
    }

    desenharPermissoes();

    const modal = ui.modal({
      titulo: 'Novo funcionário',
      corpo: [
        el('p', { class: 'ti-sub' }, [
          'Cadastre os dados do funcionário. O sistema gera o ID do crachá automaticamente ao salvar.'
        ]),
        erro,
        ui.campo('Nome completo', nome),
        ui.campo('E-mail de trabalho', email),
        ui.campo('Setor', setor),
        ui.campo('Foto do funcionário *', acoesFoto),
        seletorFoto,
        areaFoto,
        infoFoto,
        permissoes
      ],
      botoes: [
        ui.botao('Cancelar', {
          onClick: () => modal.fechar()
        }),

        ui.botao('Cadastrar funcionário', {
          tipo: 'primario',
          onClick: async () => {
            erro.hidden = true;

            const dados = {
              nome: nome.value.trim(),
              email: email.value.trim().toLowerCase(),
              setor: setor.value
            };

            const arquivoFoto = arquivoFotoAtual;

            const problema = !arquivoFoto
              ? 'Tire ou selecione uma foto para cadastrar o funcionário.'
              : !dados.nome || dados.nome.length < 3
                ? 'Informe o nome completo.'
                : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)
                  ? 'Informe um e-mail válido.'
                  : validarFoto(arquivoFoto);

            if (problema) {
              mostrarErro(problema);
              return;
            }

            let fotoPath = null;
            let cadastroConfirmado = false;
            let removerFotoEmFalha = false;
            try {
              const { data: usuarioData, error: erroUsuario } =
                await TI.db.auth.getUser();

              if (erroUsuario) {
                throw erroUsuario;
              }
              if (!usuarioData || !usuarioData.user) {
                throw new Error('Sua sessão expirou. Entre novamente no painel de TI.');
              }

              if (usuarioData.user.email &&
                  usuarioData.user.email.toLowerCase() === dados.email) {
                throw new Error('Use o e-mail da conta Auth do funcionário, não o da sua conta de coordenador.');
              }

              const extensaoFoto = {
                'image/jpeg': 'jpg',
                'image/png': 'png',
                'image/webp': 'webp'
              }[arquivoFoto.type];
              if (!extensaoFoto) {
                throw new Error('O formato da foto não é permitido.');
              }

              const caminhoFoto = `perfis/${crypto.randomUUID()}.${extensaoFoto}`;
              const { error: erroUpload } = await TI.db.storage
                .from('ti-fotos-funcionarios')
                .upload(caminhoFoto, arquivoFoto, {
                  cacheControl: '3600',
                  contentType: arquivoFoto.type,
                  upsert: false
                });

              if (erroUpload) {
                throw new Error('Não foi possível salvar a foto: ' + erroUpload.message);
              }
              fotoPath = caminhoFoto;
              removerFotoEmFalha = true;

              const { data: resultado, error: erroCadastro } = await TI.db.rpc(
                'ti_criar_funcionario_com_foto',
                {
                  p_nome: dados.nome,
                  p_email: dados.email,
                  p_setor: dados.setor,
                  p_foto_path: fotoPath
                }
              );

              if (erroCadastro) {
                removerFotoEmFalha = typeof erroCadastro.status === 'number';
                throw new Error(erroCadastro.message || 'Não foi possível cadastrar o funcionário.');
              }

              const registro = Array.isArray(resultado) ? resultado[0] : resultado;
              if (!registro || !registro.funcionario_id || registro.foto_path !== fotoPath || !registro.id_funcionarios) {
                throw new Error('O banco não confirmou o cadastro, o vínculo da foto e o ID do crachá.');
              }

              cadastroConfirmado = true;
              removerFotoEmFalha = false;

              await TI.dados.auditoria.registrar(
                'funcionario.cadastrado',
                'funcionario',
                registro.funcionario_id,
                {
                  email: dados.email,
                  setor: dados.setor,
                  foto_path: fotoPath,
                  id_funcionarios: registro.id_funcionarios
                }
              );

              ui.toast(
                'Funcionário ' + dados.nome + ' cadastrado. Anote o ID do crachá: ' +
                registro.id_funcionarios
              );
              modal.fechar();

              if (aoCriar) {
                aoCriar();
              }
            } catch (err) {
              let mensagemErro = err.message || 'Erro ao cadastrar funcionário.';
              if (fotoPath && removerFotoEmFalha && !cadastroConfirmado) {
                try {
                  const { error: erroRemocao } = await TI.db.storage
                    .from('ti-fotos-funcionarios')
                    .remove([fotoPath]);
                  if (erroRemocao) {
                    mensagemErro += ' A limpeza da foto temporária também falhou: ' + erroRemocao.message;
                  }
                } catch (erroLimpeza) {
                  mensagemErro += ' A limpeza da foto temporária também falhou: ' +
                    (erroLimpeza.message || 'erro de comunicação com o Storage.');
                }
              }
              if (cadastroConfirmado) {
                mensagemErro += ' O funcionário foi criado; confira o registro antes de tentar novamente.';
              } else if (fotoPath && !removerFotoEmFalha) {
                mensagemErro += ' A resposta do banco ficou inconclusiva; a foto foi mantida para evitar quebrar um possível vínculo. Confira a equipe antes de tentar novamente.';
              }
              mostrarErro(mensagemErro);
            }
          }
        })
      ]
    });

    const observadorModal = new MutationObserver(() => {
      if (!document.body.contains(modal.caixa)) {
        pararCamera();
        if (urlPreviaFoto) URL.revokeObjectURL(urlPreviaFoto);
        observadorModal.disconnect();
      }
    });
    observadorModal.observe(document.body, { childList: true });

    imagemFoto.addEventListener('load', () => {
      botaoRemoverFoto.hidden = false;
    });

    nome.focus();
  }
};
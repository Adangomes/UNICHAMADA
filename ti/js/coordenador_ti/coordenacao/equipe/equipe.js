/**
 * equipe.js — pessoas da equipe de TI, carga de trabalho e menu de ações unificado.
 * Tabelas: ti_funcionarios, ti_chamados, ti_demandas.
 */
window.TI = window.TI || {};

TI.telas.equipe = {
  async render(c, ctx) {
    const { el } = TI.dom;
    const { ui, K } = TI;
    c.replaceChildren(ui.carregando());

    let equipe, chamados, demandas;
    try {
      [equipe, chamados, demandas] = await Promise.all([
        TI.dados.funcionarios.listar(), TI.dados.chamados.listar(), TI.dados.demandas.listar()
      ]);
    } catch (e) { c.replaceChildren(ui.erro(e.message)); return; }

    const recarregar = () => TI.telas.equipe.render(c, ctx);
    const estado = { setor: '' };
    const emAndamento = ['backlog', 'desenvolvendo', 'em_revisao'];

    const cargaDe = (p) => {
      const ch = chamados.filter((x) => x.responsavel_id === p.id && !K.chamadoEncerrado.includes(x.status)).length;
      const de = demandas.filter((x) => x.responsavel_id === p.id && emAndamento.includes(x.status)).length;
      return { ch, de, total: ch + de };
    };
    const maior = Math.max(5, ...equipe.map((p) => cargaDe(p).total));

    const pilulas = el('div', { class: 'ti-pilulas' });
    const lista = ui.cartao('Pessoas e carga de trabalho', []);

    function desenhar() {
      const setores = ['', ...Object.keys(K.setores).filter((s) => equipe.some((p) => p.setor === s))];
      pilulas.replaceChildren(...setores.map((s) => el('button', {
        class: 'ti-pilula' + (estado.setor === s ? ' ativo' : ''), type: 'button',
        onClick: () => { estado.setor = s; desenhar(); }
      }, [(s ? K.setores[s] : 'Todos') + ' · ' + equipe.filter((p) => !s || p.setor === s).length])));

      const visiveis = equipe.filter((p) => !estado.setor || p.setor === estado.setor);
      const linhas = visiveis.map((p) => {
        const carga = cargaDe(p);
        const texto = [carga.ch ? carga.ch + ' chamado(s)' : '', carga.de ? carga.de + ' demanda(s)' : ''].filter(Boolean).join(' · ') || 'sem tarefas';

        // Badge de status (Ativo/Desativado)
        const badgeStatus = el('span', { class: 'ti-status ' + (p.ativo ? 'ti-status-resolvido' : 'ti-status-fechado') }, [p.ativo ? 'Ativo' : 'Desativado']);

        // Botão de três pontinhos para todos os funcionários
        const botaoPontinhos = el('button', {
          style: {
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '18px',
            color: 'var(--ti-suave, #666)',
            padding: '4px 8px',
            lineHeight: '1',
            borderRadius: '4px'
          },
          type: 'button',
          title: 'Opções',
          onClick: (e) => {
            e.stopPropagation();
            document.querySelectorAll('.ti-menu-flutuante').forEach(m => m.remove());

            const seletorFotoReferencia = el('input', {
              type: 'file',
              accept: 'image/jpeg,image/png,image/webp',
              'aria-label': 'Selecionar foto de referência'
            });
            seletorFotoReferencia.hidden = true;
            async function salvarFotoReferencia(arquivo) {
              const extensoes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
              if (!extensoes[arquivo.type]) throw new Error('Use uma foto JPG, PNG ou WEBP.');
              if (arquivo.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');

              let caminhoNovo = null;
              let uploadConcluido = false;
              let fotoVinculada = false;
              try {
                const { data: atual, error: erroAtual } = await TI.db
                  .from('ti_funcionarios')
                  .select('foto_path')
                  .eq('id', p.id)
                  .single();
                if (erroAtual) throw erroAtual;

                caminhoNovo = `perfis/${crypto.randomUUID()}.${extensoes[arquivo.type]}`;
                const { error: erroUpload } = await TI.db.storage
                  .from('ti-fotos-funcionarios')
                  .upload(caminhoNovo, arquivo, {
                    cacheControl: '3600',
                    contentType: arquivo.type,
                    upsert: false
                  });
                if (erroUpload) throw erroUpload;
                uploadConcluido = true;

                await TI.dados.funcionarios.atualizar(p.id, { foto_path: caminhoNovo });
                fotoVinculada = true;

                let aviso = '';
                try {
                  await TI.dados.auditoria.registrar(
                    'funcionario.foto_referencia_atualizada',
                    'funcionario',
                    p.id,
                    { email: p.email }
                  );
                } catch (erroAuditoria) {
                  console.error('A foto foi atualizada, mas a auditoria falhou:', erroAuditoria);
                  aviso = 'Foto atualizada, mas não foi possível registrar a auditoria.';
                }

                if (atual.foto_path) {
                  const { error: erroRemocao } = await TI.db.storage
                    .from('ti-fotos-funcionarios')
                    .remove([atual.foto_path]);
                  if (erroRemocao) {
                    console.error('A foto antiga de referência não foi removida:', erroRemocao);
                    aviso = `${aviso ? `${aviso} ` : ''}A foto antiga de referência não foi removida.`;
                  }
                }
                ui.toast(aviso || (atual.foto_path
                  ? 'Foto de referência atualizada.'
                  : 'Foto de referência cadastrada.'), aviso ? 'erro' : undefined);
                await recarregar();
              } catch (erro) {
                if (uploadConcluido && caminhoNovo && !fotoVinculada) {
                  const { error: erroLimpeza } = await TI.db.storage
                    .from('ti-fotos-funcionarios')
                    .remove([caminhoNovo]);
                  if (erroLimpeza) {
                    erro.message += ` A foto temporária também não pôde ser removida: ${erroLimpeza.message}`;
                  }
                }
                console.error('Falha ao atualizar foto de referência:', erro);
                throw erro;
              }
            }

            async function abrirCameraReferencia() {
              menu.remove();
              if (!navigator.mediaDevices?.getUserMedia) {
                ui.toast('A câmera não está disponível. Abra o sistema em HTTPS ou no aplicativo instalado.', 'erro');
                return;
              }

              let stream;
              try {
                stream = await navigator.mediaDevices.getUserMedia({
                  audio: false,
                  video: { facingMode: 'user' }
                });
                const video = el('video', {
                  class: 'ti-foto-video',
                  autoplay: true,
                  playsinline: true,
                  muted: true,
                  'aria-label': 'Pré-visualização da câmera'
                });
                const info = el('p', { class: 'ti-sub ti-foto-info' }, [
                  'Enquadre o rosto e selecione “Capturar foto”.'
                ]);
                const modalFoto = ui.modal({
                  titulo: 'Tirar foto de referência',
                  corpo: [
                    el('div', { class: 'ti-foto-area ativo' }, [video]),
                    info
                  ],
                  botoes: [
                    ui.botao('Cancelar', {
                      onClick: () => {
                        stream.getTracks().forEach((faixa) => faixa.stop());
                        modalFoto.fechar();
                      }
                    }),
                    ui.botao('Capturar foto', {
                      tipo: 'primario',
                      onClick: async () => {
                        if (!video.videoWidth || !video.videoHeight) {
                          throw new Error('A câmera ainda está iniciando. Aguarde um instante e tente novamente.');
                        }
                        const canvas = document.createElement('canvas');
                        canvas.width = video.videoWidth;
                        canvas.height = video.videoHeight;
                        const contexto = canvas.getContext('2d');
                        if (!contexto) throw new Error('Não foi possível preparar a captura da foto.');
                        contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
                        if (!blob) throw new Error('Não foi possível capturar a foto.');

                        stream.getTracks().forEach((faixa) => faixa.stop());
                        modalFoto.fechar();
                        menu.remove();
                        await salvarFotoReferencia(
                          new File([blob], 'foto-funcionario.jpg', { type: 'image/jpeg' })
                        );
                      }
                    })
                  ]
                });

                video.srcObject = stream;
                await video.play();
                const observadorFechamento = new MutationObserver(() => {
                  if (!document.body.contains(modalFoto.caixa)) {
                    stream.getTracks().forEach((faixa) => faixa.stop());
                    observadorFechamento.disconnect();
                  }
                });
                observadorFechamento.observe(document.body, { childList: true, subtree: true });
              } catch (erroCamera) {
                if (stream) stream.getTracks().forEach((faixa) => faixa.stop());
                console.error('Falha ao abrir a câmera para a foto de referência:', erroCamera);
                ui.toast(
                  erroCamera.name === 'NotAllowedError'
                    ? 'Permita o acesso à câmera nas configurações do navegador ou do aplicativo.'
                    : `Não foi possível abrir a câmera: ${erroCamera.message}`,
                  'erro'
                );
              }
            }

            seletorFotoReferencia.addEventListener('change', async () => {
              const arquivo = seletorFotoReferencia.files && seletorFotoReferencia.files[0];
              seletorFotoReferencia.value = '';
              menu.remove();
              if (!arquivo) return;
              try {
                await salvarFotoReferencia(arquivo);
              } catch (erro) {
                ui.toast(erro.message || 'Não foi possível salvar a foto de referência.', 'erro');
              }
            });

            const menu = el('div', { class: 'ti-menu-flutuante' }, [
              el('div', { style: { padding: '8px 12px', fontSize: '12px', color: '#888', borderBottom: '1px solid #eee' } }, [
                'Estado: ' + (p.ativo ? 'Ativo' : 'Desativado')
              ]),
              el('button', {
                type: 'button',
                style: {
                  background: 'transparent',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#294361',
                  fontWeight: '500'
                },
                onClick: abrirCameraReferencia
              }, ['Tirar foto']),
              el('button', {
                type: 'button',
                style: {
                  background: 'transparent',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: '#294361',
                  fontWeight: '500'
                },
                onClick: () => seletorFotoReferencia.click()
              }, ['Carregar foto']),
              seletorFotoReferencia,
              p.id === ctx.f.id ? el('div', { style: { padding: '8px 12px', fontSize: '12px', color: '#888' } }, ['(Você não pode desativar a si mesmo)']) :
              el('button', {
                type: 'button',
                style: {
                  background: 'transparent',
                  border: 'none',
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  cursor: 'pointer',
                  color: p.ativo ? '#d32f2f' : '#2e7d32',
                  fontWeight: '500'
                },
                onClick: async () => {
                  menu.remove();
                  if (p.ativo && !ui.confirmar('Desativar ' + p.nome + '? A pessoa perde o acesso ao painel.')) return;
                  await TI.dados.funcionarios.atualizar(p.id, { ativo: !p.ativo });
                  await TI.dados.auditoria.registrar(p.ativo ? 'funcionario.desativado' : 'funcionario.reativado', 'funcionario', p.id, { email: p.email });
                  ui.toast(p.ativo ? 'Funcionário desativado.' : 'Funcionário reativado.');
                  await recarregar();
                }
              }, [p.ativo ? 'Desativar funcionário' : 'Reativar funcionário'])
            ]);

            menu.style.position = 'absolute';
            menu.style.background = '#fff';
            menu.style.border = '1px solid rgba(0,0,0,0.1)';
            menu.style.borderRadius = '8px';
            menu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            menu.style.zIndex = '1000';
            menu.style.minWidth = '160px';

            const rect = botaoPontinhos.getBoundingClientRect();
            menu.style.top = (rect.bottom + window.scrollY + 4) + 'px';
            menu.style.left = (rect.right - 160 + window.scrollX) + 'px';
            
            document.body.appendChild(menu);

            const fecharMenu = (ev) => {
              if (!menu.contains(ev.target) && ev.target !== botaoPontinhos) {
                menu.remove();
                document.removeEventListener('click', fecharMenu);
              }
            };
            setTimeout(() => document.addEventListener('click', fecharMenu), 10);
          }
        }, ['⋮']);

        const acoesContainer = el('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [badgeStatus, botaoPontinhos]);

        return el('div', { class: 'ti-linha', style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' } }, [
          ui.avatar(p.nome, 'grande'),
          el('div', { class: 'ti-linha-texto', style: { flex: '1' } }, [
            el('span', { class: 'ti-linha-titulo' }, [p.nome + (p.id === ctx.f.id ? ' (você)' : '')]),
            ...(p.id_funcionarios
              ? [el('span', { class: 'ti-sub' }, ['ID do crachá: ' + p.id_funcionarios])]
              : [])
          ]),
          el('div', { class: 'ti-linha-texto', style: { flex: '1.5' } }, [
            el('span', {}, [texto]),
            el('div', { class: 'ti-barra' }, [el('div', { style: { width: Math.max(3, Math.round(carga.total / maior * 100)) + '%' } })])
          ]),
          acoesContainer
        ]);
      });

      lista.replaceChildren(
        el('div', { class: 'ti-cartao-cab' }, [el('h2', {}, ['Pessoas e carga de trabalho']), el('span', { class: 'ti-sub' }, [visiveis.filter((p) => p.ativo).length + ' ativo(s)'])]),
        ...(linhas.length ? linhas : [ui.vazio('Ninguém neste setor ainda.')])
      );
    }

    c.replaceChildren(
      ui.cabecalhoPagina(equipe.length + ' pessoa(s)', 'Equipe de TI',
        ui.botao('Novo funcionário', { tipo: 'primario', onClick: () => TI.telas.cadastroFuncionario.abrir(recarregar) })),
      pilulas,
      lista
    );
    desenhar();
  }
};

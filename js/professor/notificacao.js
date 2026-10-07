/**
 * @fileoverview js/professor/notificacao.js — Módulo de Notificações do Professor
 * 
 * Este módulo provê as rotinas de busca, cálculo de pendências, notificação sonora,
 * injeção resiliente do componente visual do sino no cabeçalho e exibição em dois níveis
 * de modais (listagem e leitura detalhada) com atualização em tempo real no Supabase.
 * 
 * @module NotificacoesProfessor
 * @requires dbListar
 * @requires dbInserir
 * @requires dbAtualizar
 * @requires dbAoAtualizar
 * @requires criarElemento
 */

/**
 * Guarda o quantitativo da leitura anterior para validar o disparo de sinal sonoro.
 * @type {number}
 */
let contadorAnteriorNotificacoes = 0;

/**
 * Busca e cruza os registros das tabelas `notificacoes_coordenador` e `notificacao_professores` 
 * para determinar quais avisos pertencem ao professor logado e qual o status de leitura.
 *
 * @async
 * @param {string} professorId - UUID do professor autenticado.
 * @returns {Promise<{pendentes: Array<Object>, todas: Array<Object>}>} Coleções filtradas.
 */
async function buscarNotificacoesProfessor(professorId) {
  try {
    const relacoes = await dbListar('notificacao_professores') || [];
    const notificacoes = await dbListar('notificacoes_coordenador') || [];

    // Mapeia os vínculos de leitura direcionados a este professor
    const minhasRelacoes = relacoes.filter(r => (r.professor_id || r.professorId) === professorId);
    const relacoesMap = new Map(minhasRelacoes.map(r => [r.notificacao_id || r.notificacaoId, r]));

    // Filtra avisos destinados a "todos" ou especificamente ao professor de forma ultra-resiliente
    const minhasNotificacoes = notificacoes.filter(n => {
      let dests = n.destinatarios;

      // Trata e normaliza os destinatários caso venham como string JSON ou texto puro
      if (typeof dests === 'string') {
        try { 
          dests = JSON.parse(dests); 
        } catch (e) { 
          dests = [dests]; 
        }
      }

      // Se destinatários estiver vazio/nulo, assume como notificação pública/global
      if (!dests) return true;

      const arrayDests = Array.isArray(dests) ? dests : [dests];
      
      const ehParaTodos = arrayDests.some(d => String(d).toLowerCase() === 'todos');
      const ehParaEsteProfessor = arrayDests.some(d => String(d).trim() === String(professorId).trim());

      return ehParaTodos || ehParaEsteProfessor;
    }).map(n => {
      const rel = relacoesMap.get(n.id);
      return {
        ...n,
        relacaoId: rel ? rel.id : null,
        lida: rel ? Boolean(rel.lida) : false
      };
    });

    // Ordenação decrescente por data de criação (mais recentes primeiro)
    minhasNotificacoes.sort((a, b) => new Date(b.criado_em || b.criadoEm || b.data || 0) - new Date(a.criado_em || a.criadoEm || a.data || 0));

    const pendentes = minhasNotificacoes.filter(n => !n.lida);

    return { pendentes, todas: minhasNotificacoes };
  } catch (err) {
    console.warn('[professor/notificacao.js] Erro na resolução de notificações:', err);
    return { pendentes: [], todas: [] };
  }
}

/**
 * Injeta o componente do sino no cabeçalho do painel do professor.
 *
 * @async
 * @param {HTMLElement} cabecalhoElemento - Contêiner pai do cabeçalho retornado por `montarCabecalhoPainel`.
 * @param {Object} professor - Objeto de dados do professor autenticado.
 * @returns {Promise<void>}
 */
async function inicializarSinoNotificacoes(cabecalhoElemento, professor) {
  if (!professor?.id) {
    console.warn('[notificacao.js] Dados do professor ausentes. Abortando inicialização do sino.');
    return;
  }

  // Prevenção de duplicidade em re-renderizações de abas
  const antigo = document.querySelector('.container-sino-notificacao');
  if (antigo) antigo.remove();

  // Container principal do Sino
  const containerSino = criarElemento('div', { 
    class: 'container-sino-notificacao',
    style: 'position: relative; cursor: pointer; display: inline-flex; align-items: center; margin-right: 15px; vertical-align: middle; z-index: 100;' 
  });

  // Ícone SVG vetorizado com badge numérico
  containerSino.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
    </svg>
    <span class="badge-notificacao" style="display: none; position: absolute; top: -5px; right: -6px; background-color: #ff3b30; color: white; border-radius: 50%; font-size: 0.72em; font-weight: bold; min-width: 18px; height: 18px; text-align: center; line-height: 18px; padding: 0 4px; box-shadow: 0 2px 5px rgba(255, 59, 48, 0.4);">0</span>
  `;

  const badge = containerSino.querySelector('.badge-notificacao');

  /**
   * Recalcula os pendentes e atualiza a visibilidade e o valor numérico do badge.
   * @async
   */
  async function atualizarContador() {
    const { pendentes, todas } = await buscarNotificacoesProfessor(professor.id);
    const qtd = pendentes.length;

    if (qtd > 0) {
      badge.textContent = qtd > 99 ? '99+' : String(qtd);
      badge.style.display = 'block';

      // Dispara efeito sonoro caso haja acréscimo de novas notificações em tempo real
      if (qtd > contadorAnteriorNotificacoes) {
        tocarSomNotificacao();
      }
    } else {
      badge.style.display = 'none';
    }

    contadorAnteriorNotificacoes = qtd;
    return { pendentes, todas };
  }

  await atualizarContador();

  // Evento de clique no sino para abertura da listagem geral
  containerSino.addEventListener('click', async () => {
    const { todas } = await buscarNotificacoesProfessor(professor.id);
    abrirModalListaNotificacoes(todas, professor, atualizarContador);
  });

  // Ancoragem resiliente com tentativas automáticas no DOM
  const tentarInserir = () => {
    if (document.querySelector('.container-sino-notificacao')) return true;

    const todosBotoes = Array.from(document.querySelectorAll('header button, .painel-cabecalho button, #tela-professor button, .cabecalho-usuario button, button'));
    const btnSair = todosBotoes.find(btn => {
      const texto = btn.textContent.trim().toLowerCase();
      return texto.includes('sair') || texto.includes('logout') || texto.includes('encerrar') || btn.classList.contains('btn-sair');
    });

    if (btnSair && btnSair.parentNode) {
      btnSair.parentNode.style.display = 'flex';
      btnSair.parentNode.style.alignItems = 'center';
      btnSair.parentNode.insertBefore(containerSino, btnSair);
      return true;
    } 

    const headerAlvo = cabecalhoElemento || document.querySelector('header') || document.querySelector('.painel-cabecalho') || document.querySelector('#tela-professor');
    if (headerAlvo) {
      const localInsercao = headerAlvo.querySelector('.cabecalho-usuario, .usuario-info, div:last-child') || headerAlvo;
      localInsercao.appendChild(containerSino);
      return true;
    }

    return false;
  };

  if (!tentarInserir()) {
    setTimeout(tentarInserir, 300);
    setTimeout(tentarInserir, 800);
    setTimeout(tentarInserir, 1500);
  }

  // Assinatura reativa no banco para atualizar o sino em tempo real sem refresh
  if (typeof dbAoAtualizar === 'function') {
    dbAoAtualizar(async () => {
      await atualizarContador();
    });
  }
}

/**
 * Sintetiza um aviso sonoro via Web Audio API.
 *
 * @function tocarSomNotificacao
 */
function tocarSomNotificacao() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.3, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start();
    osc.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.log('[notificacao.js] Áudio automático bloqueado pela política do navegador.');
  }
}

/**
 * Abre o primeiro modal com a listagem resumida de todas as notificações.
 *
 * @param {Array<Object>} listaNotificacoes - Lista de notificações.
 * @param {Object} professor - Dados do professor.
 * @param {Function} callbackAtualizar - Função para atualizar o badge do sino.
 */
function abrirModalListaNotificacoes(listaNotificacoes, professor, callbackAtualizar) {
  const overlay = criarElemento('div', {
    class: 'modal-overlay',
    style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;'
  });

  const modal = criarElemento('div', {
    class: 'modal-cartao',
    style: 'background: #fff; width: 90%; max-width: 550px; max-height: 80vh; border-radius: 8px; padding: 20px; display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2);'
  });

  const cabecalhoModal = criarElemento('div', {
    style: 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 15px;'
  }, [
    criarElemento('h3', { style: 'margin: 0; font-size: 1.2em; color: #333;' }, ['Notificações da Coordenação']),
    criarElemento('button', {
      style: 'background: none; border: none; font-size: 1.2em; cursor: pointer; color: #888;',
      onClick: () => overlay.remove()
    }, ['✕'])
  ]);

  const corpoModal = criarElemento('div', { style: 'overflow-y: auto; flex: 1; padding-right: 5px;' });

  if (!listaNotificacoes || listaNotificacoes.length === 0) {
    corpoModal.appendChild(
      criarElemento('div', { style: 'text-align: center; color: #888; padding: 20px;' }, ['Nenhuma notificação recebida.'])
    );
  } else {
    listaNotificacoes.forEach(notif => {
      const item = criarElemento('div', {
        class: `modal-notificacao-item ${notif.lida ? 'lida' : ''}`,
        style: `padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 4px solid ${notif.lida ? '#ccc' : '#007bff'}; background: ${notif.lida ? '#f9f9f9' : '#eef5ff'}; cursor: pointer; transition: background 0.2s;`
      });

      const titulo = criarElemento('h4', { style: 'margin: 0 0 5px 0; font-size: 1em; color: #222;' }, [notif.titulo]);
      // Mostra uma prévia curta da mensagem na listagem
      const resumoTexto = notif.mensagem && notif.mensagem.length > 90 ? notif.mensagem.substring(0, 90) + '...' : (notif.mensagem || '');
      const mensagem = criarElemento('p', { style: 'margin: 0 0 8px 0; font-size: 0.85em; color: #555;' }, [resumoTexto]);
      
      const rawData = notif.criado_em || notif.criadoEm || notif.data;
      const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR') : '';
      const rodape = criarElemento('small', { style: 'color: #999; font-size: 0.75em;' }, [dataFormatada]);

      item.append(titulo, mensagem, rodape);

      // Ao clicar no item da lista, abre o modal detalhado grande (segundo nível)
      item.addEventListener('click', () => {
        abrirModalDetalheNotificacao(notif, professor, async () => {
          // Atualiza o visual deste item na lista atual para cinza (lida)
          notif.lida = true;
          item.style.borderLeftColor = '#ccc';
          item.style.background = '#f9f9f9';
          await callbackAtualizar();
        });
      });

      corpoModal.appendChild(item);
    });
  }

  modal.append(cabecalhoModal, corpoModal);
  overlay.appendChild(modal);

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  document.body.appendChild(overlay);
}

/**
 * Abre o segundo modal (maior e expandido) para leitura completa da notificação,
 * efetuando a persistência de leitura (`lida = true`) no Supabase.
 *
 * @param {Object} notif - Objeto da notificação selecionada.
 * @param {Object} professor - Dados do professor autenticado.
 * @param {Function} callbackMarcadoLido - Função de callback para refletir a leitura na lista e no sino.
 */
function abrirModalDetalheNotificacao(notif, professor, callbackMarcadoLido) {
  const overlayDetalhe = criarElemento('div', {
    class: 'modal-overlay-detalhe',
    style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 1100;'
  });

  const modalGrande = criarElemento('div', {
    class: 'modal-cartao-grande',
    style: 'background: #fff; width: 92%; max-width: 650px; max-height: 85vh; border-radius: 10px; padding: 25px; display: flex; flex-direction: column; box-shadow: 0 15px 35px rgba(0,0,0,0.3);'
  });

  const cabecalhoDetalhe = criarElemento('div', {
    style: 'display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f0f0f0; padding-bottom: 12px; margin-bottom: 20px;'
  }, [
    criarElemento('h2', { style: 'margin: 0; font-size: 1.3em; color: #111;' }, [notif.titulo || 'Detalhes da Notificação']),
    criarElemento('button', {
      style: 'background: #f1f1f1; border: none; font-size: 1.1em; font-weight: bold; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; color: #444; display: flex; align-items: center; justify-content: center;',
      onClick: () => overlayDetalhe.remove()
    }, ['✕'])
  ]);

  const corpoDetalhe = criarElemento('div', { style: 'overflow-y: auto; flex: 1; padding-right: 5px; line-height: 1.6;' });

  const rawData = notif.criado_em || notif.criadoEm || notif.data;
  const dataFormatada = rawData ? new Date(rawData).toLocaleString('pt-BR') : '';
  
  const infoData = criarElemento('p', { style: 'margin: 0 0 15px 0; color: #888; font-size: 0.85em;' }, [`Recebido em: ${dataFormatada}`]);
  const textoMensagem = criarElemento('div', { style: 'margin: 0 0 20px 0; font-size: 1em; color: #333; white-space: pre-wrap; word-break: break-word;' }, [notif.mensagem || '']);

  corpoDetalhe.append(infoData, textoMensagem);

  if (notif.anexo_url || notif.anexoUrl) {
    const containerAnexo = criarElemento('div', { style: 'margin-top: 15px; padding-top: 15px; border-top: 1px dashed #ddd;' }, [
      criarElemento('a', {
        href: notif.anexo_url || notif.anexoUrl,
        target: '_blank',
        style: 'display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: #007bff; color: #fff; border-radius: 6px; text-decoration: none; font-size: 0.9em; font-weight: 500;'
      }, ['📎 Abrir Arquivo / Anexo'])
    ]);
    corpoDetalhe.appendChild(containerAnexo);
  }

  const rodapeDetalhe = criarElemento('div', {
    style: 'display: flex; justify-content: flex-end; margin-top: 20px; padding-top: 15px; border-top: 1px solid #f0f0f0;'
  }, [
    criarElemento('button', {
      style: 'background: #6c757d; color: #fff; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 0.9em;',
      onClick: () => overlayDetalhe.remove()
    }, ['Fechar'])
  ]);

  modalGrande.append(cabecalhoDetalhe, corpoDetalhe, rodapeDetalhe);
  overlayDetalhe.appendChild(modalGrande);

  overlayDetalhe.addEventListener('click', (e) => {
    if (e.target === overlayDetalhe) overlayDetalhe.remove();
  });

  document.body.appendChild(overlayDetalhe);

  // Se a notificação ainda não estava lida, efetua a gravação no banco de dados agora que foi aberta no modo detalhado
  if (!notif.lida) {
    (async () => {
      notif.lida = true;
      try {
        if (notif.relacaoId) {
          await dbAtualizar('notificacao_professores', notif.relacaoId, {
            lida: true,
            lida_em: new Date().toISOString()
          });
        } else {
          const res = await dbInserir('notificacao_professores', {
            notificacao_id: notif.id,
            professor_id: professor.id,
            lida: true,
            lida_em: new Date().toISOString()
          });
          if (res && res.id) notif.relacaoId = res.id;
        }
        await callbackMarcadoLido();
      } catch (err) {
        console.warn('[notificacao.js] Falha ao registrar leitura no modal detalhado:', err);
      }
    })();
  }
}

// Exposição no escopo global
window.inicializarSinoNotificacoes = inicializarSinoNotificacoes;

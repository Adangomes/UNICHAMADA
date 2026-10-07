/**
 * @fileoverview js/professor/notificacao.js — Módulo de Notificações do Professor
 * 
 * Este módulo provê as rotinas de busca, cálculo de pendências, notificação sonora,
 * injeção resiliente do componente visual do sino no cabeçalho e exibição da janela
 * modal com atualização de estado no PostgreSQL/Supabase por clique direto.
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

      // Dispara efeito sonoro caso haja acréscimo de novas notificações
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

  // Evento de clique para abertura do modal
  containerSino.addEventListener('click', async () => {
    const { todas } = await buscarNotificacoesProfessor(professor.id);
    abrirModalNotificacoesProfessor(todas, professor, atualizarContador);
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

  // Assinatura reativa no banco para atualizar o sino sem dar refresh
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
 * Constrói e exibe a janela modal com a listagem de avisos e 
 * executa a persistência de leitura (`lida = true`) no Supabase apenas após o clique do usuário na mensagem.
 *
 * @param {Array<Object>} listaNotificacoes - Coleção completa de notificações do professor.
 * @param {Object} professor - Dados do professor autenticado.
 * @param {Function} callbackAtualizar - Função para acionar a atualização do badge após leitura.
 */
function abrirModalNotificacoesProfessor(listaNotificacoes, professor, callbackAtualizar) {
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
      const mensagem = criarElemento('p', { style: 'margin: 0 0 8px 0; font-size: 0.9em; color: #555; white-space: pre-wrap;' }, [notif.mensagem]);
      
      const rawData = notif.criado_em || notif.criadoEm || notif.data;
      const dataFormatada = rawData ? new Date(rawData).toLocaleDateString('pt-BR') : '';
      const rodape = criarElemento('small', { style: 'color: #999; font-size: 0.75em;' }, [dataFormatada]);

      item.append(titulo, mensagem, rodape);

      if (notif.anexo_url || notif.anexoUrl) {
        const linkAnexo = criarElemento('a', {
          href: notif.anexo_url || notif.anexoUrl,
          target: '_blank',
          style: 'display: block; margin-top: 5px; font-size: 0.8em; color: #007bff; text-decoration: underline;'
        }, ['Ver Anexo']);
        item.appendChild(linkAnexo);
      }

      // Ao clicar na notificação dentro do modal, efetua a gravação de leitura no banco e muda o visual para cinza
      if (!notif.lida) {
        const marcarComoLida = async (e) => {
          // Evita conflito se clicar diretamente no link do anexo
          if (e.target.tagName === 'A') return;

          if (notif.lida) return;
          notif.lida = true;
          item.style.borderLeftColor = '#ccc';
          item.style.background = '#f9f9f9';

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
            await callbackAtualizar();
          } catch (err) {
            console.warn('[notificacao.js] Falha ao registrar confirmação de leitura:', err);
          }
        };

        item.addEventListener('click', marcarComoLida);
      }

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

// Exposição no escopo global
window.inicializarSinoNotificacoes = inicializarSinoNotificacoes;

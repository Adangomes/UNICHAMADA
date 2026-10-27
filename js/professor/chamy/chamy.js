/**
 * @fileoverview chamy.js — Chamy, o assistente de dados do UniChamada (painel do professor)
 *
 * O professor pergunta em linguagem natural; o front-end envia a pergunta e o contexto
 * atual das turmas do professor para o Webhook do n8n; o n8n processa e devolve a resposta.
 *
 * @module Chamy
 */

/* ==========================================================================
   CONFIGURAÇÃO — dados do seu n8n e ajustes do botão
   ========================================================================== */
const CHAMY_CONFIG = {
  // URL de PRODUÇÃO do nó Webhook do n8n (via túnel Cloudflare)
  webhookUrl: 'https://characteristics-encoding-fuel-weeks.trycloudflare.com/webhook/3fe52560-8e23-4407-8185-b40535e199ec',
  token: 'chamy-7Hk29xQpLw83mZ4vTb',
  icone: 'js/professor/chamy/chamy.png',
  timeoutMs: 60000,
  maxPergunta: 500,
  folgaMaxima: 24
};

// Perguntas prontas que aparecem como botões quando o painel abre
const CHAMY_SUGESTOES = [
  'Quantos alunos tenho em cada turma?',
  'Qual a taxa de presença das minhas turmas?',
  'Quais alunos mais faltaram este mês?'
];

// Estado do Chamy enquanto a página está aberta
const estadoChamy = {
  aberto: false,
  enviando: false,
  professor: null,
  sessaoId: '',
  observador: null,
  redimensionador: null
};

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */

/** Cria um elemento HTML com atributos e filhos. */
function chamyEl(tag, attrs = {}, filhos = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function')
      el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  [].concat(filhos).forEach((f) => el.append(f));
  return el;
}

/** Converte o texto da resposta em nós seguros (negrito e listas). */
function chamyFormatarResposta(texto) {
  const caixa = document.createDocumentFragment();
  String(texto || '').split('\n').forEach((linha) => {
    const ehItem = /^\s*[-•*]\s+/.test(linha);
    const limpa = linha.replace(/^\s*[-•*]\s+/, '');
    const p = chamyEl('p', { class: ehItem ? 'chamy-item' : '' });
    limpa.split(/(\*\*[^*]+\*\*)/g).forEach((parte) => {
      if (/^\*\*[^*]+\*\*$/.test(parte))
        p.append(chamyEl('strong', {}, [parte.slice(2, -2)]));
      else p.append(parte);
    });
    if (limpa.trim() || ehItem) caixa.append(p);
  });
  return caixa;
}

/** Gera ou recupera o id da sessão de conversa. */
function chamyIdSessao() {
  const chave = 'chamy_sessao_id';
  const novoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
  try {
    let id = sessionStorage.getItem(chave);
    if (!id) { id = novoId(); sessionStorage.setItem(chave, id); }
    return id;
  } catch (e) {
    return novoId();
  }
}

/* ==========================================================================
   PAINEL DE CONVERSA
   ========================================================================== */

/** Adiciona um balão de mensagem na lista. */
function chamyAdicionarMensagem(lista, autor, conteudo, classeExtra = '') {
  const balao = chamyEl('div', { class: `chamy-msg chamy-msg-${autor} ${classeExtra}`.trim() });
  if (typeof conteudo === 'string' && autor === 'chamy')
    balao.append(chamyFormatarResposta(conteudo));
  else if (typeof conteudo === 'string') balao.textContent = conteudo;
  else balao.append(conteudo);
  lista.append(balao);
  lista.scrollTop = lista.scrollHeight;
  return balao;
}

/** Envia a pergunta ao n8n juntamente com o contexto atual do professor. */
async function chamyEnviar(pergunta, lista, campo, botaoEnviar) {
  const texto = String(pergunta || '').trim().slice(0, CHAMY_CONFIG.maxPergunta);
  if (!texto || estadoChamy.enviando) return;

  if (CHAMY_CONFIG.webhookUrl.startsWith('COLE_AQUI')) {
    chamyAdicionarMensagem(lista, 'chamy', 'Ainda não estou conectado ao n8n. Configure a URL do webhook.');
    return;
  }

  estadoChamy.enviando = true;
  campo.value = '';
  botaoEnviar.disabled = true;
  chamyAdicionarMensagem(lista, 'professor', texto);
  const digitando = chamyAdicionarMensagem(lista, 'chamy',
    chamyEl('span', { class: 'chamy-digitando' }, [chamyEl('i'), chamyEl('i'), chamyEl('i')]), 'chamy-msg-digitando');

  const controle = new AbortController();
  const temporizador = setTimeout(() => controle.abort(), CHAMY_CONFIG.timeoutMs);

  try {
    const prof = estadoChamy.professor || {};

    // Recupera dados do cache do professor para enviar no contexto (se houver)
    const turmasCache = window.UNICHAMADA_CACHE?.get(`turmas_prof_${prof.id}`) || [];

    const resposta = await fetch(CHAMY_CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controle.signal,
      body: JSON.stringify({
        token: CHAMY_CONFIG.token,
        pergunta: texto,
        professor_id: prof.id,
        professor_nome: prof.nome,
        sessao_id: estadoChamy.sessaoId,
        // Contexto inteligente puxado diretamente do estado atual da tela/cache
        contexto_atual: {
          turmas_visiveis: turmasCache,
          aba_ativa: typeof abaAtivaProfessor !== 'undefined' ? abaAtivaProfessor : 'geral'
        }
      })
    });

    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const dados = await resposta.json();
    const textoResposta = dados.resposta || dados.output || dados.text || '';
    digitando.remove();
    chamyAdicionarMensagem(lista, 'chamy', textoResposta || 'Não consegui montar uma resposta para essa pergunta.');
  } catch (erro) {
    digitando.remove();
    const msg = erro.name === 'AbortError'
      ? 'Demorei demais para responder. Tente de novo ou faça uma pergunta mais simples.'
      : 'Não consegui falar com o servidor agora. Verifique se o n8n está no ar e tente novamente.';
    chamyAdicionarMensagem(lista, 'chamy', msg, 'chamy-msg-erro');
    console.error('[Chamy]', erro);
  } finally {
    clearTimeout(temporizador);
    estadoChamy.enviando = false;
    botaoEnviar.disabled = false;
    campo.focus();
  }
}

/** Monta o painel de conversa. */
function chamyMontarPainel() {
  document.getElementById('chamy-painel')?.remove();

  const lista = chamyEl('div', { class: 'chamy-lista', 'aria-live': 'polite' });
  const campo = chamyEl('textarea', {
    class: 'chamy-campo', rows: '1', maxlength: String(CHAMY_CONFIG.maxPergunta),
    placeholder: 'Pergunte algo sobre suas turmas…'
  });
  const botaoEnviar = chamyEl('button', { class: 'chamy-enviar', type: 'button', title: 'Enviar' }, ['➤']);

  const enviar = () => chamyEnviar(campo.value, lista, campo, botaoEnviar);
  botaoEnviar.addEventListener('click', enviar);
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); }
  });
  campo.addEventListener('input', () => {
    campo.style.height = 'auto';
    campo.style.height = Math.min(campo.scrollHeight, 110) + 'px';
  });

  const nome = (estadoChamy.professor?.nome || '').split(' ')[0];
  chamyAdicionarMensagem(lista, 'chamy',
    `Olá${nome ? ', ' + nome : ''}! Eu sou o **Chamy**. Posso consultar os dados das suas turmas. O que você quer saber?`);

  const sugestoes = chamyEl('div', { class: 'chamy-sugestoes' },
    CHAMY_SUGESTOES.map((s) => chamyEl('button', {
      class: 'chamy-chip', type: 'button',
      onClick: () => { sugestoes.remove(); chamyEnviar(s, lista, campo, botaoEnviar); }
    }, [s])));
  lista.append(sugestoes);

  const painel = chamyEl('section', {
    id: 'chamy-painel', class: 'chamy-painel', role: 'dialog', 'aria-label': 'Chamy, assistente de dados'
  }, [
    chamyEl('header', { class: 'chamy-topo' }, [
      chamyEl('img', { src: CHAMY_CONFIG.icone, alt: '', class: 'chamy-topo-icone' }),
      chamyEl('div', { class: 'chamy-topo-texto' }, [
        chamyEl('strong', {}, ['Chamy']),
        chamyEl('span', {}, ['Assistente'])
      ]),
      chamyEl('button', { class: 'chamy-fechar', type: 'button', title: 'Fechar', onClick: chamyAlternar }, ['✕'])
    ]),
    lista,
    chamyEl('footer', { class: 'chamy-rodape' }, [campo, botaoEnviar]),
    chamyEl('p', { class: 'chamy-aviso' }, [''])
  ]);

  document.body.appendChild(painel);
  return painel;
}

/** Abre ou fecha o painel de conversa. */
function chamyAlternar() {
  const painel = document.getElementById('chamy-painel') || chamyMontarPainel();
  estadoChamy.aberto = !estadoChamy.aberto;
  painel.classList.toggle('aberto', estadoChamy.aberto);
  document.getElementById('chamy-botao')?.classList.toggle('ativo', estadoChamy.aberto);
  if (estadoChamy.aberto) painel.querySelector('.chamy-campo')?.focus();
}

/* ==========================================================================
   BOTÃO AO LADO DO SINO
   ========================================================================== */

function chamyAcharSair(cabecalho) {
  return [...cabecalho.querySelectorAll('button, a')].find((el) =>
    /^\s*sair\s*$/i.test(el.textContent)
  ) || null;
}

function chamyAcharSino(cabecalho) {
  const porSeletor = cabecalho.querySelector(
    '.sino, .sino-notificacoes, .btn-sino, #btn-sino, .notificacoes-sino, .notif-sino, [data-sino], [data-notificacoes], [class*="sino"], [class*="notif"]'
  );
  if (porSeletor) return porSeletor;

  const porTexto = [...cabecalho.querySelectorAll('button, a, div, span')].find((el) =>
    el.textContent.includes('🔔') || /notifica/i.test(el.getAttribute('title') || el.getAttribute('aria-label') || '')
  );
  if (porTexto) return porTexto;

  const sair = chamyAcharSair(cabecalho);
  const anterior = sair?.previousElementSibling;
  return anterior && anterior.id !== 'chamy-botao' ? anterior : null;
}

function inicializarChamy(cabecalho, professor) {
  estadoChamy.professor = professor || {};
  estadoChamy.sessaoId = chamyIdSessao();
  estadoChamy.aberto = false;
  document.getElementById('chamy-botao')?.remove();
  document.getElementById('chamy-painel')?.remove();

  const botao = chamyEl('button', {
    id: 'chamy-botao', class: 'chamy-botao', type: 'button',
    title: 'Pergunte ao Chamy', 'aria-label': 'Abrir o Chamy', onClick: chamyAlternar
  }, [chamyEl('img', { src: CHAMY_CONFIG.icone, alt: 'Chamy' })]);

  chamyPosicionar(botao, cabecalho);

  estadoChamy.observador?.disconnect();
  let agendado = false;
  estadoChamy.observador = new MutationObserver(() => {
    if (botao.isConnected || agendado) return;
    agendado = true;
    setTimeout(() => {
      agendado = false;
      if (!botao.isConnected) chamyPosicionar(botao, cabecalho);
    }, 50);
  });
  estadoChamy.observador.observe(cabecalho, { childList: true, subtree: true });

  estadoChamy.redimensionador?.disconnect();
  if (window.ResizeObserver) {
    estadoChamy.redimensionador = new ResizeObserver(() => {
      if (botao.isConnected) chamyAjustarProximidade(botao, cabecalho);
    });
    estadoChamy.redimensionador.observe(cabecalho);
  }
}

function chamyPosicionar(botao, cabecalho) {
  try {
    const sair = chamyAcharSair(cabecalho);
    let sino = chamyAcharSino(cabecalho);

    if (sino && sair) {
      while (sino.parentNode && sino.parentNode !== sair.parentNode && sino.parentNode !== cabecalho) {
        sino = sino.parentNode;
      }
    }

    const referencia = sino || sair;
    if (referencia && referencia.parentNode && !referencia.contains(botao)) {
      referencia.parentNode.insertBefore(botao, referencia);
    } else {
      cabecalho.appendChild(botao);
    }

    chamyAjustarProximidade(botao, cabecalho);

    const cabecalhoVisivel = cabecalho.offsetWidth > 0;
    if (cabecalhoVisivel && botao.offsetWidth === 0 && botao.offsetHeight === 0) cabecalho.appendChild(botao);
  } catch (erro) {
    console.error('[Chamy] erro ao posicionar o botão:', erro);
    if (!botao.isConnected) cabecalho.appendChild(botao);
  }
}

function chamyAjustarProximidade(botao, cabecalho) {
  const vizinho = botao.nextElementSibling;
  if (!vizinho || cabecalho.offsetWidth === 0) return;

  botao.style.marginLeft = '';
  if (vizinho.dataset.chamyMl !== undefined) {
    vizinho.style.marginLeft = vizinho.dataset.chamyMl;
    delete vizinho.dataset.chamyMl;
  }

  const folga = vizinho.getBoundingClientRect().left - botao.getBoundingClientRect().right;
  if (folga > CHAMY_CONFIG.folgaMaxima) {
    botao.style.marginLeft = 'auto';
    const mlVizinho = parseFloat(getComputedStyle(vizinho).marginLeft);
    if (mlVizinho > CHAMY_CONFIG.folgaMaxima) {
      vizinho.dataset.chamyMl = vizinho.style.marginLeft || '';
      vizinho.style.marginLeft = '0';
    }
  }
}

window.inicializarChamy = inicializarChamy;
window.inicializarChamyProfessor = inicializarChamy;

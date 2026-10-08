/**
 * @fileoverview chamy.js — Chamy, o assistente de dados do UniChamada (painel do professor)
 *
 * O professor pergunta em linguagem natural; o front-end envia a pergunta para um
 * Webhook do n8n; o n8n (agente de IA + Supabase) consulta o banco e devolve a resposta.
 *
 * Fluxo:  [botão do robô ao lado do sino] -> painel de conversa -> POST no webhook do n8n
 *         -> n8n responde JSON { "resposta": "texto" } -> aparece no painel.
 *
 * Como ligar no painel: em professor.js, logo depois de inicializarSinoNotificacoes(...):
 *     if (typeof inicializarChamy === 'function') inicializarChamy(cabecalho, professorLogado);
 *
 * @module Chamy
 */

/* ==========================================================================
   CONFIGURAÇÃO — troque pelos dados do seu n8n
   ========================================================================== */
const CHAMY_CONFIG = {
  // URL de PRODUÇÃO do nó Webhook do n8n (precisa ser um endereço público, https)
  webhookUrl: 'COLE_AQUI_A_URL_DO_WEBHOOK_DO_N8N',
  // Chave simples conferida pelo n8n. Atenção: fica no código público do site,
  // então só barra abuso casual — a proteção de verdade é o limite de uso no n8n.
  token: 'troque-por-uma-chave-longa-e-aleatoria',
  // Caminho do ícone (relativo à raiz do site)
  icone: 'js/professor/chamy/chamy.png',
  // Tempo máximo de espera pela resposta (ms)
  timeoutMs: 60000,
  // Máximo de caracteres por pergunta
  maxPergunta: 500
};

const CHAMY_SUGESTOES = [
  'Quantos alunos tenho em cada turma?',
  'Qual a taxa de presença das minhas turmas?',
  'Quais alunos mais faltaram este mês?'
];

/** @type {{aberto: boolean, enviando: boolean, professor: Object|null, sessaoId: string}} */
const estadoChamy = { aberto: false, enviando: false, professor: null, sessaoId: '' };

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */

/** Cria um elemento com atributos e filhos (texto ou nós). */
function chamyEl(tag, attrs = {}, filhos = []) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  [].concat(filhos).forEach((f) => el.append(f));
  return el;
}

/**
 * Converte o texto da resposta em nós seguros: quebras de linha, **negrito** e listas "- item".
 * Nunca usa innerHTML com texto vindo do servidor.
 */
function chamyFormatarResposta(texto) {
  const caixa = document.createDocumentFragment();
  String(texto || '').split('\n').forEach((linha) => {
    const ehItem = /^\s*[-•*]\s+/.test(linha);
    const limpa = linha.replace(/^\s*[-•*]\s+/, '');
    const p = chamyEl('p', { class: ehItem ? 'chamy-item' : '' });
    limpa.split(/(\*\*[^*]+\*\*)/g).forEach((parte) => {
      if (/^\*\*[^*]+\*\*$/.test(parte)) p.append(chamyEl('strong', {}, [parte.slice(2, -2)]));
      else p.append(parte);
    });
    if (limpa.trim() || ehItem) caixa.append(p);
  });
  return caixa;
}

function chamyIdSessao() {
  const chave = 'chamy_sessao_id';
  let id = sessionStorage.getItem(chave);
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    sessionStorage.setItem(chave, id);
  }
  return id;
}

/* ==========================================================================
   PAINEL DE CONVERSA
   ========================================================================== */

function chamyAdicionarMensagem(lista, autor, conteudo, classeExtra = '') {
  const balao = chamyEl('div', { class: `chamy-msg chamy-msg-${autor} ${classeExtra}`.trim() });
  if (typeof conteudo === 'string' && autor === 'chamy') balao.append(chamyFormatarResposta(conteudo));
  else if (typeof conteudo === 'string') balao.textContent = conteudo;
  else balao.append(conteudo);
  lista.append(balao);
  lista.scrollTop = lista.scrollHeight;
  return balao;
}

/** Envia a pergunta ao n8n e mostra a resposta. */
async function chamyEnviar(pergunta, lista, campo, botaoEnviar) {
  const texto = String(pergunta || '').trim().slice(0, CHAMY_CONFIG.maxPergunta);
  if (!texto || estadoChamy.enviando) return;

  if (CHAMY_CONFIG.webhookUrl.startsWith('COLE_AQUI')) {
    chamyAdicionarMensagem(lista, 'chamy', 'Ainda não estou conectado ao n8n. Configure a URL do webhook em js/professor/chamy/chamy.js.');
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
    const resposta = await fetch(CHAMY_CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controle.signal,
      body: JSON.stringify({
        token: CHAMY_CONFIG.token,
        pergunta: texto,
        professor_id: prof.id,
        professor_nome: prof.nome,
        sessao_id: estadoChamy.sessaoId
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

/** Monta o painel (uma vez) e o devolve. */
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
        chamyEl('span', {}, ['Assistente de dados'])
      ]),
      chamyEl('button', { class: 'chamy-fechar', type: 'button', title: 'Fechar', onClick: chamyAlternar }, ['✕'])
    ]),
    lista,
    chamyEl('footer', { class: 'chamy-rodape' }, [campo, botaoEnviar]),
    chamyEl('p', { class: 'chamy-aviso' }, ['Respostas geradas por IA — confira dados importantes.'])
  ]);

  document.body.appendChild(painel);
  return painel;
}

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

/** Procura o sino de notificações dentro do cabeçalho (vários nomes possíveis de classe). */
function chamyAcharSino(cabecalho) {
  const porSeletor = cabecalho.querySelector(
    '.sino, .sino-notificacoes, .btn-sino, #btn-sino, .notificacoes-sino, .notif-sino, [data-sino], [data-notificacoes]'
  );
  if (porSeletor) return porSeletor;
  return [...cabecalho.querySelectorAll('button, a, div')].find((el) =>
    el.textContent.includes('🔔') || /notifica/i.test(el.getAttribute('title') || el.getAttribute('aria-label') || '')
  ) || null;
}

/**
 * Ponto de entrada: coloca o robô ao lado do sino e prepara o painel.
 * @param {HTMLElement} cabecalho - Cabeçalho do painel do professor.
 * @param {Object} professor - Professor logado.
 */
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

  const sino = chamyAcharSino(cabecalho);
  if (sino && sino.parentNode) sino.parentNode.insertBefore(botao, sino);
  else cabecalho.appendChild(botao);   // plano B: se o sino não for achado, entra no fim do cabeçalho
}

window.inicializarChamy = inicializarChamy;
// Nome usado no professor.js: inicializarChamyProfessor(cabecalho, professorLogado)
window.inicializarChamyProfessor = inicializarChamy;

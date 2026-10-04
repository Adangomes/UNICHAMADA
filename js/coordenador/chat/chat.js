/* =========================================================
   UniChamada - Chat do Coordenador (interface)
   Login: auth/chat_auth.js | Dados: data/chat.js
   Uso: iniciarChatCoordenador('chat-coordenador-root')
   ========================================================= */
(function () {
  'use strict';

  const PAPEL = 'coordenador';
  const OUTRO = 'professor';
  const ROTULO_PLURAL = 'Professores';
  const ROTULO_SING = 'Professor';
  const Auth = window.ChatAuth;
  const Dados = window.ChatDados;

  let eu = null, raiz = null, contatos = [], ativo = null, idsRenderizados = new Set();

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iniciais = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const $ = (sel) => raiz.querySelector(sel);

  // ---------- LAYOUT ----------
  function montarLayout() {
    raiz.classList.add('chat-app', 'chat-' + PAPEL);
    raiz.innerHTML = `
      <aside class="chat-lateral">
        <div class="chat-topo"><h2 class="chat-titulo">Chat</h2><button class="chat-sair" type="button">Sair</button></div>
        <div class="chat-tabs"><button class="chat-tab ativo" type="button">${ROTULO_PLURAL}</button></div>
        <input class="chat-busca" type="search" placeholder="Pesquisar..." autocomplete="off">
        <ul class="chat-lista"></ul>
      </aside>
      <section class="chat-painel">
        <header class="chat-cabecalho"><span class="chat-vazio-titulo">Selecione uma conversa</span></header>
        <div class="chat-mensagens"></div>
        <div class="chat-entrada">
          <input class="chat-input" type="text" placeholder="Digite sua mensagem..." autocomplete="off" disabled>
          <button class="chat-enviar" type="button" disabled>Enviar</button>
        </div>
      </section>`;
    $('.chat-sair').addEventListener('click', sair);
    $('.chat-busca').addEventListener('input', renderLista);
    $('.chat-enviar').addEventListener('click', enviar);
    $('.chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
  }

  function renderLista() {
    const termo = $('.chat-busca').value.trim().toLowerCase();
    const ul = $('.chat-lista');
    const lista = contatos.filter((c) => c.nome.toLowerCase().includes(termo));
    if (!lista.length) { ul.innerHTML = '<li class="chat-sem-contatos">Nenhum contato encontrado</li>'; return; }
    ul.innerHTML = lista.map((c) => `
      <li class="chat-contato ${ativo && ativo.id === c.id ? 'ativo' : ''}" data-id="${esc(c.id)}">
        <div class="chat-avatar">${esc(iniciais(c.nome))}</div>
        <div class="chat-contato-info">
          <strong>${esc(c.nome)}</strong>
          <small>${esc(c.conversa?.ultima_mensagem || 'Nenhuma mensagem ainda')}</small>
        </div>
        ${c.naoLidas ? `<span class="chat-badge">${c.naoLidas}</span>` : ''}
      </li>`).join('');
    ul.querySelectorAll('.chat-contato').forEach((li) =>
      li.addEventListener('click', () => abrirConversa(contatos.find((c) => String(c.id) === li.dataset.id))));
  }

  function balao(m) {
    const meu = m.remetente_tipo === PAPEL;
    return `<div class="chat-linha ${meu ? 'enviada' : 'recebida'}">
      <div class="chat-balao">${esc(m.conteudo)}<span class="chat-hora">${hora(m.created_at)}</span></div></div>`;
  }

  function rolarFim() { const a = $('.chat-mensagens'); a.scrollTop = a.scrollHeight; }

  // ---------- AÇÕES ----------
  async function carregarContatos() {
    try {
      contatos = await Dados.listarContatos(PAPEL, eu.id);
    } catch (e) { console.error('Chat: erro ao carregar contatos', e); return; }
    contatos.sort((a, b) =>
      (b.conversa?.ultima_mensagem_em || '').localeCompare(a.conversa?.ultima_mensagem_em || '') || a.nome.localeCompare(b.nome));
    renderLista();
  }

  async function abrirConversa(contato) {
    if (!contato) return;
    ativo = contato;
    if (!contato.conversa) contato.conversa = await Dados.garantirConversa(PAPEL, eu.id, contato.id);
    if (!contato.conversa) return;

    $('.chat-cabecalho').innerHTML = `
      <div class="chat-avatar">${esc(iniciais(contato.nome))}</div>
      <div><strong>${esc(contato.nome)}</strong><small>${ROTULO_SING}</small></div>`;
    $('.chat-input').disabled = false;
    $('.chat-enviar').disabled = false;
    $('.chat-input').focus();

    const msgs = await Dados.listarMensagens(contato.conversa.id);
    idsRenderizados = new Set(msgs.map((m) => m.id));
    $('.chat-mensagens').innerHTML = msgs.map(balao).join('') ||
      '<p class="chat-vazio">Nenhuma mensagem ainda. Diga olá!</p>';
    rolarFim();
    await Dados.marcarComoLidas(contato.conversa.id, OUTRO);
    contato.naoLidas = 0;
    renderLista();
  }

  async function enviar() {
    const input = $('.chat-input');
    const texto = input.value.trim();
    if (!texto || !ativo || !ativo.conversa) return;
    input.value = '';
    const msg = await Dados.enviarMensagem(ativo.conversa.id, PAPEL, texto);
    if (!msg) { input.value = texto; return; }
    adicionarMensagem(msg);
    ativo.conversa.ultima_mensagem = texto;
    ativo.conversa.ultima_mensagem_em = msg.created_at;
    renderLista();
  }

  function adicionarMensagem(m) {
    if (idsRenderizados.has(m.id)) return;
    idsRenderizados.add(m.id);
    const area = $('.chat-mensagens');
    const vazio = area.querySelector('.chat-vazio');
    if (vazio) vazio.remove();
    area.insertAdjacentHTML('beforeend', balao(m));
    rolarFim();
  }

  async function receber(m) {
    let contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
    if (!contato) {                        // conversa nova iniciada pela outra pessoa
      await carregarContatos();
      contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
      if (!contato) return;
    }
    contato.conversa.ultima_mensagem = m.conteudo;
    contato.conversa.ultima_mensagem_em = m.created_at;
    if (ativo && ativo.conversa && ativo.conversa.id === m.conversa_id) {
      adicionarMensagem(m);
      if (m.remetente_tipo === OUTRO) Dados.marcarComoLidas(m.conversa_id, OUTRO);
    } else if (m.remetente_tipo === OUTRO) {
      contato.naoLidas += 1;
    }
    renderLista();
  }

  // ---------- LOGIN / SAÍDA ----------
  async function abrirChat() {
    montarLayout();
    await carregarContatos();
    Dados.assinar(PAPEL, eu.id, receber);
  }

  function renderLogin(msg) {
    raiz.classList.add('chat-' + PAPEL);
    raiz.innerHTML = `
      <form class="chat-login">
        <h2>Chat do Coordenador</h2>
        <p>Entre com a conta do chat.</p>
        <input class="chat-login-email" type="email" placeholder="E-mail" required autocomplete="username">
        <input class="chat-login-senha" type="password" placeholder="Senha" required autocomplete="current-password">
        <button class="chat-enviar" type="submit">Entrar</button>
        <p class="chat-login-erro">${esc(msg || '')}</p>
      </form>`;
    raiz.querySelector('.chat-login').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = raiz.querySelector('.chat-enviar');
      btn.disabled = true; btn.textContent = 'Entrando...';
      const r = await Auth.entrar(raiz.querySelector('.chat-login-email').value,
                                  raiz.querySelector('.chat-login-senha').value, PAPEL);
      if (r.erro) { renderLogin(r.erro); return; }
      eu = r.perfil;
      await abrirChat();
    });
  }

  async function sair() {
    Dados.cancelar();
    await Auth.sair();
    eu = null; ativo = null; contatos = [];
    renderLogin();
  }

  // ---------- API PÚBLICA ----------
  window.iniciarChatCoordenador = async function (idContainer) {
    raiz = document.getElementById(idContainer || 'chat-coordenador-root');
    if (!raiz) { console.error('Chat: container não encontrado'); return; }
    if (!Auth || !Dados) {
      raiz.innerHTML = '<p class="chat-vazio">Carregue auth/chat_auth.js e data/chat.js antes deste arquivo.</p>';
      return;
    }
    const p = await Auth.perfil(PAPEL);
    if (!p) { renderLogin(); return; }
    eu = p;
    await abrirChat();
  };
})();

/* =========================================================
   UniChamada - Chat do Coordenador (interface)
   Identidade: login do sistema (auth.js) | Dados: js/data/chat.js
   Recursos (pasta config/): editar_msg, excluir, emojis, fotos-e-arquivos, menu-contexto
   Uso: iniciarChatCoordenador('chat-coordenador-root')
   ========================================================= */
(function () {
  'use strict';

  const PAPEL = 'coordenador';
  const OUTRO = 'professor';
  const ROTULO_PLURAL = 'Professores';
  const ROTULO_SING = 'Professor';
  const Dados = window.ChatDados;

  // Módulos de config/ (podem faltar: o chat de texto continua funcionando)
  const Menu = () => window.ChatMenu;
  const Editar = () => window.ChatEditar;
  const Excluir = () => window.ChatExcluir;
  const Emojis = () => window.ChatEmojis;
  const Anexos = () => window.ChatAnexos;

  let eu = null, raiz = null, contatos = [], ativo = null;
  let mensagens = new Map();        // id -> mensagem da conversa aberta
  let online = new Set();           // chaves "papel:id" de quem está online
  let timerRecarga = null;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iniciais = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const $ = (sel) => raiz.querySelector(sel);
  const estaOnline = (c) => online.has(OUTRO + ':' + c.id);

  // Texto curto para a lista de contatos
  function previaDe(m) {
    if (m.apagada) return 'Mensagem apagada';
    if (m.tipo === 'imagem') return '📷 Foto';
    if (m.tipo === 'arquivo') return '📎 ' + (m.arquivo_nome || 'Arquivo');
    return m.conteudo;
  }

  // ---------- LAYOUT ----------
  function montarLayout() {
    raiz.classList.add('chat-app', 'chat-' + PAPEL);
    raiz.innerHTML = `
      <aside class="chat-lateral">
        <div class="chat-topo"><h2 class="chat-titulo">Chat</h2></div>
        <div class="chat-tabs"><button class="chat-tab ativo" type="button">${ROTULO_PLURAL}</button></div>
        <input class="chat-busca" type="search" placeholder="Pesquisar..." autocomplete="off">
        <ul class="chat-lista"></ul>
      </aside>
      <section class="chat-painel">
        <header class="chat-cabecalho"><span class="chat-vazio-titulo">Selecione uma conversa</span></header>
        <div class="chat-mensagens"></div>
        <div class="chat-entrada">
          <button class="chat-icone-btn chat-btn-anexo" type="button" title="Enviar foto ou arquivo" disabled>📎</button>
          <button class="chat-icone-btn chat-btn-emoji" type="button" title="Emojis" disabled>😊</button>
          <input class="chat-input" type="text" placeholder="Digite sua mensagem..." autocomplete="off" disabled>
          <button class="chat-enviar" type="button" disabled>Enviar</button>
        </div>
      </section>`;
    $('.chat-busca').addEventListener('input', renderLista);
    $('.chat-enviar').addEventListener('click', enviar);
    $('.chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
    $('.chat-btn-anexo').addEventListener('click', anexar);
    $('.chat-btn-emoji').addEventListener('click', () => {
      if (Emojis()) Emojis().abrir($('.chat-btn-emoji'), (emoji) => Emojis().inserirNoCampo($('.chat-input'), emoji));
    });
  }

  function avatarHtml(c) {
    return `<div class="chat-avatar-wrap"><div class="chat-avatar">${esc(iniciais(c.nome))}</div>` +
           `<span class="chat-ponto ${estaOnline(c) ? 'online' : ''}"></span></div>`;
  }

  function renderLista() {
    const termo = $('.chat-busca').value.trim().toLowerCase();
    const ul = $('.chat-lista');
    const lista = contatos.filter((c) => c.nome.toLowerCase().includes(termo));
    if (!lista.length) { ul.innerHTML = '<li class="chat-sem-contatos">Nenhum contato encontrado</li>'; return; }
    ul.innerHTML = lista.map((c) => `
      <li class="chat-contato ${ativo && String(ativo.id) === String(c.id) ? 'ativo' : ''}" data-id="${esc(c.id)}">
        ${avatarHtml(c)}
        <div class="chat-contato-info">
          <strong>${esc(c.nome)}</strong>
          <small>${esc(c.conversa?.ultima_mensagem || 'Nenhuma mensagem ainda')}</small>
        </div>
        ${c.naoLidas ? `<span class="chat-badge">${c.naoLidas}</span>` : ''}
      </li>`).join('');
    ul.querySelectorAll('.chat-contato').forEach((li) => {
      const contato = contatos.find((c) => String(c.id) === li.dataset.id);
      li.addEventListener('click', () => {
        if (Menu() && Menu().recemAberto()) return;      // soltou o dedo depois de segurar
        abrirConversa(contato);
      });
      if (Menu() && Excluir()) {
        Menu().vincular(li, () => [Excluir().itemMenuConversa(contato, () => apagarConversa(contato))]);
      }
    });
  }

  function atualizarCabecalho() {
    if (!ativo) return;
    const on = estaOnline(ativo);
    $('.chat-cabecalho').innerHTML = `
      ${avatarHtml(ativo)}
      <div><strong>${esc(ativo.nome)}</strong>
      <small class="${on ? 'chat-status-online' : ''}">${on ? 'Online' : 'Offline'} · ${ROTULO_SING}</small></div>`;
  }

  // ---------- MENSAGENS (balões) ----------
  function itensMenuMensagem(m, balao) {
    return [
      Editar() && Editar().itemMenu(m, PAPEL, () => editar(m, balao)),
      Excluir() && Excluir().itemMenuMensagem(m, PAPEL, () => apagarMensagem(m))
    ].filter(Boolean);
  }

  function criarLinha(m) {
    const meu = m.remetente_tipo === PAPEL;
    const linha = document.createElement('div');
    linha.className = 'chat-linha ' + (meu ? 'enviada' : 'recebida');
    linha.dataset.id = m.id;

    const balao = document.createElement('div');
    balao.className = 'chat-balao';

    if (m.apagada) {
      balao.classList.add('apagada');
      balao.textContent = '' + (Excluir() ? Excluir().TEXTO_APAGADA : 'Mensagem apagada');
    } else if (m.tipo !== 'texto' && Anexos()) {
      balao.classList.add('com-anexo');
      balao.appendChild(Anexos().criarCorpo(m, PAPEL));
    } else {
      const texto = document.createElement('span');
      texto.className = 'chat-texto';
      texto.textContent = m.conteudo;
      balao.appendChild(texto);
    }

    const meta = document.createElement('span');
    meta.className = 'chat-hora';
    if (m.editada_em && !m.apagada) {
      const e = document.createElement('em');
      e.className = 'chat-editada';
      e.textContent = 'editada';
      meta.appendChild(e);
    }
    meta.appendChild(document.createTextNode(hora(m.created_at)));
    balao.appendChild(meta);

    if (meu && !m.apagada && Menu()) Menu().vincular(balao, () => itensMenuMensagem(m, balao));

    linha.appendChild(balao);
    return linha;
  }

  function rolarFim() { const a = $('.chat-mensagens'); a.scrollTop = a.scrollHeight; }

  function adicionarMensagem(m) {
    if (mensagens.has(m.id)) return;
    mensagens.set(m.id, m);
    const area = $('.chat-mensagens');
    const vazio = area.querySelector('.chat-vazio');
    if (vazio) vazio.remove();
    area.appendChild(criarLinha(m));
    rolarFim();
  }

  // Troca o balão de uma mensagem já exibida (edição, exclusão, foto aberta...)
  function aplicarAtualizacao(m) {
    if (!mensagens.has(m.id)) return;
    mensagens.set(m.id, m);
    const antiga = $('.chat-mensagens').querySelector(`[data-id="${m.id}"]`);
    if (antiga) antiga.replaceWith(criarLinha(m));
  }

  function limparPainel() {
    ativo = null;
    mensagens = new Map();
    $('.chat-cabecalho').innerHTML = '<span class="chat-vazio-titulo">Selecione uma conversa</span>';
    $('.chat-mensagens').innerHTML = '';
    $('.chat-input').disabled = true;
    $('.chat-enviar').disabled = true;
    $('.chat-btn-anexo').disabled = true;
    $('.chat-btn-emoji').disabled = true;
  }

  // ---------- AÇÕES ----------
  async function carregarContatos() {
    try {
      contatos = await Dados.listarContatos(PAPEL, eu.id);
    } catch (e) { console.error('Chat: erro ao carregar contatos', e); return; }
    contatos.sort((a, b) =>
      (b.conversa?.ultima_mensagem_em || '').localeCompare(a.conversa?.ultima_mensagem_em || '') || a.nome.localeCompare(b.nome));

    if (ativo) {                                   // mantém a conversa aberta apontando para o contato novo
      const atual = contatos.find((c) => String(c.id) === String(ativo.id));
      if (atual && atual.conversa) ativo = atual;
      else if (ativo.conversa) limparPainel();     // a conversa foi apagada (pela outra pessoa)
      else if (atual) ativo = atual;
    }
    renderLista();
  }

  function recarregarContatosDepois() {            // junta várias atualizações seguidas em uma só
    clearTimeout(timerRecarga);
    timerRecarga = setTimeout(carregarContatos, 300);
  }

  async function abrirConversa(contato) {
    if (!contato) return;
    ativo = contato;
    if (!contato.conversa) contato.conversa = await Dados.garantirConversa(PAPEL, eu.id, contato.id);
    if (!contato.conversa) return;

    atualizarCabecalho();
    $('.chat-input').disabled = false;
    $('.chat-enviar').disabled = false;
    $('.chat-btn-anexo').disabled = !Anexos();
    $('.chat-btn-emoji').disabled = !Emojis();
    $('.chat-input').focus();

    const lista = await Dados.listarMensagens(contato.conversa.id);
    mensagens = new Map();
    const area = $('.chat-mensagens');
    area.innerHTML = '';
    if (!lista.length) area.innerHTML = '<p class="chat-vazio">Nenhuma mensagem ainda.</p>';
    lista.forEach(adicionarMensagem);
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
    ativo.conversa.ultima_mensagem = previaDe(msg);
    ativo.conversa.ultima_mensagem_em = msg.created_at;
    renderLista();
  }

  async function anexar() {
    if (!ativo || !ativo.conversa || !Anexos()) return;
    const escolha = await Anexos().escolher();
    if (!escolha) return;

    const area = $('.chat-mensagens');
    const temp = document.createElement('div');
    temp.className = 'chat-linha enviada enviando';
    temp.innerHTML = `<div class="chat-balao">Enviando ${esc(escolha.preparado.nome)}…</div>`;
    area.appendChild(temp);
    rolarFim();
    try {
      const msg = await Anexos().enviar(ativo.conversa.id, PAPEL, escolha);
      temp.remove();
      adicionarMensagem(msg);
      ativo.conversa.ultima_mensagem = previaDe(msg);
      ativo.conversa.ultima_mensagem_em = msg.created_at;
      renderLista();
    } catch (e) {
      temp.remove();
      Anexos().avisar(e.message || 'Não foi possível enviar.');
    }
  }

  async function editar(m, balao) {
    const nova = await Editar().iniciar(balao, m, PAPEL);
    if (nova) { aplicarAtualizacao(nova); recarregarContatosDepois(); }
  }

  async function apagarMensagem(m) {
    const nova = await Excluir().apagarMensagem(m, PAPEL);
    if (nova) { aplicarAtualizacao(nova); recarregarContatosDepois(); }
  }

  async function apagarConversa(contato) {
    const ok = await Excluir().apagarConversa(contato);
    if (!ok) return;
    if (ativo && String(ativo.id) === String(contato.id)) limparPainel();
    await carregarContatos();
  }

  // ---------- TEMPO REAL ----------
  async function receber(m) {
    let contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
    if (!contato) {                        // conversa nova iniciada pela outra pessoa
      await carregarContatos();
      contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
      if (!contato) return;
    }
    contato.conversa.ultima_mensagem = previaDe(m);
    contato.conversa.ultima_mensagem_em = m.created_at;
    if (ativo && ativo.conversa && ativo.conversa.id === m.conversa_id) {
      adicionarMensagem(m);
      if (m.remetente_tipo === OUTRO) Dados.marcarComoLidas(m.conversa_id, OUTRO);
    } else if (m.remetente_tipo === OUTRO) {
      contato.naoLidas += 1;
    }
    renderLista();
  }

  function mensagemAtualizada(m) {
    const minha = contatos.some((c) => c.conversa && c.conversa.id === m.conversa_id);
    if (!minha) return;
    if (ativo && ativo.conversa && ativo.conversa.id === m.conversa_id) aplicarAtualizacao(m);
    recarregarContatosDepois();
  }

  // ---------- INÍCIO ----------
  // Identidade = quem já entrou no sistema (RA + e-mail), guardado por auth/auth.js
  function usuarioDaSessao() {
    const sessao = typeof window.obterSessao === 'function' ? window.obterSessao() : null;
    if (!sessao || sessao.tipo !== PAPEL || !sessao.dados) return null;
    return { id: sessao.dados.id, nome: sessao.dados.nome, papel: PAPEL };
  }

  async function abrirChat() {
    montarLayout();
    await carregarContatos();
    Dados.assinar(PAPEL, eu.id, {
      onInsert: receber,
      onUpdate: mensagemAtualizada,
      onConversaApagada: carregarContatos
    });
    Dados.iniciarPresenca(PAPEL, eu.id, (conjunto) => {
      online = conjunto;
      if (raiz && raiz.isConnected) { renderLista(); atualizarCabecalho(); }
    });
  }

  // ---------- API PÚBLICA ----------
  window.iniciarChatCoordenador = async function (idContainer, usuario) {
    raiz = document.getElementById(idContainer || 'chat-coordenador-root');
    if (!raiz) { console.error('Chat: container não encontrado'); return; }
    if (!Dados) {
      raiz.innerHTML = '<p class="chat-vazio">Carregue js/data/chat.js antes deste arquivo.</p>';
      return;
    }
    eu = usuario || usuarioDaSessao();
    if (!eu) {
      raiz.innerHTML = '<p class="chat-vazio">Sessão não encontrada. Entre no sistema novamente.</p>';
      return;
    }
    ativo = null; contatos = []; mensagens = new Map();
    await abrirChat();
  };
})();

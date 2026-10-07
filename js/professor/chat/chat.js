/* =========================================================
   UniChamada - Chat do Professor (interface)
   Identidade: login do sistema (auth.js) | Dados: js/data/chat.js
   Conversa com professores E coordenadores (abas), com seletores pesquisáveis e lista separada de conversas.
   Recursos (pasta config/): editar_msg, excluir, emojis, fotos-e-arquivos, menu-contexto
   Uso: iniciarChatProfessor('chat-professor-root')
   ========================================================= */
(function () {
  'use strict';

  const PAPEL = 'professor';
  const ABAS = ['coordenador', 'professor'];                        // ordem das abas; a primeira abre por padrão
  const ROTULO = { professor: 'Professores', coordenador: 'Coordenadores' };
  const ROTULO_SING = { professor: 'Professor', coordenador: 'Coordenador' };
  const Dados = window.ChatDados;

  // Módulos de config/ (podem faltar: o chat de texto continua funcionando)
  const Menu = () => window.ChatMenu;
  const Editar = () => window.ChatEditar;
  const Excluir = () => window.ChatExcluir;
  const Emojis = () => window.ChatEmojis;
  const Anexos = () => window.ChatAnexos;

  let eu = null, raiz = null, contatos = [], ativo = null, abaAtiva = ABAS[0];
  let mensagens = new Map();        // id -> mensagem da conversa aberta
  let online = new Set();           // chaves "papel:id" de quem está online
  let timerRecarga = null;
  let seletorAberto = false;
  let selecionados = new Set();
  let ocultos = new Set();
  let primeiraCarga = true;
  let versaoAbertura = 0;
  const podeRemover = () => window.ChatProfessorConfig?.permitirRemoverDaLista !== false;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iniciais = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const $ = (sel) => raiz.querySelector(sel);
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const chave = (c) => c.aba + ':' + c.id;                        // identifica um contato (id sozinho pode repetir entre tabelas)
  const estaOnline = (c) => online.has(chave(c));

  // Texto curto para a lista de contatos
  function previaDe(m) {
    if (!m) return 'Nenhuma mensagem ainda';
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
        <div class="chat-topo"><h2 class="chat-titulo">Chat</h2><span class="chat-selo" title="Textos e arquivos são gravados criptografados no banco"></span></div>
        <div class="chat-tabs"></div>
        <div class="chat-seletor-opcoes" hidden>
          <input class="chat-busca" type="search" autocomplete="off" aria-label="Pesquisar contatos">
          <ul class="chat-lista-opcoes"></ul>
        </div>
        <p class="chat-rotulo-conversas">Conversas</p>
        <ul class="chat-lista"></ul>
      </aside>
      <section class="chat-painel">
        <header class="chat-cabecalho"><span class="chat-vazio-titulo">Selecione uma conversa</span></header>
        <div class="chat-mensagens"></div>
        <div class="chat-entrada">
          <button class="chat-icone-btn chat-btn-anexo" type="button" title="Enviar foto ou arquivo" disabled>📎</button>
          <button class="chat-icone-btn chat-btn-emoji" type="button" title="Emojis" disabled>😊</button>
          <input class="chat-input" type="text" maxlength="2000" placeholder="Digite sua mensagem..." autocomplete="off" disabled>
          <button class="chat-enviar" type="button" disabled>Enviar</button>
        </div>
      </section>`;
    if (!Dados.criptografiaAtiva()) $('.chat-selo').remove();            // só mostra o cadeado se estiver mesmo cifrando
    $('.chat-busca').placeholder = `Pesquisar ${ROTULO[abaAtiva].toLowerCase()}...`;
    $('.chat-busca').addEventListener('input', renderLista);
    instalarEstilos();
    raiz.onclick = (e) => {
      if (!e.target.closest('.chat-tabs, .chat-seletor-opcoes') && seletorAberto) {
        seletorAberto = false;
        renderAbas();
      }
    };
    raiz.onkeydown = (e) => {
      if (e.key === 'Escape') { seletorAberto = false; renderAbas(); }
    };

    $('.chat-enviar').addEventListener('click', enviar);$('.chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
    $('.chat-btn-anexo').addEventListener('click', anexar);$('.chat-btn-emoji').addEventListener('click', () => {
      if (Emojis()) Emojis().abrir($('.chat-btn-emoji'), (emoji) => Emojis().inserirNoCampo($('.chat-input'), emoji));
    });
  }

  function instalarEstilos() {
    if (document.getElementById('chat-professor-seletores-estilo')) return;
    const estilo = document.createElement('style');
    estilo.id = 'chat-professor-seletores-estilo';
    estilo.textContent = `
      .chat-professor { --chat-fundo: #fff; --chat-texto: #25334b;
        --chat-borda: #dce1e7; --chat-selecao: #e8f1fa; }
      .chat-professor [hidden] { display:none !important; }
      .chat-professor .chat-seletor-opcoes { padding:8px; margin-top:8px;
        border:1px solid var(--chat-borda); border-radius:8px;
        background:var(--chat-fundo); }
      .chat-professor .chat-busca { width:100%; box-sizing:border-box; }
      .chat-professor .chat-lista-opcoes { list-style:none; padding:0;
        margin:0; max-height:240px; overflow-y:auto; }
      .chat-professor .chat-opcao, .chat-professor .chat-abrir-contato {
        display:flex; align-items:center; gap:10px; width:100%; padding:10px;
        border:0; background:transparent; color:inherit; font:inherit;
        cursor:pointer; text-align:left; min-width:0; }
      .chat-professor .chat-opcao:hover,
      .chat-professor .chat-opcao.selecionado { background:var(--chat-selecao); }
      .chat-professor .chat-opcao-nome { flex:1; overflow-wrap:anywhere; }
      .chat-professor .chat-rotulo-conversas { margin:16px 0 8px; font-size:12px; }
      .chat-professor .chat-contato { display:flex; align-items:center; }
      .chat-professor .chat-abrir-contato { flex:1; }
      .chat-professor .chat-contato-info { flex:1; min-width:0; }
      .chat-professor .chat-contato-info strong,
      .chat-professor .chat-contato-info small { display:block; overflow-wrap:anywhere; }
      .chat-professor .chat-acoes { position:relative; flex-shrink:0; }
      .chat-professor .chat-mais { padding:6px 9px; cursor:pointer;
        border:1px solid var(--chat-borda); border-radius:5px;
        background:var(--chat-fundo); color:var(--chat-texto); }
      .chat-professor .chat-menu-local { position:absolute; right:0; top:100%;
        z-index:5; min-width:155px; padding:4px; border-radius:6px;
        background:var(--chat-fundo); border:1px solid var(--chat-borda); }
      .chat-professor .chat-remover { width:100%; padding:9px; cursor:pointer;
        border:0; background:transparent; color:var(--chat-texto); font:inherit; }
      .chat-professor button:focus-visible { outline:2px solid var(--chat-texto); outline-offset:2px; }
    `;
    document.head.appendChild(estilo);
  }

  function trocarAba(aba) {
    if (!ABAS.includes(aba)) return;
    seletorAberto = abaAtiva === aba ? !seletorAberto : true;
    abaAtiva = aba;
    $('.chat-busca').value = '';$('.chat-busca').placeholder = `Pesquisar ${ROTULO[aba].toLowerCase()}...`;
    renderLista();
    if (seletorAberto) $('.chat-busca').focus();
  }

  function renderAbas() {
    const caixa = $('.chat-tabs');
    caixa.innerHTML = ABAS.map((a) => {
      const n = contatos.filter((c) => c.aba === a).reduce((soma, c) => soma + (c.naoLidas || 0), 0);
      return `<button class="chat-tab ${a === abaAtiva ? 'ativo' : ''}" type="button" data-aba="${a}"
        aria-expanded="${a === abaAtiva && seletorAberto}">${ROTULO[a]} ⌄
        ${n ? `<span class="chat-tab-badge">${n}</span>` : ''}</button>`;
    }).join('');
    caixa.querySelectorAll('.chat-tab').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); trocarAba(b.dataset.aba); }));
    $('.chat-seletor-opcoes').hidden = !seletorAberto;
  }

  function avatarHtml(c) {
    return `<div class="chat-avatar-wrap"><div class="chat-avatar">${esc(iniciais(c.nome))}</div>` +
           `<span class="chat-ponto ${estaOnline(c) ? 'online' : ''}"></span></div>`;
  }

  function renderLista() {
    renderAbas();
    const termo = semAcento($('.chat-busca').value.trim());
    const lista = contatos.filter((c) => c.aba === abaAtiva && semAcento(c.nome).includes(termo))
      .sort((a,b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const opcoes = $('.chat-lista-opcoes');
    opcoes.innerHTML = lista.length ? lista.map((c) => `<li>
      <button class="chat-opcao ${selecionados.has(chave(c)) ? 'selecionado' : ''}" type="button"
        data-chave="${esc(chave(c))}" aria-label="Selecionar ${esc(c.nome)}">
        ${avatarHtml(c)}<span class="chat-opcao-nome">${esc(c.nome)}</span>
        ${selecionados.has(chave(c)) ? '<span aria-hidden="true">✓</span>' : ''}</button></li>`).join('')
      : '<li class="chat-sem-contatos">Nenhum contato encontrado</li>';
    opcoes.querySelectorAll('.chat-opcao').forEach((b) => b.addEventListener('click', () => {
      const c = contatos.find((c) => chave(c) === b.dataset.chave);
      if (!c) return;
      selecionados.add(chave(c)); ocultos.delete(chave(c)); seletorAberto = false;
      if (c.conversa && typeof Dados.atualizarVisibilidadeConversa === 'function') {
        Dados.atualizarVisibilidadeConversa(c.conversa.id, eu, true).catch(() => {});
      }
      renderLista(); abrirConversa(c).catch(mostrarErro);
    }));
    const ul = $('.chat-lista');
    const conversas = contatos.filter((c) => selecionados.has(chave(c)) && !ocultos.has(chave(c)));
    const aviso = Dados.avisoBanco ? Dados.avisoBanco() : '';
    ul.innerHTML = (aviso ? `<li class="chat-aviso">${esc(aviso)}</li>` : '') +
      (conversas.length ? conversas.map((c) => `
        <li class="chat-contato ${ativo && chave(ativo) === chave(c) ? 'ativo' : ''}" data-chave="${esc(chave(c))}">
          <button class="chat-abrir-contato" type="button" aria-label="Conversar com ${esc(c.nome)}">
            ${avatarHtml(c)}<span class="chat-contato-info"><strong>${esc(c.nome)}</strong>
              <small>${esc(c.conversa?.ultima_mensagem || 'Nenhuma mensagem ainda')}</small></span>
            ${c.naoLidas ? `<span class="chat-badge">${c.naoLidas}</span>` : ''}</button>
          ${podeRemover() ? `<div class="chat-acoes">
            <button class="chat-mais" type="button" aria-label="Opções de ${esc(c.nome)}" aria-expanded="false">⋯</button>
            <div class="chat-menu-local" hidden><button class="chat-remover" type="button">Remover da lista</button></div>
          </div>` : ''}</li>`).join('')
        : '<li class="chat-sem-contatos">Nenhuma conversa selecionada</li>');
    ul.querySelectorAll('.chat-contato').forEach((li) => {
      const c = contatos.find((c) => chave(c) === li.dataset.chave);
      if (!c) return;
      li.querySelector('.chat-abrir-contato').addEventListener('click', () => {
        if (Menu() && Menu().recemAberto()) return;
        abrirConversa(c).catch(mostrarErro);
      });
      li.querySelector('.chat-mais')?.addEventListener('click', () => {
        const menu = li.querySelector('.chat-menu-local');
        const abrir = menu.hidden;
        ul.querySelectorAll('.chat-menu-local').forEach((m) => m.hidden = true);
        ul.querySelectorAll('.chat-mais').forEach((b) => b.setAttribute('aria-expanded', 'false'));
        menu.hidden = !abrir;
        li.querySelector('.chat-mais').setAttribute('aria-expanded', String(abrir));
      });
      li.querySelector('.chat-remover')?.addEventListener('click', () => removerDaLista(c));
      if (Menu() && Excluir()) Menu().vincular(li, () => [Excluir().itemMenuConversa(c, () => apagarConversa(c))]);
    });
  }

  async function removerDaLista(c) {
    if (!c) return;
    selecionados.delete(chave(c)); ocultos.add(chave(c));
    if (ativo && chave(ativo) === chave(c)) limparPainel();
    renderLista();

    try {
      if (c.conversa && typeof Dados.atualizarVisibilidadeConversa === 'function') {
        await Dados.atualizarVisibilidadeConversa(c.conversa.id, eu, false);
      }
    } catch (err) {
      console.warn('Aviso: Estado de ocultação mantido apenas localmente por enquanto.', err);
    }
  }

  function mostrarErro(e) {
    console.error('Chat: erro ao abrir conversa', e);
    $('.chat-mensagens').innerHTML = '<p class="chat-aviso">Não foi possível carregar a conversa. Selecione o contato para tentar novamente.</p>';
  }

  function atualizarCabecalho() {
    if (!ativo) return;
    const on = estaOnline(ativo);
    $('.chat-cabecalho').innerHTML = `
      ${avatarHtml(ativo)}
      <div><strong>${esc(ativo.nome)}</strong>
      <small class="${on ? 'chat-status-online' : ''}">${on ? 'Online' : 'Offline'} · ${ROTULO_SING[ativo.aba]}</small></div>`;
  }

  // ---------- MENSAGENS (balões) ----------
  function itensMenuMensagem(m, balao) {
    return [
      Editar() && Editar().itemMenu(m, eu, () => editar(m, balao)),
      Excluir() && Excluir().itemMenuMensagem(m, eu, () => apagarMensagem(m))
    ].filter(Boolean);
  }

  function criarLinha(m) {
    const meu = Dados.ehMinha(m, eu);
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
      balao.appendChild(Anexos().criarCorpo(m, eu));
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
    versaoAbertura += 1;
    ativo = null;
    mensagens = new Map();
    $('.chat-cabecalho').innerHTML = '<span class="chat-vazio-titulo">Selecione uma conversa</span>';
    $('.chat-mensagens').innerHTML = '';$('.chat-input').disabled = true;
    $('.chat-enviar').disabled = true;
    $('.chat-btn-anexo').disabled = true;
    $('.chat-btn-emoji').disabled = true;
  }

  // ---------- AÇÕES ----------
  async function carregarContatos() {
    try {
      contatos = await Dados.listarContatos(eu);
    } catch (e) { console.error('Chat: erro ao carregar contatos', e); return; }
    contatos.sort((a, b) =>
      (b.conversa?.ultima_mensagem_em || '').localeCompare(a.conversa?.ultima_mensagem_em || '') || a.nome.localeCompare(b.nome));

    if (primeiraCarga) {
      contatos.filter((c) => c.conversa && c.conversa.visivel !== false).forEach((c) => selecionados.add(chave(c)));
      contatos.filter((c) => c.conversa && c.conversa.oculto === true).forEach((c) => ocultos.add(chave(c)));
      primeiraCarga = false;
    }
    if (ativo) {                                        // mantém a conversa aberta apontando para o contato novo
      const atual = contatos.find((c) => chave(c) === chave(ativo));
      if (atual && atual.conversa) ativo = atual;
      else if (ativo.conversa) limparPainel();      // a conversa foi apagada (pela outra pessoa)
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
    limparPainel();
    const versao = versaoAbertura;
    ativo = contato;
    selecionados.add(chave(contato)); ocultos.delete(chave(contato));

    if (contato.conversa && typeof Dados.atualizarVisibilidadeConversa === 'function') {
      Dados.atualizarVisibilidadeConversa(contato.conversa.id, eu, true).catch(() => {});
    }

    atualizarCabecalho(); renderLista();
    $('.chat-mensagens').innerHTML = '<p class="chat-vazio">Carregando...</p>';
    try {
      if (!contato.conversa) contato.conversa = await Dados.garantirConversa(eu, contato);
      if (versao !== versaoAbertura) return;
      if (!contato.conversa) throw new Error('Conversa não disponível');
      const lista = await Dados.listarMensagens(contato.conversa.id);
      if (versao !== versaoAbertura) return;
      mensagens = new Map();
      $('.chat-mensagens').innerHTML = lista.length ? '' : '<p class="chat-vazio">Nenhuma mensagem ainda. Diga olá!</p>';
      lista.forEach(adicionarMensagem); rolarFim();
      $('.chat-input').disabled = false; $('.chat-enviar').disabled = false;
      $('.chat-btn-anexo').disabled = !Anexos(); $('.chat-btn-emoji').disabled = !Emojis();$('.chat-input').focus();
      await Dados.marcarComoLidas(contato.conversa.id, eu);
      if (versao !== versaoAbertura) return;
      contato.naoLidas = 0; renderLista();
    } catch (e) { if (versao === versaoAbertura) mostrarErro(e); }
  }

  async function enviar() {
    const input = $('.chat-input');
    const texto = input.value.trim();
    if (!texto || !ativo || !ativo.conversa) return;
    input.value = '';
    const msg = await Dados.enviarMensagem(ativo.conversa.id, eu, texto);
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
      const msg = await Anexos().enviar(ativo.conversa.id, eu, escolha);
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
    const nova = await Editar().iniciar(balao, m, eu);
    if (nova) { aplicarAtualizacao(nova); recarregarContatosDepois(); }
  }

  async function apagarMensagem(m) {
    const nova = await Excluir().apagarMensagem(m, eu);
    if (nova) { aplicarAtualizacao(nova); recarregarContatosDepois(); }
  }

  async function apagarConversa(contato) {
    const ok = await Excluir().apagarConversa(contato);
    if (!ok) return;
    selecionados.delete(chave(contato)); ocultos.add(chave(contato));
    if (ativo && chave(ativo) === chave(contato)) limparPainel();
    await carregarContatos();
  }

  // ---------- TEMPO REAL ----------
  async function receber(m) {
    let contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
    if (!contato) {                        // conversa nova iniciada pela outra pessoa
      await carregarContatos();
      contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
      if (!contato) return;                // não é uma conversa minha
    }
    
    // Se receber mensagem nova de alguém oculto, traz de volta pra lista
    ocultos.delete(chave(contato));
    selecionados.add(chave(contato));

    contato.conversa.ultima_mensagem = previaDe(m);
    contato.conversa.ultima_mensagem_em = m.created_at;
    const minha = Dados.ehMinha(m, eu);
    if (ativo && ativo.conversa && ativo.conversa.id === m.conversa_id) {
      adicionarMensagem(m);
      if (!minha) Dados.marcarComoLidas(m.conversa_id, eu);
    } else if (!minha) {
      contato.naoLidas = (contato.naoLidas || 0) + 1;
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
    Dados.assinar(eu, {
      onInsert: receber,
      onUpdate: mensagemAtualizada,
      onConversaApagada: carregarContatos
    });
    Dados.iniciarPresenca(eu, (conjunto) => {
      online = conjunto;
      if (raiz && raiz.isConnected) { renderLista(); atualizarCabecalho(); }
    });
  }

  // ---------- API PÚBLICA ----------
  // API: altera somente a lista local; não apaga mensagens no banco.
  window.ChatProfessor = {
    removerDaLista(id, aba = 'coordenador') {
      if (!raiz || !$('.chat-lista')) return;
      removerDaLista(contatos.find((c) => String(c.id) === String(id) && c.aba === aba));
    },
    async selecionarContato(id, aba = 'coordenador') {
      if (!raiz || !$('.chat-lista')) return;
      const c = contatos.find((c) => String(c.id) === String(id) && c.aba === aba);
      if (!c) return;
      seletorAberto = false;
      await abrirConversa(c);
    },
    listarSelecionados() {
      return contatos.filter((c) => selecionados.has(chave(c)) && !ocultos.has(chave(c)))
        .map((c) => ({ id:c.id, nome:c.nome, aba:c.aba }));
    }
  };

  window.iniciarChatProfessor = async function (idContainer, usuario) {
    raiz = document.getElementById(idContainer || 'chat-professor-root');
    if (!raiz) { console.error('Chat: container não encontrado'); return; }
    if (!Dados) {
      raiz.innerHTML = '<p class="chat-vazio">Carregue js/data/chat.js antes deste arquivo.</p>';
      return;
    }
    eu = usuario ? { ...usuario, papel: PAPEL } : usuarioDaSessao();
    if (!eu) {
      raiz.innerHTML = '<p class="chat-vazio">Sessão não encontrada. Entre no sistema novamente.</p>';
      return;
    }
    clearTimeout(timerRecarga);
    ativo = null; contatos = []; mensagens = new Map(); abaAtiva = ABAS[0];
    selecionados = new Set(); ocultos = new Set(); primeiraCarga = true;
    seletorAberto = false; versaoAbertura += 1;
    await abrirChat();
  };
})();

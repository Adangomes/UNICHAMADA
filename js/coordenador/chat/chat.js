/* =========================================================
   UniChamada - Chat do Coordenador (interface)
   Identidade: login do sistema (auth.js) | Dados: js/data/chat.js
   Conversa com professores E coordenadores (abas), com busca.
   Recursos (pasta config/): editar_msg, excluir, emojis, fotos-e-arquivos, menu-contexto
   Uso: iniciarChatCoordenador('chat-coordenador-root')
   ========================================================= */
(function () {
  'use strict';

  const PAPEL = 'coordenador';
  const ABAS = ['professor', 'coordenador'];                     // ordem das abas; a primeira abre por padrão
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
  let online = new Set();            // chaves "papel:id" de quem está online
  let timerRecarga = null;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iniciais = (n) => String(n || '?').split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const $ = (sel) => raiz.querySelector(sel);
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const chave = (c) => c.aba + ':' + c.id;                           // identifica um contato (id sozinho pode repetir entre tabelas)
  const estaOnline = (c) => online.has(chave(c));

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
        <div class="chat-topo"><h2 class="chat-titulo">Chat</h2><span class="chat-selo" title="Textos e arquivos são gravados criptografados no banco"></span></div>
        <div class="chat-tabs"></div>
        <input class="chat-busca" type="search" autocomplete="off">
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
    $('.chat-enviar').addEventListener('click', enviar);$('.chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') enviar(); });
    $('.chat-btn-anexo').addEventListener('click', anexar);$('.chat-btn-emoji').addEventListener('click', () => {
      if (Emojis()) Emojis().abrir($('.chat-btn-emoji'), (emoji) => Emojis().inserirNoCampo($('.chat-input'), emoji));
    });
  }

  function trocarAba(aba) {
    abaAtiva = aba;
    $('.chat-busca').placeholder = `Pesquisar ${ROTULO[aba].toLowerCase()}...`;
    renderLista();
  }

  function renderAbas() {
    const caixa = $('.chat-tabs');
    caixa.innerHTML = ABAS.map((a) => {
      // Filtra apenas quem tem conversa ativa ou mensagens para mostrar nas abas principais, ou exibe o total dependendo da regra
      const n = contatos.filter((c) => c.aba === a && c.conversa).reduce((soma, c) => soma + c.naoLidas, 0);
      return `<button class="chat-tab ${a === abaAtiva ? 'ativo' : ''}" type="button" data-aba="${a}">` +
             `${ROTULO[a]}${n ? `<span class="chat-tab-badge">${n}</span>` : ''}</button>`;
    }).join('');
    caixa.querySelectorAll('.chat-tab').forEach((b) => b.addEventListener('click', () => trocarAba(b.dataset.aba)));
  }

  function avatarHtml(c) {
    return `<div class="chat-avatar-wrap"><div class="chat-avatar">${esc(iniciais(c.nome))}</div>` +
           `<span class="chat-ponto ${estaOnline(c) ? 'online' : ''}"></span></div>`;
  }

  function renderLista() {
    renderAbas();
    const termo = semAcento($('.chat-busca').value.trim());
    const ul = $('.chat-lista');
    const aviso = Dados.avisoBanco ? Dados.avisoBanco() : '';
    const avisoHtml = aviso ? `<li class="chat-aviso">${esc(aviso)}</li>` : '';
    
    // Mostra na lista lateral apenas os contatos que possuem conversa iniciada, OU todos se houver termo de busca ativo
    const daAba = contatos.filter((c) => c.aba === abaAtiva && (c.conversa || termo));
    let lista = daAba;
    
    if (termo) {
      lista = contatos.filter((c) => c.aba === abaAtiva && semAcento(c.nome).includes(termo));
      const comeca = (c) => semAcento(c.nome).split(/\s+/).some((p) => p.startsWith(termo)) ? 0 : 1;
      lista = lista.map((c, i) => ({ c, i })).sort((x, y) => comeca(x.c) - comeca(y.c) || x.i - y.i).map((x) => x.c);
    }

    if (!lista.length) {
      const outra = ABAS.find((a) => a !== abaAtiva);
      const naOutra = termo ? contatos.filter((c) => c.aba === outra && semAcento(c.nome).includes(termo)).length : 0;
      ul.innerHTML = avisoHtml + `<li class="chat-sem-contatos">Nenhum ${ROTULO_SING[abaAtiva].toLowerCase()} encontrado` +
        (naOutra ? `<br><button class="chat-ver-outra" type="button">Ver em ${ROTULO[outra]} (${naOutra})</button>` : '') + '</li>';
      const b = ul.querySelector('.chat-ver-outra');
      if (b) b.addEventListener('click', () => trocarAba(outra));
      return;
    }

    ul.innerHTML = avisoHtml + lista.map((c) => `
      <li class="chat-contato ${ativo && chave(ativo) === chave(c) ? 'ativo' : ''}" data-chave="${esc(chave(c))}">
        ${avatarHtml(c)}
        <div class="chat-contato-info">
          <strong>${esc(c.nome)}</strong>
          <small>${esc(c.conversa?.ultima_mensagem || 'Clique para iniciar conversa')}</small>
        </div>
        ${c.naoLidas ? `<span class="chat-badge">${c.naoLidas}</span>` : ''}
      </li>`).join('');

    ul.querySelectorAll('.chat-contato').forEach((li) => {
      const contato = contatos.find((c) => chave(c) === li.dataset.chave);
      li.addEventListener('click', () => {
        if (Menu() && Menu().recemAberto()) return;
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
      <small class="${on ? 'chat-status-online' : ''}">${on ? 'Online' : 'Offline'}</small></div>`;
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

    if (ativo) {
      const atual = contatos.find((c) => chave(c) === chave(ativo));
      if (atual && atual.conversa) ativo = atual;
      else if (ativo.conversa) limparPainel();
      else if (atual) ativo = atual;
    }
    renderLista();
  }

  function recarregarContatosDepois() {
    clearTimeout(timerRecarga);
    timerRecarga = setTimeout(carregarContatos, 300);
  }

  async function abrirConversa(contato) {
    if (!contato) return;
    ativo = contato;
    if (!contato.conversa) contato.conversa = await Dados.garantirConversa(eu, contato);
    if (!contato.conversa) return;

    atualizarCabecalho();
    $('.chat-input').disabled = false;
    $('.chat-enviar').disabled = false;
    $('.chat-btn-anexo').disabled = !Anexos();
    $('.chat-btn-emoji').disabled = !Emojis();$('.chat-input').focus();

    const lista = await Dados.listarMensagens(contato.conversa.id);
    mensagens = new Map();
    const area = $('.chat-mensagens');
    area.innerHTML = '';
    if (!lista.length) area.innerHTML = '<p class="chat-vazio">Nenhuma mensagem ainda. Diga olá!</p>';
    lista.forEach(adicionarMensagem);
    rolarFim();
    await Dados.marcarComoLidas(contato.conversa.id, eu);
    contato.naoLidas = 0;
    renderLista();
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
    if (ativo && chave(ativo) === chave(contato)) limparPainel();
    await carregarContatos();
  }

  // ---------- TEMPO REAL ----------
  async function receber(m) {
    let contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
    if (!contato) {
      await carregarContatos();
      contato = contatos.find((c) => c.conversa && c.conversa.id === m.conversa_id);
      if (!contato) return;
    }
    contato.conversa.ultima_mensagem = previaDe(m);
    contato.conversa.ultima_mensagem_em = m.created_at;
    const minha = Dados.ehMinha(m, eu);
    if (ativo && ativo.conversa && ativo.conversa.id === m.conversa_id) {
      adicionarMensagem(m);
      if (!minha) Dados.marcarComoLidas(m.conversa_id, eu);
    } else if (!minha) {
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

  window.iniciarChatCoordenador = async function (idContainer, usuario) {
    raiz = document.getElementById(idContainer || 'chat-coordenador-root');
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
    ativo = null; contatos = []; mensagens = new Map(); abaAtiva = ABAS[0];
    await abrirChat();
  };
})();

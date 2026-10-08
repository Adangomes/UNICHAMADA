/**
 * @fileoverview chamy.js — Chamy, o assistente de dados do UniChamada (painel do professor)
 *
 * O professor pergunta em linguagem natural; o front-end envia a pergunta para um
 * Webhook do n8n; o n8n (agente de IA + Supabase) consulta o banco e devolve a resposta.
 *
 * Fluxo:  [botão do robô ao lado do sino] -> painel de conversa -> POST no webhook do n8n
 *         -> n8n responde JSON { "resposta": "texto" } -> aparece no painel.
 *
 * Como ligar no painel (já está no seu professor.js):
 *     if (typeof inicializarChamyProfessor === 'function') inicializarChamyProfessor(cabecalho, professorLogado);
 *
 * @module Chamy
 */

/* ==========================================================================
   CONFIGURAÇÃO — dados do seu n8n e ajustes do botão
   ========================================================================== */
const CHAMY_CONFIG = {
  // URL de PRODUÇÃO do nó Webhook do n8n (para outros computadores precisa ser um endereço público https)
  webhookUrl: 'http://localhost:5678/webhook/3fe52560-8e23-4407-8185-b40535e199ec',
  // Chave simples conferida pelo nó IF do n8n (precisa ser IDÊNTICA à que está lá).
  // Fica no código público do site: só barra abuso casual.
  token: 'chamy-7Hk29xQpLw83mZ4vTb',
  // Caminho do ícone do robô, relativo à raiz do site
  icone: 'js/professor/chamy/chamy.png',
  // Tempo máximo de espera pela resposta do n8n, em milissegundos (60000 = 60 s)
  timeoutMs: 60000,
  // Máximo de caracteres que o professor pode digitar numa pergunta
  maxPergunta: 500,
  // >>> AJUSTE AQUI <<<  Se o espaço vazio entre o robô e o sino passar deste valor (px),
  // o robô é empurrado para encostar no sino. Diminua para ser mais exigente (ex.: 12).
  folgaMaxima: 24
};

// Perguntas prontas que aparecem como botões quando o painel abre
const CHAMY_SUGESTOES = [
  'Quantos alunos tenho em cada turma?',          // sugestão 1
  'Qual a taxa de presença das minhas turmas?',   // sugestão 2
  'Quais alunos mais faltaram este mês?'          // sugestão 3
];

// Estado do Chamy enquanto a página está aberta
const estadoChamy = {
  aberto: false,      // o painel de conversa está aberto?
  enviando: false,    // já existe uma pergunta sendo respondida?
  professor: null,    // dados do professor logado
  sessaoId: '',       // id da conversa (o n8n usa para lembrar do contexto)
  observador: null    // vigia o cabeçalho para recolocar o robô se ele sumir
};

/* ==========================================================================
   UTILITÁRIOS
   ========================================================================== */

/** Cria um elemento HTML com atributos e filhos (texto ou outros elementos). */
function chamyEl(tag, attrs = {}, filhos = []) {
  const el = document.createElement(tag);                       // cria a tag pedida (div, button, img...)
  Object.entries(attrs).forEach(([k, v]) => {                   // passa por cada atributo recebido
    if (k === 'class') el.className = v;                        // "class" vira className
    else if (k.startsWith('on') && typeof v === 'function')     // atributos "onClick", "onInput"...
      el.addEventListener(k.slice(2).toLowerCase(), v);         // viram ouvintes de evento
    else el.setAttribute(k, v);                                 // o resto vira atributo normal (id, title...)
  });
  [].concat(filhos).forEach((f) => el.append(f));               // anexa os filhos (aceita um só ou uma lista)
  return el;                                                    // devolve o elemento pronto
}

/**
 * Converte o texto da resposta em nós seguros: quebras de linha, **negrito** e listas "- item".
 * Nunca usa innerHTML com texto vindo do servidor (evita injeção de HTML).
 */
function chamyFormatarResposta(texto) {
  const caixa = document.createDocumentFragment();                          // "caixa" temporária para os parágrafos
  String(texto || '').split('\n').forEach((linha) => {                      // trata cada linha da resposta
    const ehItem = /^\s*[-•*]\s+/.test(linha);                              // linha começa com "-", "•" ou "*"? é item de lista
    const limpa = linha.replace(/^\s*[-•*]\s+/, '');                        // tira o marcador da frente
    const p = chamyEl('p', { class: ehItem ? 'chamy-item' : '' });          // parágrafo (com bolinha se for item)
    limpa.split(/(\*\*[^*]+\*\*)/g).forEach((parte) => {                    // separa os trechos **em negrito**
      if (/^\*\*[^*]+\*\*$/.test(parte))                                    // é um trecho em negrito?
        p.append(chamyEl('strong', {}, [parte.slice(2, -2)]));              // tira os ** e usa <strong>
      else p.append(parte);                                                 // senão, texto comum
    });
    if (limpa.trim() || ehItem) caixa.append(p);                            // ignora linhas totalmente vazias
  });
  return caixa;                                                             // devolve os parágrafos prontos
}

/** Gera (ou recupera) o id da conversa, guardado só enquanto a aba do navegador estiver aberta. */
function chamyIdSessao() {
  const chave = 'chamy_sessao_id';                                          // nome em que o id fica guardado
  const novoId = () => (crypto.randomUUID                                   // cria um id novo:
    ? crypto.randomUUID()                                                   //   - UUID, se o navegador suportar
    : String(Date.now()) + Math.random().toString(16).slice(2));            //   - ou data + número aleatório
  try {
    let id = sessionStorage.getItem(chave);                                 // já existe um id guardado?
    if (!id) { id = novoId(); sessionStorage.setItem(chave, id); }          // se não, cria e guarda
    return id;                                                              // devolve o id
  } catch (e) {
    return novoId();                                                        // navegador bloqueou o storage: id só desta página
  }
}

/* ==========================================================================
   PAINEL DE CONVERSA
   ========================================================================== */

/** Adiciona um balão de mensagem na lista e rola até o final. */
function chamyAdicionarMensagem(lista, autor, conteudo, classeExtra = '') {
  const balao = chamyEl('div', { class: `chamy-msg chamy-msg-${autor} ${classeExtra}`.trim() }); // balão (chamy ou professor)
  if (typeof conteudo === 'string' && autor === 'chamy')                    // resposta do Chamy em texto:
    balao.append(chamyFormatarResposta(conteudo));                          //   formata (negrito, listas)
  else if (typeof conteudo === 'string') balao.textContent = conteudo;      // texto do professor: puro, sem HTML
  else balao.append(conteudo);                                              // já é um elemento (ex.: "digitando…")
  lista.append(balao);                                                      // coloca o balão na lista
  lista.scrollTop = lista.scrollHeight;                                     // rola para a última mensagem
  return balao;                                                             // devolve o balão (para poder removê-lo depois)
}

/** Envia a pergunta ao n8n e mostra a resposta. */
async function chamyEnviar(pergunta, lista, campo, botaoEnviar) {
  const texto = String(pergunta || '').trim().slice(0, CHAMY_CONFIG.maxPergunta); // limpa e limita o tamanho
  if (!texto || estadoChamy.enviando) return;                               // vazio ou já enviando: não faz nada

  if (CHAMY_CONFIG.webhookUrl.startsWith('COLE_AQUI')) {                    // URL ainda não configurada?
    chamyAdicionarMensagem(lista, 'chamy', 'Ainda não estou conectado ao n8n. Configure a URL do webhook em js/professor/chamy/chamy.js.');
    return;                                                                 // avisa e para
  }

  estadoChamy.enviando = true;                                              // marca que está enviando
  campo.value = '';                                                         // limpa a caixa de texto
  botaoEnviar.disabled = true;                                              // trava o botão de enviar
  chamyAdicionarMensagem(lista, 'professor', texto);                        // mostra a pergunta do professor
  const digitando = chamyAdicionarMensagem(lista, 'chamy',                  // mostra "···" enquanto espera
    chamyEl('span', { class: 'chamy-digitando' }, [chamyEl('i'), chamyEl('i'), chamyEl('i')]), 'chamy-msg-digitando');

  const controle = new AbortController();                                   // permite cancelar a requisição
  const temporizador = setTimeout(() => controle.abort(), CHAMY_CONFIG.timeoutMs); // cancela se passar do tempo

  try {
    const prof = estadoChamy.professor || {};                               // dados do professor logado
    const resposta = await fetch(CHAMY_CONFIG.webhookUrl, {                 // chama o webhook do n8n
      method: 'POST',                                                       // método POST
      headers: { 'Content-Type': 'application/json' },                      // corpo em JSON
      signal: controle.signal,                                              // liga o cancelamento por tempo
      body: JSON.stringify({                                                // corpo enviado ao n8n:
        token: CHAMY_CONFIG.token,                                          //   chave conferida pelo nó IF
        pergunta: texto,                                                    //   a pergunta
        professor_id: prof.id,                                              //   quem está perguntando (para filtrar os dados)
        professor_nome: prof.nome,                                          //   nome, para o Chamy cumprimentar
        sessao_id: estadoChamy.sessaoId                                     //   id da conversa (memória do agente)
      })
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);           // erro HTTP (401, 404, 500...) cai no catch
    const dados = await resposta.json();                                    // lê o JSON devolvido pelo n8n
    const textoResposta = dados.resposta || dados.output || dados.text || ''; // aceita vários nomes de campo
    digitando.remove();                                                     // tira o "digitando…"
    chamyAdicionarMensagem(lista, 'chamy', textoResposta || 'Não consegui montar uma resposta para essa pergunta.');
  } catch (erro) {
    digitando.remove();                                                     // tira o "digitando…"
    const msg = erro.name === 'AbortError'                                  // estourou o tempo?
      ? 'Demorei demais para responder. Tente de novo ou faça uma pergunta mais simples.'
      : 'Não consegui falar com o servidor agora. Verifique se o n8n está no ar e tente novamente.';
    chamyAdicionarMensagem(lista, 'chamy', msg, 'chamy-msg-erro');          // mostra o erro em vermelho
    console.error('[Chamy]', erro);                                         // detalhe técnico no Console (F12)
  } finally {
    clearTimeout(temporizador);                                             // cancela o cronômetro
    estadoChamy.enviando = false;                                           // libera para a próxima pergunta
    botaoEnviar.disabled = false;                                           // destrava o botão de enviar
    campo.focus();                                                          // volta o cursor para a caixa de texto
  }
}

/** Monta o painel de conversa e o coloca na página. */
function chamyMontarPainel() {
  document.getElementById('chamy-painel')?.remove();                        // remove um painel antigo, se houver

  const lista = chamyEl('div', { class: 'chamy-lista', 'aria-live': 'polite' }); // área onde ficam as mensagens
  const campo = chamyEl('textarea', {                                       // caixa de texto da pergunta
    class: 'chamy-campo', rows: '1', maxlength: String(CHAMY_CONFIG.maxPergunta),
    placeholder: 'Pergunte algo sobre suas turmas…'
  });
  const botaoEnviar = chamyEl('button', { class: 'chamy-enviar', type: 'button', title: 'Enviar' }, ['➤']); // botão ➤

  const enviar = () => chamyEnviar(campo.value, lista, campo, botaoEnviar); // atalho para enviar o que está escrito
  botaoEnviar.addEventListener('click', enviar);                            // clicar em ➤ envia
  campo.addEventListener('keydown', (e) => {                                // ao apertar uma tecla na caixa:
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } //   Enter envia (Shift+Enter quebra linha)
  });
  campo.addEventListener('input', () => {                                   // ao digitar:
    campo.style.height = 'auto';                                            //   zera a altura
    campo.style.height = Math.min(campo.scrollHeight, 110) + 'px';          //   cresce até no máximo 110 px
  });

  const nome = (estadoChamy.professor?.nome || '').split(' ')[0];           // primeiro nome do professor
  chamyAdicionarMensagem(lista, 'chamy',                                    // mensagem de boas-vindas
    `Olá${nome ? ', ' + nome : ''}! Eu sou o **Chamy**. Posso consultar os dados das suas turmas. O que você quer saber?`);

  const sugestoes = chamyEl('div', { class: 'chamy-sugestoes' },            // bloco com as perguntas prontas
    CHAMY_SUGESTOES.map((s) => chamyEl('button', {                          // um botão para cada sugestão
      class: 'chamy-chip', type: 'button',
      onClick: () => { sugestoes.remove(); chamyEnviar(s, lista, campo, botaoEnviar); } // clicou: some e envia
    }, [s])));
  lista.append(sugestoes);                                                  // coloca as sugestões na lista

  const painel = chamyEl('section', {                                       // a janelinha do Chamy
    id: 'chamy-painel', class: 'chamy-painel', role: 'dialog', 'aria-label': 'Chamy, assistente de dados'
  }, [
    chamyEl('header', { class: 'chamy-topo' }, [                            // topo do painel
      chamyEl('img', { src: CHAMY_CONFIG.icone, alt: '', class: 'chamy-topo-icone' }), // ícone do robô
      chamyEl('div', { class: 'chamy-topo-texto' }, [                       // título e subtítulo
        chamyEl('strong', {}, ['Chamy']),
        chamyEl('span', {}, ['Assistente de dados'])
      ]),
      chamyEl('button', { class: 'chamy-fechar', type: 'button', title: 'Fechar', onClick: chamyAlternar }, ['✕']) // fechar
    ]),
    lista,                                                                  // mensagens
    chamyEl('footer', { class: 'chamy-rodape' }, [campo, botaoEnviar]),     // caixa de texto + enviar
    chamyEl('p', { class: 'chamy-aviso' }, ['Respostas geradas por IA — confira dados importantes.']) // aviso
  ]);

  document.body.appendChild(painel);                                        // coloca o painel na página
  return painel;                                                            // devolve o painel
}

/** Abre ou fecha o painel de conversa (usado pelo botão do robô e pelo ✕). */
function chamyAlternar() {
  const painel = document.getElementById('chamy-painel') || chamyMontarPainel(); // pega o painel (ou cria na 1ª vez)
  estadoChamy.aberto = !estadoChamy.aberto;                                 // inverte aberto/fechado
  painel.classList.toggle('aberto', estadoChamy.aberto);                    // liga/desliga a classe que mostra o painel
  document.getElementById('chamy-botao')?.classList.toggle('ativo', estadoChamy.aberto); // destaca o botão do robô
  if (estadoChamy.aberto) painel.querySelector('.chamy-campo')?.focus();    // ao abrir, já deixa o cursor na caixa
}

/* ==========================================================================
   BOTÃO AO LADO DO SINO
   ========================================================================== */

/** Acha o botão "Sair" do cabeçalho (procura um botão/link com exatamente esse texto). */
function chamyAcharSair(cabecalho) {
  return [...cabecalho.querySelectorAll('button, a')].find((el) =>          // olha todos os botões e links
    /^\s*sair\s*$/i.test(el.textContent)                                    // texto é só "Sair"?
  ) || null;                                                                // não achou: devolve null
}

/**
 * Procura o sino de notificações dentro do cabeçalho.
 * Tenta: classes comuns -> emoji/título "notifica" -> o item que vem logo antes do "Sair".
 */
function chamyAcharSino(cabecalho) {
  const porSeletor = cabecalho.querySelector(                               // 1) procura por nomes de classe prováveis
    '.sino, .sino-notificacoes, .btn-sino, #btn-sino, .notificacoes-sino, .notif-sino, [data-sino], [data-notificacoes], [class*="sino"], [class*="notif"]'
  );
  if (porSeletor) return porSeletor;                                        // achou: usa

  const porTexto = [...cabecalho.querySelectorAll('button, a, div, span')].find((el) => // 2) procura pelo emoji 🔔
    el.textContent.includes('🔔') || /notifica/i.test(el.getAttribute('title') || el.getAttribute('aria-label') || '')
  );
  if (porTexto) return porTexto;                                            // achou: usa

  const sair = chamyAcharSair(cabecalho);                                   // 3) último recurso: o vizinho antes do "Sair"
  const anterior = sair?.previousElementSibling;                            // elemento imediatamente antes do "Sair"
  return anterior && anterior.id !== 'chamy-botao' ? anterior : null;       // (nunca o próprio robô)
}

/**
 * Ponto de entrada: cria o botão do robô, coloca ao lado do sino e prepara o painel.
 * @param {HTMLElement} cabecalho - Cabeçalho do painel do professor.
 * @param {Object} professor - Professor logado.
 */
function inicializarChamy(cabecalho, professor) {
  estadoChamy.professor = professor || {};                                  // guarda quem é o professor
  estadoChamy.sessaoId = chamyIdSessao();                                   // id da conversa
  estadoChamy.aberto = false;                                               // começa fechado
  document.getElementById('chamy-botao')?.remove();                         // limpa botão antigo (se o painel foi remontado)
  document.getElementById('chamy-painel')?.remove();                        // limpa painel antigo

  const botao = chamyEl('button', {                                         // o botão redondo do robô
    id: 'chamy-botao', class: 'chamy-botao', type: 'button',
    title: 'Pergunte ao Chamy', 'aria-label': 'Abrir o Chamy', onClick: chamyAlternar
  }, [chamyEl('img', { src: CHAMY_CONFIG.icone, alt: 'Chamy' })]);          // com a imagem dentro

  chamyPosicionar(botao, cabecalho);                                        // coloca o botão no cabeçalho

  estadoChamy.observador?.disconnect();                                     // para um vigia antigo, se existir
  let agendado = false;                                                     // evita recolocar várias vezes seguidas
  estadoChamy.observador = new MutationObserver(() => {                     // vigia mudanças no cabeçalho
    if (botao.isConnected || agendado) return;                              // o botão continua lá? então nada a fazer
    agendado = true;                                                        // marca que já vai recolocar
    setTimeout(() => {                                                      // espera 50 ms (deixa o outro módulo terminar)
      agendado = false;
      if (!botao.isConnected) chamyPosicionar(botao, cabecalho);            // sumiu mesmo: coloca de volta
    }, 50);
  });
  estadoChamy.observador.observe(cabecalho, { childList: true, subtree: true }); // liga o vigia
}

/**
 * Coloca o botão na ordem [Chamy] [sino] [Sair] e o aproxima do sino.
 * Se algo der errado ou o botão ficar invisível, usa o plano B (fim do cabeçalho).
 */
function chamyPosicionar(botao, cabecalho) {
  try {
    const sair = chamyAcharSair(cabecalho);                                 // acha o botão "Sair"
    let sino = chamyAcharSino(cabecalho);                                   // acha o sino

    if (sino && sair) {                                                     // se achou os dois:
      while (sino.parentNode && sino.parentNode !== sair.parentNode && sino.parentNode !== cabecalho) {
        sino = sino.parentNode;                                             //   sobe até o mesmo nível do "Sair"
      }                                                                     //   (assim o robô não entra DENTRO do sino)
    }

    const referencia = sino || sair;                                        // o robô entra antes do sino (ou do "Sair")
    if (referencia && referencia.parentNode && !referencia.contains(botao)) {
      referencia.parentNode.insertBefore(botao, referencia);                // insere o robô antes da referência
    } else {
      cabecalho.appendChild(botao);                                         // plano B: fim do cabeçalho
    }

    // ---- Aproxima o robô do sino quando sobra espaço vazio entre os dois ----
    if (referencia && referencia !== botao) {
      const folga = referencia.getBoundingClientRect().left                 // posição esquerda do sino
                  - botao.getBoundingClientRect().right;                    // menos a direita do robô = espaço vazio
      if (folga > CHAMY_CONFIG.folgaMaxima) {                               // >>> AJUSTE AQUI (folgaMaxima no topo) <<<
        botao.style.marginLeft = 'auto';                                    // o robô passa a "empurrar" tudo para a direita
        const mlSino = parseFloat(getComputedStyle(referencia).marginLeft); // margem esquerda atual do sino
        if (mlSino > CHAMY_CONFIG.folgaMaxima) referencia.style.marginLeft = '0'; // o sino abre mão do empurrão
      }
    }

    if (botao.offsetWidth === 0 && botao.offsetHeight === 0) cabecalho.appendChild(botao); // invisível? vai pro fim
  } catch (erro) {
    console.error('[Chamy] erro ao posicionar o botão:', erro);             // mostra o erro no Console
    if (!botao.isConnected) cabecalho.appendChild(botao);                   // garante que o botão exista na tela
  }
}

window.inicializarChamy = inicializarChamy;                                 // deixa a função acessível pelo nome original
window.inicializarChamyProfessor = inicializarChamy;                        // e pelo nome usado no professor.js

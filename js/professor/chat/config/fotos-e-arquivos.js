/* =========================================================
   UniChamada - Chat: fotos e arquivos
   - Botão 📎: escolhe foto/arquivo do computador ou do celular.
   - Fotos são reduzidas antes de subir (economiza espaço no Storage).
   - "Visualização única": o destinatário abre UMA vez; a foto é apagada do servidor na hora.
   - Arquivos ficam no bucket privado "chat-arquivos" do Supabase Storage.
   - Apagar a mensagem ou a conversa também apaga o arquivo do Storage.
   Estilo: css/chat/config/fotos-e-arquivos.css
   ========================================================= */
(function () {
  'use strict';
  if (window.ChatAnexos) return;   // a pasta irmã tem uma cópia idêntica deste arquivo

  // >>> EDITE AQUI <<<
  const CFG = {
    TAMANHO_MAX_MB: 10,                       // limite por arquivo (o bucket também tem limite, ver SQL)
    IMAGEM_LADO_MAX: 1280,                    // px do maior lado depois de reduzir
    IMAGEM_QUALIDADE: 0.82,                   // 0 a 1 (JPEG)
    EXTENSOES_BLOQUEADAS: ['exe', 'bat', 'cmd', 'com', 'msi', 'scr', 'js', 'vbs', 'ps1', 'sh', 'apk', 'jar']
  };
  // >>> FIM DA ÁREA DE EDIÇÃO <<<

  const IMG_EXIBIVEL = /^image\/(jpeg|png|webp|gif)$/;
  const Dados = () => window.ChatDados;

  function criar(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto != null) e.textContent = texto;
    return e;
  }

  function formatarTamanho(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function extensao(nome) {
    const i = String(nome).lastIndexOf('.');
    return i < 0 ? '' : String(nome).slice(i + 1).toLowerCase();
  }

  function iconeArquivo(nome) {
    const e = extensao(nome);
    if (e === 'pdf') return '📕';
    if (['doc', 'docx', 'odt', 'txt', 'rtf'].includes(e)) return '📄';
    if (['xls', 'xlsx', 'csv', 'ods'].includes(e)) return '📊';
    if (['ppt', 'pptx', 'odp'].includes(e)) return '📽️';
    if (['zip', 'rar', '7z'].includes(e)) return '🗜️';
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(e)) return '🎵';
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(e)) return '🎬';
    return '📎';
  }

  // Aviso rápido (some sozinho)
  function avisar(texto) {
    const t = criar('div', 'chat-anexo-aviso', texto);
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('some'), 3200);
    setTimeout(() => t.remove(), 3700);
  }

  // ---------------------------------------------------------
  // PREPARAR (validar + reduzir foto)
  // ---------------------------------------------------------
  async function reduzirImagem(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;       // gif e outros: como estão
    let bmp;
    try { bmp = await createImageBitmap(file); } catch (e) { return file; }
    const escala = Math.min(1, CFG.IMAGEM_LADO_MAX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * escala));
    const h = Math.max(1, Math.round(bmp.height * escala));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);                   // PNG transparente vira fundo branco
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', CFG.IMAGEM_QUALIDADE));
    return blob && blob.size < file.size ? blob : file;                 // só usa se ficou menor
  }

  async function preparar(file) {
    if (CFG.EXTENSOES_BLOQUEADAS.includes(extensao(file.name))) throw new Error('Este tipo de arquivo não pode ser enviado.');
    if (!file.size) throw new Error('O arquivo está vazio.');
    let blob = file;
    let nome = file.name || 'arquivo';
    if (IMG_EXIBIVEL.test(file.type)) {
      blob = await reduzirImagem(file);
      if (blob !== file) nome = nome.replace(/\.[^.]+$/, '') + '.jpg';
    }
    if (blob.size > CFG.TAMANHO_MAX_MB * 1024 * 1024) {
      throw new Error(`Arquivo muito grande (máximo ${CFG.TAMANHO_MAX_MB} MB).`);
    }
    const mime = blob.type || file.type || 'application/octet-stream';
    return { blob, nome, mime, tamanho: blob.size, tipo: IMG_EXIBIVEL.test(mime) ? 'imagem' : 'arquivo' };
  }

  // ---------------------------------------------------------
  // ESCOLHER (seletor do sistema + prévia com opção de visualização única)
  // ---------------------------------------------------------
  function abrirPrevia(p) {
    return new Promise((resolve) => {
      const fundo = criar('div', 'chat-anexo-fundo');
      const caixa = criar('div', 'chat-anexo-caixa');
      caixa.appendChild(criar('h3', null, p.tipo === 'imagem' ? 'Enviar foto' : 'Enviar arquivo'));

      let urlPrevia = null;
      if (p.tipo === 'imagem') {
        urlPrevia = URL.createObjectURL(p.blob);
        const img = criar('img', 'chat-anexo-previa');
        img.src = urlPrevia; img.alt = '';
        caixa.appendChild(img);
      } else {
        caixa.appendChild(criar('div', 'chat-anexo-icone-grande', iconeArquivo(p.nome)));
      }
      caixa.appendChild(criar('p', 'chat-anexo-detalhe', `${p.nome} · ${formatarTamanho(p.tamanho)}`));

      let marcador = null;
      if (p.tipo === 'imagem') {
        const rotulo = criar('label', 'chat-anexo-unica');
        marcador = criar('input');
        marcador.type = 'checkbox';
        rotulo.append(marcador, document.createTextNode(' 👁️ Visualização única'));
        caixa.append(rotulo, criar('small', 'chat-anexo-dica', 'A pessoa abre uma vez e a foto é apagada do servidor.'));
      }

      const acoes = criar('div', 'chat-anexo-acoes');
      const cancelar = criar('button', 'chat-anexo-cancelar', 'Cancelar'); cancelar.type = 'button';
      const enviar = criar('button', 'chat-anexo-enviar', 'Enviar'); enviar.type = 'button';
      acoes.append(cancelar, enviar);
      caixa.appendChild(acoes);
      fundo.appendChild(caixa);
      document.body.appendChild(fundo);
      enviar.focus();

      function fechar(resultado) {
        if (urlPrevia) URL.revokeObjectURL(urlPrevia);
        document.removeEventListener('keydown', teclas);
        fundo.remove();
        resolve(resultado);
      }
      function teclas(e) { if (e.key === 'Escape') fechar(null); }
      document.addEventListener('keydown', teclas);
      cancelar.addEventListener('click', () => fechar(null));
      enviar.addEventListener('click', () => fechar({ preparado: p, unica: !!(marcador && marcador.checked) }));
      fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(null); });
    });
  }

  // Resolve com { preparado, unica } ou null (cancelou / erro)
  function escolher() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.style.display = 'none';
      input.addEventListener('change', async () => {
        const file = input.files && input.files[0];
        input.remove();
        if (!file) return resolve(null);
        try {
          resolve(await abrirPrevia(await preparar(file)));
        } catch (e) {
          avisar(e.message || 'Não foi possível preparar o arquivo.');
          resolve(null);
        }
      });
      input.addEventListener('cancel', () => { input.remove(); resolve(null); });
      document.body.appendChild(input);
      input.click();
    });
  }

  // Sobe o arquivo e cria a mensagem. Lança Error com texto amigável se falhar.
  // eu = { id, papel }
  function enviar(conversaId, eu, escolha) {
    return Dados().enviarAnexo(conversaId, eu, { ...escolha.preparado, unica: escolha.unica });
  }

  // ---------------------------------------------------------
  // EXIBIR (dentro do balão)
  // ---------------------------------------------------------
  function abrirImagem(src, { unica = false, aoFechar = null } = {}) {
    const fundo = criar('div', 'chat-anexo-visor');
    const fechar = criar('button', 'chat-anexo-visor-fechar', '✕');
    fechar.type = 'button';
    const img = criar('img', 'chat-anexo-visor-img');
    img.src = src; img.alt = '';
    fundo.append(fechar, img);
    if (unica) fundo.appendChild(criar('div', 'chat-anexo-visor-nota', 'Visualização única: ao fechar, esta foto some para sempre.'));
    document.body.appendChild(fundo);

    function sair() {
      document.removeEventListener('keydown', teclas);
      fundo.remove();
      if (aoFechar) aoFechar();
    }
    function teclas(e) { if (e.key === 'Escape') sair(); }
    document.addEventListener('keydown', teclas);
    fechar.addEventListener('click', sair);
    fundo.addEventListener('click', (e) => { if (e.target === fundo) sair(); });
  }

  function corpoImagem(msg, raiz) {
    const aviso = criar('div', 'chat-anexo-carregando', 'Carregando foto…');
    const img = criar('img', 'chat-anexo-img');
    img.alt = msg.arquivo_nome || 'Foto';
    raiz.append(aviso, img);
    if (!msg.arquivo_path) { aviso.textContent = 'Foto indisponível'; return raiz; }
    Dados().urlDoArquivo(msg).then((url) => {
      if (!url) { aviso.textContent = 'Foto indisponível'; return; }
      img.onload = () => { aviso.remove(); img.classList.add('pronta'); };
      img.onerror = () => { aviso.textContent = 'Foto indisponível'; };
      img.src = url;
    });
    img.addEventListener('click', () => { if (img.src) abrirImagem(img.src); });
    return raiz;
  }

  function corpoFotoUnica(msg, meu, eu, raiz) {
    const aberta = !!msg.visualizada_em;
    const cartao = criar('button', 'chat-anexo-cartao unica' + (aberta ? ' aberta' : ''));
    cartao.type = 'button';
    const icone = criar('span', 'chat-anexo-icone', aberta ? '✔️' : '📷');
    const info = criar('span', 'chat-anexo-info');
    const titulo = criar('strong', null, '');
    const sub = criar('small', null, '');
    info.append(titulo, sub);
    cartao.append(icone, info);

    function marcarAberta() {
      cartao.classList.add('aberta'); cartao.disabled = true;
      icone.textContent = '✔️';
      titulo.textContent = 'Foto aberta';
      sub.textContent = meu ? 'A pessoa já viu' : 'Visualização única já usada';
    }

    if (aberta) {
      marcarAberta();
    } else if (meu) {
      titulo.textContent = 'Foto de visualização única';
      sub.textContent = 'Aguardando a pessoa abrir';
      cartao.disabled = true;
    } else {
      titulo.textContent = 'Toque para abrir a foto';
      sub.textContent = 'Visualização única';
      cartao.addEventListener('click', async () => {
        cartao.disabled = true;
        const blob = await Dados().abrirVisualizacaoUnica(msg, eu);
        if (!blob) { avisar('Esta foto não está mais disponível.'); marcarAberta(); return; }
        const url = URL.createObjectURL(blob);
        abrirImagem(url, { unica: true, aoFechar: () => { URL.revokeObjectURL(url); marcarAberta(); } });
      });
    }
    raiz.appendChild(cartao);
    return raiz;
  }

  function corpoArquivo(msg, raiz) {
    const cartao = criar('button', 'chat-anexo-cartao');
    cartao.type = 'button';
    cartao.append(
      criar('span', 'chat-anexo-icone', iconeArquivo(msg.arquivo_nome || '')),
      (() => {
        const info = criar('span', 'chat-anexo-info');
        info.append(criar('strong', null, msg.arquivo_nome || 'Arquivo'),
                    criar('small', null, msg.arquivo_tamanho ? formatarTamanho(msg.arquivo_tamanho) : ''));
        return info;
      })(),
      criar('span', 'chat-anexo-baixar', '⬇')
    );
    if (!msg.arquivo_path) {
      cartao.disabled = true; cartao.classList.add('aberta');
      raiz.appendChild(cartao);
      return raiz;
    }
    cartao.addEventListener('click', async () => {
      const url = await Dados().urlDoArquivo(msg, true);      // cifrado: decifra aqui no navegador
      if (!url) { avisar('Não foi possível baixar o arquivo.'); return; }
      const a = document.createElement('a');
      a.href = url; a.download = msg.arquivo_nome || 'arquivo'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
    });
    raiz.appendChild(cartao);
    return raiz;
  }

  // Monta o conteúdo do balão para mensagens de tipo 'imagem' ou 'arquivo'
  function criarCorpo(msg, eu) {
    const meu = Dados().ehMinha(msg, eu);
    const raiz = criar('div', 'chat-anexo');
    if (msg.tipo === 'imagem' && msg.visualizacao_unica) return corpoFotoUnica(msg, meu, eu, raiz);
    if (msg.tipo === 'imagem') return corpoImagem(msg, raiz);
    return corpoArquivo(msg, raiz);
  }

  window.ChatAnexos = { CFG, escolher, enviar, criarCorpo, abrirImagem, avisar, formatarTamanho };
})();

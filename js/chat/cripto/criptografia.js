/* =========================================================
   UniChamada - Chat: criptografia (AES-256-GCM, WebCrypto do navegador)
   Cifra o TEXTO das mensagens, o NOME e o CONTEÚDO dos arquivos antes de
   ir para o Supabase. No banco e no Storage fica só texto embaralhado.

   Como funciona
   - Cada conversa tem a sua própria chave (derivada do segredo abaixo + id da conversa).
   - Cada mensagem usa um "IV" aleatório novo. O resultado é amarrado ao id da conversa:
     copiar uma mensagem cifrada para outra conversa não abre.
   - Mensagens antigas (sem cifra) continuam aparecendo normalmente.

   O QUE ISSO PROTEGE (e o que não protege)
   - PROTEGE: quem abrir o Table Editor / Storage do Supabase, backup ou vazamento do
     banco vê só texto embaralhado.
   - NÃO PROTEGE: quem tiver o código do site, porque o segredo precisa estar aqui para o
     navegador conseguir ler. O GitHub Pages é público, então qualquer pessoa pode ver.
     Para sigilo de verdade entre as pessoas, o próximo passo é login com Supabase Auth
     e uma chave por usuário.

   ATENÇÃO: se você trocar o SEGREDO abaixo, as mensagens já gravadas deixam de abrir.
   Para trocar sem perder nada, ADICIONE uma versão nova em SEGREDOS (2: '...') e mude
   VERSAO_ATUAL para 2. As mensagens antigas continuam abrindo pela versão 1.

   Exige https (o GitHub Pages já é) ou localhost.
   ========================================================= */
(function () {
  'use strict';
  if (window.ChatCripto) return;

  // >>> EDITE AQUI <<<
  const SEGREDOS = {
    1: '4f22308cad4ee076e8b145d6bd4d9157e7da3208e70b73fb3db57062dfbb3d92'      // segredo da versão 1 (64 letras/números). Gere outro com ChatCripto.gerarSegredo()
  };
  const VERSAO_ATUAL = 1;
  // >>> FIM DA ÁREA DE EDIÇÃO <<<

  const PREFIXO = 'enc:';                                   // todo texto cifrado começa assim
  const funciona = !!(window.crypto && window.crypto.subtle);
  const te = new TextEncoder();
  const td = new TextDecoder();
  const chaves = new Map();                                 // "versão|conversa" -> chave pronta

  // ---------- base64 (para guardar bytes como texto) ----------
  function paraBase64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function deBase64(texto) {
    const bin = atob(texto);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  // Chave AES própria de cada conversa (HKDF a partir do segredo + id da conversa)
  async function chaveDaConversa(versao, conversaId) {
    const id = versao + '|' + conversaId;
    if (chaves.has(id)) return chaves.get(id);
    const segredo = SEGREDOS[versao];
    if (!segredo) throw new Error('versão de chave desconhecida: ' + versao);
    const base = await crypto.subtle.importKey('raw', te.encode(segredo), 'HKDF', false, ['deriveKey']);
    const chave = await crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt: te.encode(String(conversaId)), info: te.encode('unichamada-chat') },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
    chaves.set(id, chave);
    return chave;
  }

  // ---------- bytes (arquivos): saída = [versão][IV 12 bytes][dados cifrados] ----------
  async function cifrarBytes(dados, conversaId) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const chave = await chaveDaConversa(VERSAO_ATUAL, conversaId);
    const cifrado = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: te.encode(String(conversaId)) }, chave, dados));
    const saida = new Uint8Array(13 + cifrado.length);
    saida[0] = VERSAO_ATUAL;
    saida.set(iv, 1);
    saida.set(cifrado, 13);
    return saida;
  }

  async function decifrarBytes(dados, conversaId) {
    const b = dados instanceof Uint8Array ? dados : new Uint8Array(dados);
    const chave = await chaveDaConversa(b[0], conversaId);
    return new Uint8Array(await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b.slice(1, 13), additionalData: te.encode(String(conversaId)) }, chave, b.slice(13)));
  }

  // ---------- texto: "enc:" + base64([versão][IV][dados]) ----------
  async function cifrar(texto, conversaId) {
    return PREFIXO + paraBase64(await cifrarBytes(te.encode(String(texto)), conversaId));
  }

  const ehCifrado = (valor) => typeof valor === 'string' && valor.startsWith(PREFIXO);

  // Texto antigo (sem cifra) volta como está. Se não abrir, devolve um aviso em vez de quebrar a tela.
  async function decifrar(valor, conversaId) {
    if (!ehCifrado(valor)) return valor;
    try {
      return td.decode(await decifrarBytes(deBase64(valor.slice(PREFIXO.length)), conversaId));
    } catch (e) {
      console.warn('ChatCripto: não foi possível decifrar uma mensagem', e);
      return '🔒 Mensagem que não pôde ser aberta';
    }
  }

  // Gera um segredo novo (64 letras/números) para colar em SEGREDOS
  function gerarSegredo() {
    return Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  window.ChatCripto = {
    ativa: () => funciona,
    cifrar, decifrar, cifrarBytes, decifrarBytes, ehCifrado, gerarSegredo
  };
})();

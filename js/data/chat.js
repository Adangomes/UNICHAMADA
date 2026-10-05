/* =========================================================
   UniChamada - Dados do CHAT (todas as consultas ao Supabase)
   Usa o cliente do data/db.js (window.supabaseClient).
   A tela (chat.js) e os módulos de config/ só chamam estas funções.
   ========================================================= */
(function () {
  'use strict';

  const db = () => window.supabaseClient;
  const BUCKET = 'chat-arquivos';
  const CFG = {
    coordenador: { eu: 'coordenador_id', outro: 'professor_id',   tabelaOutro: 'professores',   tipoOutro: 'professor' },
    professor:   { eu: 'professor_id',   outro: 'coordenador_id', tabelaOutro: 'coordenadores', tipoOutro: 'coordenador' }
  };

  let canal = null;                         // mensagens em tempo real
  let canalPresenca = null;                 // quem está online
  let chavePresenca = null;
  let aoMudarPresenca = null;
  const cacheUrls = new Map();              // path -> { url, expira }

  // ---------------------------------------------------------
  // CONTATOS E CONVERSAS
  // ---------------------------------------------------------

  // Contatos (o "outro lado") + conversa existente + contagem de não lidas
  async function listarContatos(papel, euId) {
    const c = CFG[papel];
    const [lista, convs] = await Promise.all([
      db().from(c.tabelaOutro).select('id, nome').order('nome'),
      db().from('chat_conversas').select('*').eq(c.eu, euId)
    ]);
    if (lista.error || convs.error) throw (lista.error || convs.error);

    const conversas = convs.data || [];
    const ids = conversas.map((x) => x.id);
    const naoLidas = {};
    if (ids.length) {
      const { data } = await db().from('chat_mensagens').select('conversa_id')
        .in('conversa_id', ids).eq('lida', false).eq('remetente_tipo', c.tipoOutro);
      (data || []).forEach((m) => { naoLidas[m.conversa_id] = (naoLidas[m.conversa_id] || 0) + 1; });
    }

    return (lista.data || []).map((p) => {
      const conversa = conversas.find((x) => String(x[c.outro]) === String(p.id)) || null;
      return { id: p.id, nome: p.nome || 'Sem nome', conversa, naoLidas: conversa ? (naoLidas[conversa.id] || 0) : 0 };
    });
  }

  // Cria a conversa do par (ou devolve a existente)
  async function garantirConversa(papel, euId, contatoId) {
    const c = CFG[papel];
    const par = { [c.eu]: euId, [c.outro]: contatoId };
    let { data, error } = await db().from('chat_conversas').insert(par).select().single();
    if (error && error.code === '23505') {   // já existia
      ({ data, error } = await db().from('chat_conversas').select('*').match(par).single());
    }
    if (error) { console.error('ChatDados: erro na conversa', error); return null; }
    return data;
  }

  // Apaga a conversa INTEIRA do banco (mensagens saem por cascata) e os arquivos do Storage
  async function apagarConversa(conversaId) {
    const { data: anexos } = await db().from('chat_mensagens').select('arquivo_path')
      .eq('conversa_id', conversaId).not('arquivo_path', 'is', null);
    const caminhos = (anexos || []).map((a) => a.arquivo_path);
    for (let i = 0; i < caminhos.length; i += 100) {
      await db().storage.from(BUCKET).remove(caminhos.slice(i, i + 100));
    }
    const { data, error } = await db().from('chat_conversas').delete().eq('id', conversaId).select('id');
    if (error || !data || !data.length) { console.error('ChatDados: erro ao apagar conversa', error); return false; }
    return true;
  }

  // ---------------------------------------------------------
  // MENSAGENS
  // ---------------------------------------------------------

  async function listarMensagens(conversaId) {
    const { data, error } = await db().from('chat_mensagens').select('*')
      .eq('conversa_id', conversaId).order('created_at', { ascending: true }).limit(300);
    if (error) { console.error('ChatDados: erro ao listar mensagens', error); return []; }
    return data || [];
  }

  async function enviarMensagem(conversaId, papel, texto) {
    const { data, error } = await db().from('chat_mensagens')
      .insert({ conversa_id: conversaId, remetente_tipo: papel, conteudo: texto }).select().single();
    if (error) { console.error('ChatDados: erro ao enviar', error); return null; }
    return data;
  }

  async function marcarComoLidas(conversaId, tipoRemetenteOutro) {
    await db().from('chat_mensagens').update({ lida: true })
      .eq('conversa_id', conversaId).eq('remetente_tipo', tipoRemetenteOutro).eq('lida', false);
  }

  // Edita o texto (só o autor, só texto, só se não foi apagada)
  async function editarMensagem(id, papel, texto) {
    const { data, error } = await db().from('chat_mensagens')
      .update({ conteudo: texto, editada_em: new Date().toISOString() })
      .eq('id', id).eq('remetente_tipo', papel).eq('apagada', false).eq('tipo', 'texto')
      .select().single();
    if (error) { console.error('ChatDados: erro ao editar', error); return null; }
    return data;
  }

  // Apaga a mensagem: limpa o conteúdo no banco, remove o arquivo do Storage e deixa
  // só o marcador "Mensagem apagada" (a linha fica para o outro lado ver o aviso)
  async function apagarMensagem(msg, papel) {
    if (msg.arquivo_path) await db().storage.from(BUCKET).remove([msg.arquivo_path]);
    const { data, error } = await db().from('chat_mensagens')
      .update({
        apagada: true, conteudo: '', arquivo_path: null, arquivo_nome: null,
        arquivo_mime: null, arquivo_tamanho: null, visualizacao_unica: false
      })
      .eq('id', msg.id).eq('remetente_tipo', papel)
      .select().single();
    if (error) { console.error('ChatDados: erro ao apagar mensagem', error); return null; }
    return data;
  }

  // ---------------------------------------------------------
  // ANEXOS (Supabase Storage, bucket privado "chat-arquivos")
  // ---------------------------------------------------------

  function nomeSeguro(nome) {
    return String(nome || 'arquivo')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(-80);
  }

  // dados: { blob, nome, mime, tamanho, tipo: 'imagem'|'arquivo', unica }
  async function enviarAnexo(conversaId, papel, dados) {
    const caminho = `${conversaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguro(dados.nome)}`;
    const up = await db().storage.from(BUCKET).upload(caminho, dados.blob, { contentType: dados.mime, upsert: false });
    if (up.error) {
      console.error('ChatDados: erro no upload', up.error);
      throw new Error('Não foi possível enviar o arquivo.');
    }
    const { data, error } = await db().from('chat_mensagens').insert({
      conversa_id: conversaId, remetente_tipo: papel, tipo: dados.tipo, conteudo: '',
      arquivo_path: caminho, arquivo_nome: dados.nome, arquivo_mime: dados.mime,
      arquivo_tamanho: dados.tamanho, visualizacao_unica: !!dados.unica
    }).select().single();
    if (error) {
      console.error('ChatDados: erro ao registrar anexo', error);
      await db().storage.from(BUCKET).remove([caminho]);
      throw new Error('Não foi possível enviar o arquivo.');
    }
    return data;
  }

  // URL temporária (1 h) para exibir/baixar um anexo
  async function urlAssinada(caminho, nomeDownload) {
    const chave = caminho + '|' + (nomeDownload || '');
    const guardada = cacheUrls.get(chave);
    if (guardada && guardada.expira > Date.now() + 60000) return guardada.url;
    const validade = 3600;
    const opcoes = nomeDownload ? { download: nomeDownload } : undefined;
    const { data, error } = await db().storage.from(BUCKET).createSignedUrl(caminho, validade, opcoes);
    if (error || !data) { console.error('ChatDados: erro na URL do arquivo', error); return null; }
    cacheUrls.set(chave, { url: data.signedUrl, expira: Date.now() + validade * 1000 });
    return data.signedUrl;
  }

  // Foto de visualização única: só o destinatário, só uma vez.
  // Baixa o arquivo, apaga do Storage na hora e devolve o Blob (ou null se já foi vista).
  async function abrirVisualizacaoUnica(msg, papel) {
    const agora = new Date().toISOString();
    const { data, error } = await db().from('chat_mensagens')
      .update({ visualizada_em: agora })
      .eq('id', msg.id).eq('visualizacao_unica', true).is('visualizada_em', null)
      .neq('remetente_tipo', papel)
      .select().single();
    if (error || !data || !data.arquivo_path) return null;

    const caminho = data.arquivo_path;
    const baixado = await db().storage.from(BUCKET).download(caminho);
    if (baixado.error || !baixado.data) {
      await db().from('chat_mensagens').update({ visualizada_em: null }).eq('id', msg.id);   // devolve a chance
      console.error('ChatDados: erro ao baixar foto', baixado.error);
      return null;
    }
    await db().storage.from(BUCKET).remove([caminho]);
    await db().from('chat_mensagens').update({ arquivo_path: null }).eq('id', msg.id);
    cacheUrls.forEach((_, k) => { if (k.startsWith(caminho + '|')) cacheUrls.delete(k); });
    return baixado.data;
  }

  // ---------------------------------------------------------
  // TEMPO REAL
  // ---------------------------------------------------------

  // handlers: { onInsert(msg), onUpdate(msg), onConversaApagada(old) }
  function assinar(papel, euId, handlers) {
    cancelar();
    const h = handlers || {};
    canal = db().channel('chat-' + papel + '-' + euId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' },
        (p) => h.onInsert && h.onInsert(p.new))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_mensagens' },
        (p) => h.onUpdate && h.onUpdate(p.new))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_conversas' },
        (p) => h.onConversaApagada && h.onConversaApagada(p.old))
      .subscribe();
  }

  function cancelar() {
    if (canal) { db().removeChannel(canal); canal = null; }
  }

  // ---------------------------------------------------------
  // PRESENÇA (online / offline) - Supabase Realtime Presence
  // ---------------------------------------------------------

  // aoMudar(setDeChaves): chaves no formato "professor:ID" / "coordenador:ID"
  function iniciarPresenca(papel, euId, aoMudar) {
    const chave = papel + ':' + euId;
    aoMudarPresenca = aoMudar;
    if (canalPresenca && chavePresenca === chave) {            // já estou online: só avisa o estado atual
      if (aoMudar) aoMudar(new Set(Object.keys(canalPresenca.presenceState())));
      return;
    }
    pararPresenca();
    chavePresenca = chave;
    canalPresenca = db().channel('chat-presenca', { config: { presence: { key: chave } } });
    canalPresenca
      .on('presence', { event: 'sync' }, () => {
        if (aoMudarPresenca) aoMudarPresenca(new Set(Object.keys(canalPresenca.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await canalPresenca.track({ papel, id: euId, em: new Date().toISOString() });
      });
  }

  function pararPresenca() {
    if (canalPresenca) { db().removeChannel(canalPresenca); canalPresenca = null; }
    chavePresenca = null;
  }

  window.ChatDados = {
    listarContatos, garantirConversa, apagarConversa,
    listarMensagens, enviarMensagem, marcarComoLidas, editarMensagem, apagarMensagem,
    enviarAnexo, urlAssinada, abrirVisualizacaoUnica,
    assinar, cancelar, iniciarPresenca, pararPresenca
  };
})();

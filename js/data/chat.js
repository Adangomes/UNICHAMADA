/* =========================================================
   UniChamada - Dados do CHAT (todas as consultas ao Supabase)
   Usa o cliente do data/db.js (window.supabaseClient).
   A tela (chat.js) e os módulos de config/ só chamam estas funções.
   ========================================================= */
(function () {
  'use strict';

  const db = () => window.supabaseClient;
  const BUCKET = 'chat-arquivos';
  let canal = null;                         // mensagens em tempo real
  let canalPresenca = null;                 // quem está online
  let chavePresenca = null;
  let aoMudarPresenca = null;
  const cacheUrls = new Map();              // path -> { url, expira }

  // ---------------------------------------------------------
  // IDENTIDADE
  // ---------------------------------------------------------

  // eu = { id, papel: 'coordenador' | 'professor' }
  // A mensagem é minha se o tipo E o id do remetente batem (dois professores têm o mesmo tipo).
  function ehMinha(msg, eu) {
    if (msg.remetente_tipo !== eu.papel) return false;
    return msg.remetente_id == null || String(msg.remetente_id) === String(eu.id);
  }

  // Condição PostgREST "NÃO é minha" (para marcar como lida / abrir foto única)
  const naoMinha = (eu) => `remetente_tipo.neq.${eu.papel},remetente_id.neq.${eu.id}`;

  // ---------------------------------------------------------
  // CONTATOS E CONVERSAS
  // Tipos de conversa: 'misto' (coordenador x professor), 'prof_prof' e 'coord_coord'
  // ---------------------------------------------------------

  // Quem é "o outro" numa conversa vista por mim: { aba: 'professor'|'coordenador', id }
  function outroDaConversa(cv, eu) {
    const meuId = String(eu.id);
    const tipo = cv.tipo || 'misto';
    if (tipo === 'prof_prof') {
      if (eu.papel !== 'professor') return null;
      return { aba: 'professor', id: String(cv.professor_id) === meuId ? cv.professor2_id : cv.professor_id };
    }
    if (tipo === 'coord_coord') {
      if (eu.papel !== 'coordenador') return null;
      return { aba: 'coordenador', id: String(cv.coordenador_id) === meuId ? cv.coordenador2_id : cv.coordenador_id };
    }
    if (eu.papel === 'coordenador') {
      return String(cv.coordenador_id) === meuId ? { aba: 'professor', id: cv.professor_id } : null;
    }
    return String(cv.professor_id) === meuId ? { aba: 'coordenador', id: cv.coordenador_id } : null;
  }

  // Todos os professores e coordenadores (menos eu) + conversa existente + não lidas
  async function listarContatos(eu) {
    const colunas = eu.papel === 'coordenador' ? ['coordenador_id', 'coordenador2_id'] : ['professor_id', 'professor2_id'];
    const [profs, coords, convs] = await Promise.all([
      db().from('professores').select('id, nome').order('nome'),
      db().from('coordenadores').select('id, nome').order('nome'),
      db().from('chat_conversas').select('*').or(`${colunas[0]}.eq.${eu.id},${colunas[1]}.eq.${eu.id}`)
    ]);
    if (profs.error || coords.error || convs.error) throw (profs.error || coords.error || convs.error);

    const conversas = convs.data || [];
    const porContato = new Map();                       // "aba:id" -> conversa
    conversas.forEach((cv) => {
      const o = outroDaConversa(cv, eu);
      if (o) porContato.set(o.aba + ':' + o.id, cv);
    });

    const ids = conversas.map((x) => x.id);
    const naoLidas = {};
    if (ids.length) {
      const { data } = await db().from('chat_mensagens').select('conversa_id, remetente_tipo, remetente_id')
        .in('conversa_id', ids).eq('lida', false);
      (data || []).forEach((m) => {
        if (!ehMinha(m, eu)) naoLidas[m.conversa_id] = (naoLidas[m.conversa_id] || 0) + 1;
      });
    }

    const montar = (lista, aba) => (lista || [])
      .filter((p) => !(aba === eu.papel && String(p.id) === String(eu.id)))     // não aparece conversando comigo mesmo
      .map((p) => {
        const conversa = porContato.get(aba + ':' + p.id) || null;
        return { id: p.id, aba, nome: p.nome || 'Sem nome', conversa, naoLidas: conversa ? (naoLidas[conversa.id] || 0) : 0 };
      });
    return [...montar(profs.data, 'professor'), ...montar(coords.data, 'coordenador')];
  }

  function montarPar(eu, contato) {
    if (eu.papel === 'coordenador' && contato.aba === 'professor') return { tipo: 'misto', coordenador_id: eu.id, professor_id: contato.id };
    if (eu.papel === 'professor' && contato.aba === 'coordenador') return { tipo: 'misto', coordenador_id: contato.id, professor_id: eu.id };
    if (eu.papel === 'professor') return { tipo: 'prof_prof', professor_id: eu.id, professor2_id: contato.id };
    return { tipo: 'coord_coord', coordenador_id: eu.id, coordenador2_id: contato.id };
  }

  function buscarConversa(par) {
    let q = db().from('chat_conversas').select('*').eq('tipo', par.tipo);
    if (par.tipo === 'misto') return q.eq('coordenador_id', par.coordenador_id).eq('professor_id', par.professor_id).single();
    const [c1, c2] = par.tipo === 'prof_prof' ? ['professor_id', 'professor2_id'] : ['coordenador_id', 'coordenador2_id'];
    return q.or(`and(${c1}.eq.${par[c1]},${c2}.eq.${par[c2]}),and(${c1}.eq.${par[c2]},${c2}.eq.${par[c1]})`).single();
  }

  // Cria a conversa do par (ou devolve a existente). O banco guarda o par em ordem fixa.
  async function garantirConversa(eu, contato) {
    const par = montarPar(eu, contato);
    let { data, error } = await db().from('chat_conversas').insert(par).select().single();
    if (error && error.code === '23505') ({ data, error } = await buscarConversa(par));   // já existia
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

  async function enviarMensagem(conversaId, eu, texto) {
    const { data, error } = await db().from('chat_mensagens')
      .insert({ conversa_id: conversaId, remetente_tipo: eu.papel, remetente_id: String(eu.id), conteudo: texto })
      .select().single();
    if (error) { console.error('ChatDados: erro ao enviar', error); return null; }
    return data;
  }

  // Marca como lidas as mensagens da conversa que NÃO são minhas
  async function marcarComoLidas(conversaId, eu) {
    await db().from('chat_mensagens').update({ lida: true })
      .eq('conversa_id', conversaId).eq('lida', false).or(naoMinha(eu));
  }

  // Edita o texto (só o autor, só texto, só se não foi apagada)
  async function editarMensagem(id, eu, texto) {
    const { data, error } = await db().from('chat_mensagens')
      .update({ conteudo: texto, editada_em: new Date().toISOString() })
      .eq('id', id).eq('remetente_tipo', eu.papel).eq('remetente_id', String(eu.id)).eq('apagada', false).eq('tipo', 'texto')
      .select().single();
    if (error) { console.error('ChatDados: erro ao editar', error); return null; }
    return data;
  }

  // Apaga a mensagem: limpa o conteúdo no banco, remove o arquivo do Storage e deixa
  // só o marcador "Mensagem apagada" (a linha fica para o outro lado ver o aviso)
  async function apagarMensagem(msg, eu) {
    if (msg.arquivo_path) await db().storage.from(BUCKET).remove([msg.arquivo_path]);
    const { data, error } = await db().from('chat_mensagens')
      .update({
        apagada: true, conteudo: '', arquivo_path: null, arquivo_nome: null,
        arquivo_mime: null, arquivo_tamanho: null, visualizacao_unica: false
      })
      .eq('id', msg.id).eq('remetente_tipo', eu.papel).eq('remetente_id', String(eu.id))
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
  async function enviarAnexo(conversaId, eu, dados) {
    const caminho = `${conversaId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${nomeSeguro(dados.nome)}`;
    const up = await db().storage.from(BUCKET).upload(caminho, dados.blob, { contentType: dados.mime, upsert: false });
    if (up.error) {
      console.error('ChatDados: erro no upload', up.error);
      throw new Error('Não foi possível enviar o arquivo.');
    }
    const { data, error } = await db().from('chat_mensagens').insert({
      conversa_id: conversaId, remetente_tipo: eu.papel, remetente_id: String(eu.id), tipo: dados.tipo, conteudo: '',
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
  async function abrirVisualizacaoUnica(msg, eu) {
    const agora = new Date().toISOString();
    const { data, error } = await db().from('chat_mensagens')
      .update({ visualizada_em: agora })
      .eq('id', msg.id).eq('visualizacao_unica', true).is('visualizada_em', null)
      .or(naoMinha(eu))
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

  // eu = { id, papel }; handlers: { onInsert(msg), onUpdate(msg), onConversaApagada(old) }
  function assinar(eu, handlers) {
    cancelar();
    const h = handlers || {};
    canal = db().channel('chat-' + eu.papel + '-' + eu.id)
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
  function iniciarPresenca(eu, aoMudar) {
    const chave = eu.papel + ':' + eu.id;
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
        if (status === 'SUBSCRIBED') await canalPresenca.track({ papel: eu.papel, id: eu.id, em: new Date().toISOString() });
      });
  }

  function pararPresenca() {
    if (canalPresenca) { db().removeChannel(canalPresenca); canalPresenca = null; }
    chavePresenca = null;
  }

  window.ChatDados = {
    ehMinha, listarContatos, garantirConversa, apagarConversa,
    listarMensagens, enviarMensagem, marcarComoLidas, editarMensagem, apagarMensagem,
    enviarAnexo, urlAssinada, abrirVisualizacaoUnica,
    assinar, cancelar, iniciarPresenca, pararPresenca
  };
})();

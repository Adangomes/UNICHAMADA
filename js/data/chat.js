/* =========================================================
   UniChamada - Dados do CHAT (todas as consultas ao Supabase)
   Usa o cliente do data/db.js (window.supabaseClient).
   As telas (coordenador/chat e professor/chat) só chamam estas funções.
   ========================================================= */
(function () {
  'use strict';

  const db = () => window.supabaseClient;
  const CFG = {
    coordenador: { eu: 'coordenador_id', outro: 'professor_id',    tabelaOutro: 'professores',    tipoOutro: 'professor' },
    professor:   { eu: 'professor_id',   outro: 'coordenador_id',  tabelaOutro: 'coordenadores',  tipoOutro: 'coordenador' }
  };
  let canal = null;

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

  // Tempo real: chama callback(mensagem) a cada nova mensagem que eu tenho permissão de ver
  function assinar(papel, euId, callback) {
    cancelar();
    canal = db().channel('chat-' + papel + '-' + euId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensagens' },
        (payload) => callback(payload.new))
      .subscribe();
  }

  function cancelar() {
    if (canal) { db().removeChannel(canal); canal = null; }
  }

  window.ChatDados = { listarContatos, garantirConversa, listarMensagens, enviarMensagem, marcarComoLidas, assinar, cancelar };
})();

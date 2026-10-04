/* =========================================================
   UniChamada - Login do CHAT (Supabase Auth)
   Reaproveita URL/chave do data/db.js (carregue db.js ANTES).
   Usa um cliente SEPARADO (window.chatClient) com sessão própria,
   assim o resto do sistema continua funcionando como antes.
   ========================================================= */
(function () {
  'use strict';

  if (!window.supabase || typeof SUPABASE_URL === 'undefined' || typeof SUPABASE_KEY === 'undefined') {
    console.error('ChatAuth: carregue o SDK do Supabase e o data/db.js antes deste arquivo.');
    return;
  }

  const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      storageKey: 'unichamada-chat-auth',   // não conflita com o cliente do db.js
      storage: window.sessionStorage,       // sessão some ao fechar a aba, como o login do sistema
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false
    }
  });
  window.chatClient = db;

  const TABELAS = { coordenador: 'coordenadores', professor: 'professores' };

  // Devolve { id, nome, papel } se há sessão E a conta é do papel pedido; senão null
  async function perfil(papel) {
    const { data: { session } } = await db.auth.getSession();
    if (!session) return null;
    const { data, error } = await db.from(TABELAS[papel]).select('id, nome')
      .eq('auth_user_id', session.user.id).maybeSingle();
    if (error || !data) return null;
    return { id: data.id, nome: data.nome, papel };
  }

  // Retorna { perfil } em caso de sucesso ou { erro } com mensagem pronta para exibir
  async function entrar(email, senha, papel) {
    const { error } = await db.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error) return { erro: 'E-mail ou senha incorretos.' };
    const p = await perfil(papel);
    if (!p) {
      await db.auth.signOut();
      return { erro: 'Esta conta não está vinculada a um ' + papel + '.' };
    }
    return { perfil: p };
  }

  async function sair() { await db.auth.signOut(); }

  window.ChatAuth = { perfil, entrar, sair };
})();

/**
 * supabase.js — cria a conexão com o Supabase (TI.db) e traduz erros (TI.dados.tratar).
 * Nenhuma tela fala direto com o Supabase: todas passam pelos arquivos desta pasta.
 */
window.TI = window.TI || {};
TI.dados = TI.dados || {};
TI.db = null;
TI.dbErro = null;

(function () {
  const cfg = TI.config;
  if (!window.supabase || !window.supabase.createClient) {
    TI.dbErro = 'A biblioteca do Supabase não carregou. Verifique a internet.';
    return;
  }
  if (String(cfg.supabaseUrl).indexOf('https://xultvypwxwyxhhxfzwqdw.supabase.co') === 0 || String(cfg.supabaseAnonKey).indexOf('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY') === 0) {
    TI.dbErro = 'Preencha a URL e a chave anon do Supabase em js/config/supabase-config.js.';
    return;
  }
  try {
    TI.db = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
  } catch (e) {
    TI.dbErro = 'Não foi possível conectar ao Supabase: ' + e.message;
  }
})();

/** Recebe { data, error } do Supabase: devolve data ou lança um erro com texto em português. */
TI.dados.tratar = function (resposta) {
  if (resposta && resposta.error) {
    const e = resposta.error;
    let msg = e.message || 'Erro ao acessar o banco de dados.';
    if (e.code === '42501') msg = 'Você não tem permissão para esta ação.';
    else if (e.code === 'PGRST116') msg = 'Não foi possível salvar: o item não existe ou você não tem permissão.';
    else if (e.code === '23505') msg = 'Já existe um registro com esses dados (RA ou e-mail repetido).';
    throw new Error(msg);
  }
  return resposta ? resposta.data : null;
};






/**
 * config.js — como a aba Suporte fala com o Supabase.
 */
window.Suporte = window.Suporte || {};

(function () {
  const S = window.Suporte;
  const padrao = {
    supabaseUrl: 'https://xultvypwxwyxhxfzwqdw.supabase.co',
    supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iJlcDI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY',
    cliente: () => window.supabaseClient
  };
  
  const pronto = (v) => !!v && String(v).indexOf('COLE_AQUI') !== 0;

  S.config = S.config || {};
  ['supabaseUrl', 'supabaseAnonKey', 'cliente'].forEach((chave) => {
    const externo = (window.SuporteConfig || {})[chave];
    const valor = pronto(externo) || (chave === 'cliente' && externo) ? externo : padrao[chave];
    if (pronto(valor) || (chave === 'cliente' && valor)) S.config[chave] = valor;
  });
})();

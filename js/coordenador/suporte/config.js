/**
 * config.js — como a aba Suporte fala com o Supabase.
 *
 * Preencha UMA das opções (a opção A é a mais simples). Só a chave PÚBLICA (anon): a chave de
 * administrador (service_role) NUNCA entra em nenhum arquivo do GitHub.
 *
 *  A) supabaseUrl + supabaseAnonKey  → os mesmos que o site principal já usa (Supabase > Project Settings > API)
 *  B) cliente                        → o cliente supabase-js que o site já tem. Ex.:  cliente: () => meuClienteSupabase
 *
 * Dica: se você tem esta pasta nas duas (coordenador/ e professor/), basta preencher em UMA delas, ou então
 * definir window.SuporteConfig = { ... } uma única vez em qualquer script carregado antes.
 */
window.Suporte = window.Suporte || {};

(function () {
  const S = window.Suporte;
  const padrao = {
    supabaseUrl: 'COLE_AQUI_A_URL_DO_SUPABASE',
    supabaseAnonKey: 'COLE_AQUI_A_CHAVE_ANON',
    cliente: null
  };
  const pronto = (v) => !!v && String(v).indexOf('COLE_AQUI') !== 0;

  S.config = S.config || {};
  // só aceita valores de verdade: assim uma cópia não preenchida desta pasta não apaga a outra que está preenchida
  ['supabaseUrl', 'supabaseAnonKey', 'cliente'].forEach((chave) => {
    const externo = (window.SuporteConfig || {})[chave];
    const valor = pronto(externo) || (chave === 'cliente' && externo) ? externo : padrao[chave];
    if (pronto(valor) || (chave === 'cliente' && valor)) S.config[chave] = valor;
  });
})();

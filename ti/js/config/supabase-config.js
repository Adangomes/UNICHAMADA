/**
 * supabase-config.js — endereços e chaves públicas do módulo de TI.
 *
 * ATENÇÃO: aqui entra SÓ a chave "anon" (pública). A chave de administrador
 * ("service_role") NUNCA pode aparecer em nenhum arquivo do GitHub.
 */
window.TI = window.TI || {};

TI.config = {
  // Supabase > Project Settings > API > Project URL
  supabaseUrl: 'COLE_AQUI_A_URL_DO_SUPABASE',
  // Supabase > Project Settings > API > anon public key
  supabaseAnonKey: 'COLE_AQUI_A_CHAVE_ANON',
  // URL de PRODUÇÃO do webhook do n8n que cria funcionários (ver docs/n8n-criar-funcionario.md)
  n8nCriarFuncionarioUrl: 'COLE_AQUI_A_URL_DO_WEBHOOK_DO_N8N',
  // Guarda o "#..." da URL ANTES do Supabase limpá-lo (é por ele que sabemos que é um link de convite)
  hashInicial: window.location.hash || ''
};

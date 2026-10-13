/**
 * supabase-config.js — endereços e chaves públicas do módulo de TI.
 *
 * ATENÇÃO: aqui entra SÓ a chave "anon" (pública). A chave de administrador
 * ("service_role") NUNCA pode aparecer em nenhum arquivo do GitHub.
 */
window.TI = window.TI || {};

TI.config = {
  // Supabase > Project Settings > API > Project URL
  supabaseUrl: 'https://xultvypwxwyxhxfzwqdw.supabase.co',
  
  // Supabase > Project Settings > API > anon public key
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY',
  
  // URL de PRODUÇÃO do webhook do n8n (atualizada com o teu túnel atual do Cloudflare)
  n8nCriarFuncionarioUrl: 'https://nat-specifies-genome-fails.trycloudflare.com/webhook/3fe52560-8e23-4407-8185-b40535e199ec',
  
  // Guarda o "#..." da URL ANTES do Supabase limpá-lo (é por ele que sabemos que é um link de convite)
  hashInicial: window.location.hash || ''
};

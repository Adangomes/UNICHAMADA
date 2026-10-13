/**
 * supabase-config.js — endereços e chaves públicas do módulo de TI.
 */
window.TI = window.TI || {};

TI.config = {
  supabaseUrl: 'https://xultvypwxwyxhxfzwqdw.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY',
  
  // Deixamos vazio pois o cadastro será feito direto no banco por enquanto
  n8nCriarFuncionarioUrl: '',
  
  hashInicial: window.location.hash || ''
};

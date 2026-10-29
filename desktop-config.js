// Configuração SOMENTE do aplicativo desktop (Electron). O site no GitHub Pages não usa este arquivo.
// O seu config do site (window.UNICHAMADA_CONFIG) continua separado e não precisa ser alterado.
module.exports = {
  // Mesmo projeto Supabase do site. A anon key é pública por design;
  // a proteção está no RLS e na função validar_licenca. Nunca use a service_role aqui.
  SUPABASE_URL: 'https://xultvypwxwyxhxfzwqdw.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY',

  // Dias que o app aceita abrir sem internet, desde que a última validação online seja recente
  DIAS_TOLERANCIA_OFFLINE: 7,

  // false = o Painel TI abre direto na tela de login (quem protege é o login + RLS do Supabase).
  //         Evita o problema do "ovo e da galinha": a licença é gerada DENTRO do painel TI.
  // true  = o Painel TI também exige licença. A primeira licença precisa ser
  //         criada manualmente no Supabase (INSERT na tabela licencas_software).
  EXIGIR_LICENCA_NO_TI: false
};
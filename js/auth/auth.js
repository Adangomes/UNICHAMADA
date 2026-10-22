/**
 * auth.js
 * ------------------------------------------------------------------
 * Supabase Auth por código enviado ao e-mail. Após a confirmação do
 * código, associa o usuário autenticado ao cadastro acadêmico pelo
 * RA e e-mail (coordenador ou professor).
 * ------------------------------------------------------------------ */

function exigirClienteAuth() {
  if (!window.supabaseClient) {
    throw new Error('Supabase não configurado.');
  }
  return window.supabaseClient;
}

async function solicitarCodigoAcesso(email) {
  const { error } = await exigirClienteAuth().auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true }
  });
  if (error) {
    console.error('Falha ao solicitar código de acesso:', error);
    throw error;
  }
}

async function buscarPerfilAcademico(email, ra = null) {
  const cliente = exigirClienteAuth();
  const emailNormalizado = email.trim().toLowerCase();

  let consultaCoordenador = cliente
    .from('coordenadores')
    .select('*')
    .ilike('email', emailNormalizado);
  if (ra) consultaCoordenador = consultaCoordenador.eq('ra', ra.trim());

  const { data: coordenador, error: erroCoordenador } = await consultaCoordenador.maybeSingle();
  if (erroCoordenador) {
    console.error('Falha ao consultar cadastro do coordenador:', erroCoordenador);
    throw erroCoordenador;
  }
  if (coordenador) return { tipo: 'coordenador', dados: coordenador };

  let consultaProfessor = cliente
    .from('professores')
    .select('*')
    .ilike('email', emailNormalizado);
  if (ra) consultaProfessor = consultaProfessor.eq('ra', ra.trim());

  const { data: professor, error: erroProfessor } = await consultaProfessor.maybeSingle();
  if (erroProfessor) {
    console.error('Falha ao consultar cadastro do professor:', erroProfessor);
    throw erroProfessor;
  }
  return professor ? { tipo: 'professor', dados: professor } : null;
}

async function confirmarCodigoAcesso(ra, email, codigo) {
  const cliente = exigirClienteAuth();
  const emailNormalizado = email.trim().toLowerCase();
  const { error } = await cliente.auth.verifyOtp({
    email: emailNormalizado,
    token: codigo.trim(),
    type: 'email'
  });
  if (error) {
    console.error('Código de acesso inválido ou expirado:', error);
    throw error;
  }

  try {
    const perfil = await buscarPerfilAcademico(emailNormalizado, ra);
    if (perfil) return perfil;
  } catch (erro) {
    await cliente.auth.signOut();
    throw erro;
  }

  await cliente.auth.signOut();
  return null;
}

async function obterSessao() {
  const cliente = exigirClienteAuth();
  const { data, error } = await cliente.auth.getSession();
  if (error) {
    console.error('Falha ao recuperar sessão Supabase:', error);
    throw error;
  }

  const email = data.session?.user?.email;
  if (!email) return null;

  const perfil = await buscarPerfilAcademico(email);
  if (!perfil) {
    await cliente.auth.signOut();
    return null;
  }
  return perfil;
}

async function encerrarSessao() {
  const cliente = exigirClienteAuth();
  const { error } = await cliente.auth.signOut();
  if (error) {
    console.error('Falha ao encerrar sessão Supabase:', error);
    throw error;
  }
}

window.solicitarCodigoAcesso = solicitarCodigoAcesso;
window.confirmarCodigoAcesso = confirmarCodigoAcesso;
window.obterSessao = obterSessao;
window.encerrarSessao = encerrarSessao;

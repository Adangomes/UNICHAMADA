/**
 * Login da equipe por RA + e-mail, sem Supabase Auth ou código por e-mail.
 * O perfil validado fica na sessão atual do navegador.
 */
const CHAVE_SESSAO = 'sistema-academico-sessao';

async function autenticar(ra, email) {
  const cliente = window.supabaseClient;
  if (!cliente) throw new Error('Supabase não configurado.');

  const raNormalizado = ra.trim();
  const emailNormalizado = email.trim().toLowerCase();

  for (const [tipo, tabela] of [
    ['coordenador', 'coordenadores'],
    ['professor', 'professores']
  ]) {
    const { data, error } = await cliente
      .from(tabela)
      .select('*')
      .eq('ra', raNormalizado)
      .ilike('email', emailNormalizado.replace(/[\\%_]/g, '\\$&'))
      .maybeSingle();

    if (error) {
      console.error(`Falha ao validar o acesso em ${tabela}:`, error);
      throw error;
    }
    if (data) return { tipo, dados: data };
  }

  return null;
}

function salvarSessao(sessao) {
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

function obterSessao() {
  const bruto = sessionStorage.getItem(CHAVE_SESSAO);
  if (!bruto) return null;

  try {
    return JSON.parse(bruto);
  } catch (erro) {
    console.error('Não foi possível ler a sessão salva:', erro);
    sessionStorage.removeItem(CHAVE_SESSAO);
    return null;
  }
}

function encerrarSessao() {
  sessionStorage.removeItem(CHAVE_SESSAO);
}

window.autenticar = autenticar;
window.salvarSessao = salvarSessao;
window.obterSessao = obterSessao;
window.encerrarSessao = encerrarSessao;

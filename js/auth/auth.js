/**
 * auth.js
 * ------------------------------------------------------------------
 * Login único por RA + e-mail (sem senha, conforme especificado).
 * A MESMA tela de login serve para coordenador e professor:
 *  - Se RA + e-mail baterem com um registro em "coordenadores" -> painel do coordenador.
 *  - Se baterem com um registro em "professores" -> painel do professor.
 *  - Se não baterem com nada -> nada abre, e um aviso é exibido.
 * ------------------------------------------------------------------
 */
/**
const CHAVE_SESSAO = 'sistema-academico-sessao';
*/
/**
 * @returns {{tipo:'coordenador'|'professor', dados:object} | null}
 
function autenticar(ra, email) {
  const raNormalizado = ra.trim().toUpperCase();
  const emailNormalizado = email.trim().toLowerCase();

  const coordenador = dbListar('coordenadores').find(
    (c) => c.ra.toUpperCase() === raNormalizado && c.email.toLowerCase() === emailNormalizado
  );
  if (coordenador) return { tipo: 'coordenador', dados: coordenador };

  const professor = dbListar('professores').find(
    (p) => p.ra.toUpperCase() === raNormalizado && p.email.toLowerCase() === emailNormalizado
  );
  if (professor) return { tipo: 'professor', dados: professor };

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
  } catch {
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

*/


/**
 * auth.js
 * ------------------------------------------------------------------
 * Login único por RA + e-mail (sem senha, conforme especificado).
 * A MESMA tela de login serve para coordenador e professor:
 *  - Se RA + e-mail baterem com um registro em "coordenadores" -> painel do coordenador.
 *  - Se baterem com um registro em "professores" -> painel do professor.
 *  - Se não baterem com nada -> nada abre, e um aviso é exibido.
 * ------------------------------------------------------------------
 */


/**
CODIGO 01 CORRIGIDO DAQUI PARA BAIXO
 */

const CHAVE_SESSAO = 'sistema-academico-sessao';

/**
 * Autentica o usuário consultando diretamente as tabelas do PostgreSQL via Supabase.
 * @param {string} ra 
 * @param {string} email 
 * @returns {Promise<{tipo:'coordenador'|'professor', dados:object} | null>}
 */
async function autenticar(ra, email) {
  const raNormalizado = ra.trim().toUpperCase();
  const emailNormalizado = email.trim().toLowerCase();

  try {
    // 1. Tenta buscar na tabela 'coordenadores'
    const { data: coordenador, error: erroCoordenador } = await supabase
      .from('coordenadores')
      .select('*')
      .eq('ra', raNormalizado)
      .ilike('email', emailNormalizado)
      .maybeSingle();

    if (erroCoordenador) {
      console.error("Erro ao buscar coordenador:", erroCoordenador);
    }

    if (coordenador) {
      return { tipo: 'coordenador', dados: coordenador };
    }

    // 2. Se não achou nos coordenadores, tenta buscar na tabela 'professores'
    const { data: professor, error: erroProfessor } = await supabase
      .from('professores')
      .select('*')
      .eq('ra', raNormalizado)
      .ilike('email', emailNormalizado)
      .maybeSingle();

    if (erroProfessor) {
      console.error("Erro ao buscar professor:", erroProfessor);
    }

    if (professor) {
      return { tipo: 'professor', dados: professor };
    }

    // 3. Se não encontrar em nenhuma das duas tabelas
    return null;

  } catch (erro) {
    console.error("Erro crítico durante a autenticação:", erro);
    throw new Error("Falha na conexão com o banco de dados.");
  }
}

function salvarSessao(sessao) {
  sessionStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

function obterSessao() {
  const bruto = sessionStorage.getItem(CHAVE_SESSAO);
  if (!bruto) return null;
  try {
    return JSON.parse(bruto);
  } catch {
    return null;
  }
}

function encerrarSessao() {
  sessionStorage.removeItem(CHAVE_SESSAO);
}

// Expõe as funções globalmente
window.autenticar = autenticar;
window.salvarSessao = salvarSessao;
window.obterSessao = obterSessao;
window.encerrarSessao = encerrarSessao;

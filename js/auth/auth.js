/**
 * auth.js
 * ------------------------------------------------------------------
 * Login único por RA + e-mail (sem senha, conforme especificado).
 * A MESMA tela de login serve para coordenador e professor:
 *  - Se RA + e-mail baterem com um registro em "coordenadores" -> painel do coordenador.
 *  - Se baterem com um registro em "professores" -> painel do professor.
 *  - Se não baterem com nada -> nada abre, e um aviso é exibido.
 * ------------------------------------------------------------------ */
 

const CHAVE_SESSAO = 'sistema-academico-sessao';

 
 
 
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


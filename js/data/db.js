/**
 * db.js
 * ------------------------------------------------------------------
 * Camada de dados do front-end.
 *
 * Este é um projeto SOMENTE FRONT-END (para publicar no GitHub Pages),
 * então aqui simulamos as tabelas que, no futuro, viverão no
 * PostgreSQL/SQL: cada "tabela" é um array de objetos, persistido no
 * localStorage do navegador. As chaves estrangeiras são só o "id" de
 * outra tabela (ex.: disciplina.cursoId -> cursos.id), exatamente como
 * seria em SQL, para facilitar a migração para uma API real depois.
 *
 * Tabelas:
 *   coordenadores  { id, nome, ra, email }
 *   professores    { id, nome, ra, email, fotoRosto }
 *   cursos         { id, nome }
 *   disciplinas    { id, nome, cursoId, turno, cargaHoraria, professorId }
 *   turmas         { id, nome, cursoId, disciplinaId, professorId, turno, periodo }
 *   alunos         { id, nome, ra, email, fotoRosto, cursoId }
 *   matriculas     { id, alunoId, turmaId, dataMatricula }
 *   chamadas       { id, turmaId, professorId, codigoAtual, codigoAnterior,
 *                     geradaEm, atualizadoEm, ativa }
 *   presencas      { id, chamadaId, turmaId, alunoId, status, origem, confirmadoEm }
 *       status  -> 'presente' | 'falta' | 'falta_justificada'
 *       origem  -> 'qrcode' | 'manual'
 * ------------------------------------------------------------------
 */

const DB_CHAVE = 'sistema-academico-db-v1';

const TABELAS_PADRAO = {
  coordenadores: [
    { id: 'coord-1', nome: 'Coordenador(a) do Curso', ra: 'COORD001', email: 'coordenador@instituicao.edu.br' }
  ],
  professores: [],
  cursos: [],
  disciplinas: [],
  turmas: [],
  alunos: [],
  matriculas: [],
  chamadas: [],
  presencas: []
};

function dbCarregar() {
  const bruto = localStorage.getItem(DB_CHAVE);
  if (!bruto) {
    dbSalvarTudo(TABELAS_PADRAO);
    return estruturaClonada(TABELAS_PADRAO);
  }
  try {
    const dados = JSON.parse(bruto);
    // garante que tabelas novas adicionadas no código também existam
    return { ...estruturaClonada(TABELAS_PADRAO), ...dados };
  } catch (erro) {
    console.error('Falha ao ler o banco local, recriando do zero.', erro);
    dbSalvarTudo(TABELAS_PADRAO);
    return estruturaClonada(TABELAS_PADRAO);
  }
}

function dbSalvarTudo(dados) {
  localStorage.setItem(DB_CHAVE, JSON.stringify(dados));
}

function estruturaClonada(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Objeto único em memória representando o "banco" durante a sessão. */
const DB = dbCarregar();

function dbPersistir() {
  dbSalvarTudo(DB);
  window.dispatchEvent(new CustomEvent('banco-atualizado'));
}

/**
 * Mantém o "banco" em memória sincronizado entre abas do MESMO navegador
 * (ex.: professor com a tela de chamada aberta numa aba e o aluno
 * confirmando presença em outra aba/celular usando o mesmo navegador
 * seria outro dispositivo — nesse caso, só um back-end real resolve).
 * Isso é o que permite a lista de presença mudar de cinza pra verde sozinha.
 */
window.addEventListener('storage', (evento) => {
  if (evento.key !== DB_CHAVE) return;
  const recarregado = dbCarregar();
  Object.keys(DB).forEach((chave) => delete DB[chave]);
  Object.assign(DB, recarregado);
  window.dispatchEvent(new CustomEvent('banco-atualizado'));
});

/** Assina atualizações do banco (mesma aba ou outras abas). Retorna função para cancelar. */
function dbAoAtualizar(callback) {
  window.addEventListener('banco-atualizado', callback);
  return () => window.removeEventListener('banco-atualizado', callback);
}

function dbGerarId(prefixo) {
  return `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------------------- Operações genéricas de tabela ---------------------- */

function dbListar(tabela) {
  return DB[tabela] || [];
}

function dbBuscarPorId(tabela, id) {
  return dbListar(tabela).find((registro) => registro.id === id) || null;
}

function dbInserir(tabela, registro) {
  const novo = { id: dbGerarId(tabela.slice(0, 3)), ...registro };
  DB[tabela].push(novo);
  dbPersistir();
  return novo;
}

function dbAtualizar(tabela, id, dadosNovos) {
  const indice = DB[tabela].findIndex((registro) => registro.id === id);
  if (indice === -1) return null;
  DB[tabela][indice] = { ...DB[tabela][indice], ...dadosNovos };
  dbPersistir();
  return DB[tabela][indice];
}

function dbRemover(tabela, id) {
  const antes = DB[tabela].length;
  DB[tabela] = DB[tabela].filter((registro) => registro.id !== id);
  dbPersistir();
  return DB[tabela].length < antes;
}

/* Exposto globalmente (arquivos carregados via <script> simples, sem bundler) */
window.DB = DB;
window.dbListar = dbListar;
window.dbBuscarPorId = dbBuscarPorId;
window.dbInserir = dbInserir;
window.dbAtualizar = dbAtualizar;
window.dbRemover = dbRemover;
window.dbGerarId = dbGerarId;
window.dbAoAtualizar = dbAoAtualizar;

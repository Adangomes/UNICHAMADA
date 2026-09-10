/**
 * db.js - Conexão com Supabase
 * ------------------------------------------------------------------
 * Conecta o front-end ao banco de dados PostgreSQL hospedado no Supabase.
 */

// 1. Configuração do Supabase
const SUPABASE_URL = 'https://xultvypwxwyxhfzwqdw.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Hz-73F700H3ROCfGhe1htg_p7f3P...'; // Cole a sua chave COMPLETA aqui

// Inicializa o cliente Supabase
const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

if (!supabaseClient) {
  console.error("SDK do Supabase não encontrado! Certifique-se de incluir a tag <script> do Supabase no seu HTML.");
}

/* ---------------------- Operações Assíncronas (Supabase) ---------------------- */

/**
 * Busca todos os registros de uma tabela
 */
async function dbListar(tabela) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.from(tabela).select('*');
  if (error) {
    console.error(`Erro ao listar ${tabela}:`, error);
    return [];
  }
  return data;
}

/**
 * Busca um registro por ID
 */
async function dbBuscarPorId(tabela, id) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(tabela).select('*').eq('id', id).single();
  if (error) {
    console.error(`Erro ao buscar registro ${id} em ${tabela}:`, error);
    return null;
  }
  return data;
}

/**
 * Insere um novo registro na tabela
 */
async function dbInserir(tabela, registro) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(tabela).insert([registro]).select().single();
  if (error) {
    console.error(`Erro ao inserir em ${tabela}:`, error);
    return null;
  }
  window.dispatchEvent(new CustomEvent('banco-atualizado'));
  return data;
}

/**
 * Atualiza um registro existente pelo ID
 */
async function dbAtualizar(tabela, id, dadosNovos) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(tabela).update(dadosNovos).eq('id', id).select().single();
  if (error) {
    console.error(`Erro ao atualizar ${id} em ${tabela}:`, error);
    return null;
  }
  window.dispatchEvent(new CustomEvent('banco-atualizado'));
  return data;
}

/**
 * Remove um registro pelo ID
 */
async function dbRemover(tabela, id) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
  if (error) {
    console.error(`Erro ao remover ${id} de ${tabela}:`, error);
    return false;
  }
  window.dispatchEvent(new CustomEvent('banco-atualizado'));
  return true;
}

/**
 * Assina atualizações do banco na tela
 */
function dbAoAtualizar(callback) {
  window.addEventListener('banco-atualizado', callback);
  return () => window.removeEventListener('banco-atualizado', callback);
}

/* Exposto globalmente para o resto do projeto */
window.supabaseClient = supabaseClient;
window.dbListar = dbListar;
window.dbBuscarPorId = dbBuscarPorId;
window.dbInserir = dbInserir;
window.dbAtualizar = dbAtualizar;
window.dbRemover = dbRemover;
window.dbAoAtualizar = dbAoAtualizar;

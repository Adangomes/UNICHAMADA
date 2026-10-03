/**
 * db.js — Camada de acesso a dados (Data Mapper)
 * Conecta o front-end ao banco de dados PostgreSQL hospedado no Supabase.
 */

// 1. Configuração do Supabase
const SUPABASE_URL = 'https://xultvypwxwyxhxfzwqdw.supabase.co';

// Chave 'anon' 'public' (pode ficar no front-end; a proteção é feita por RLS)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY';

// Inicializa o cliente Supabase
// ATENÇÃO: confira se esta linha é igual à do seu db.js original.
const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/**
 * Lista todos os registros de uma tabela
 */
async function dbListar(tabela) {
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.from(tabela).select('*');
  if (error) {
    console.error(`Erro ao listar ${tabela}:`, error.message || error);
    return [];
  }
  return data;
}

/**
 * Busca um registro pelo ID
 */
async function dbBuscarPorId(tabela, id) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(tabela).select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error(`Erro ao buscar registro ${id} em ${tabela}:`, error.message || error);
    return null;
  }
  return data;
}

/**
 * Insere um ou mais registros
 */
async function dbInserir(tabela, registro) {
  if (!supabaseClient) return null;

  // Clona os dados para tratar campos vazios sem alterar o formulário original
  const dados = Array.isArray(registro)
    ? registro.map(item => ({ ...item }))
    : { ...registro };

  // Remove o campo 'id' se estiver vazio/nulo/indefinido para o banco gerar o UUID automático
  const limparIdVazio = (obj) => {
    if (obj && (!obj.id || obj.id === '' || obj.id === 'null')) {
      delete obj.id;
    }
  };

  if (Array.isArray(dados)) {
    dados.forEach(limparIdVazio);
  } else {
    limparIdVazio(dados);
  }

  const payload = Array.isArray(dados) ? dados : [dados];

  const { data, error } = await supabaseClient
    .from(tabela)
    .insert(payload)
    .select();

  if (error) {
    console.error(`[Supabase] Erro ao inserir em ${tabela}:`, {
      mensagem: error.message,
      detalhes: error.details,
      dica: error.hint,
      codigo: error.code
    });
    return null;
  }

  window.dispatchEvent(new CustomEvent('banco-atualizado'));

  // Retorna o objeto inserido
  return Array.isArray(registro) ? data : (data && data.length > 0 ? data[0] : data);
}

/**
 * Atualiza um registro existente pelo ID
 */
async function dbAtualizar(tabela, id, dadosNovos) {
  if (!supabaseClient) return null;

  const dados = { ...dadosNovos };
  delete dados.id; // Impede alteração acidental do ID da linha

  const { data, error } = await supabaseClient
    .from(tabela)
    .update(dados)
    .eq('id', id)
    .select();

  if (error) {
    console.error(`Erro ao atualizar ${id} em ${tabela}:`, error.message || error);
    return null;
  }

  window.dispatchEvent(new CustomEvent('banco-atualizado'));
  return data && data.length > 0 ? data[0] : data;
}

/**
 * Remove um registro pelo ID
 */
async function dbRemover(tabela, id) {
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
  if (error) {
    console.error(`Erro ao remover ${id} de ${tabela}:`, error.message || error);
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

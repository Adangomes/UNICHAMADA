@@ -4,10 +4,8 @@
 * Conecta o front-end ao banco de dados PostgreSQL hospedado no Supabase.
 */

// 1. Configuração do Supabase (URL ajustada com o 'x')
// 1. Configuração do Supabase
const SUPABASE_URL = 'https://xultvypwxwyxhxfzwqdw.supabase.co';

// Cole aqui a chave 'anon' 'public' (aquela longa que começa com eyJ...)
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY';

// Inicializa o cliente Supabase
@@ -26,7 +24,7 @@
  if (!supabaseClient) return [];
  const { data, error } = await supabaseClient.from(tabela).select('*');
  if (error) {
    console.error(`Erro ao listar ${tabela}:`, error);
    console.error(`Erro ao listar ${tabela}:`, error.message || error);
    return [];
  }
  return data;
@@ -37,9 +35,9 @@
 */
async function dbBuscarPorId(tabela, id) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(tabela).select('*').eq('id', id).single();
  const { data, error } = await supabaseClient.from(tabela).select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error(`Erro ao buscar registro ${id} em ${tabela}:`, error);
    console.error(`Erro ao buscar registro ${id} em ${tabela}:`, error.message || error);
    return null;
  }
  return data;
@@ -50,27 +48,70 @@
 */
async function dbInserir(tabela, registro) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(tabela).insert([registro]).select().single();

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
    console.error(`Erro ao inserir em ${tabela}:`, error);
    console.error(`[Supabase 409] Erro ao inserir em ${tabela}:`, {
      mensagem: error.message,
      detalhes: error.details,
      dica: error.hint,
      codigo: error.code
    });
    return null;
  }

  window.dispatchEvent(new CustomEvent('banco-atualizado'));
  return data;

  // Retorna o objeto inserido
  return Array.isArray(registro) ? data : (data && data.length > 0 ? data[0] : data);
}

/**
 * Atualiza um registro existente pelo ID
 */
async function dbAtualizar(tabela, id, dadosNovos) {
  if (!supabaseClient) return null;
  const { data, error } = await supabaseClient.from(tabela).update(dadosNovos).eq('id', id).select().single();

  const dados = { ...dadosNovos };
  delete dados.id; // Impede alteração acidental do ID da linha

  const { data, error } = await supabaseClient
    .from(tabela)
    .update(dados)
    .eq('id', id)
    .select();

  if (error) {
    console.error(`Erro ao atualizar ${id} em ${tabela}:`, error);
    console.error(`Erro ao atualizar ${id} em ${tabela}:`, error.message || error);
    return null;
  }

  window.dispatchEvent(new CustomEvent('banco-atualizado'));
  return data;
  return data && data.length > 0 ? data[0] : data;
}

/**
@@ -80,26 +121,26 @@
  if (!supabaseClient) return false;
  const { error } = await supabaseClient.from(tabela).delete().eq('id', id);
  if (error) {
    console.error(`Erro ao remover ${id} de ${tabela}:`, error);
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

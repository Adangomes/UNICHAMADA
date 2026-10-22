/**
 * db.js - Conexão com Supabase
 * ------------------------------------------------------------------
 * A chave anon é pública e deve ser configurada em config.js. Nunca
 * coloque uma chave service_role neste arquivo ou no front-end.
 */

const SUPABASE_URL = window.UNICHAMADA_CONFIG?.supabaseUrl || '';
const SUPABASE_KEY = window.UNICHAMADA_CONFIG?.supabaseAnonKey || '';

function criarClienteSupabase() {
  if (!window.supabase) {
    console.error('SDK do Supabase não encontrado. Verifique o script carregado em index.html.');
    return null;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY || SUPABASE_KEY.includes('COLE_A_CHAVE')) {
    console.error('Supabase não configurado. Preencha js/data/config.js com URL e chave anon pública.');
    return null;
  }

  try {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  } catch (error) {
    console.error('Não foi possível inicializar o cliente Supabase:', error);
    return null;
  }
}

const supabaseClient = criarClienteSupabase();
const ouvintesBanco = new Set();
let canalBanco = null;
let contadorCanais = 0;

function notificarAtualizacaoBanco() {
  window.dispatchEvent(new CustomEvent('banco-atualizado'));
}

function exigirClienteSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase indisponível. Confira js/data/config.js e a conexão.');
  }
  return supabaseClient;
}

function notificarOuvintesRealtime() {
  ouvintesBanco.forEach((callback) => callback());
}

function garantirCanalRealtime() {
  if (!supabaseClient || canalBanco || ouvintesBanco.size === 0) return;

  canalBanco = supabaseClient
    .channel(`unichamada-db-${++contadorCanais}`)
    .on('postgres_changes', { event: '*', schema: 'public' }, notificarOuvintesRealtime)
    .subscribe((status) => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.error(`Falha na assinatura Realtime do Supabase: ${status}`);
      }
    });
}

async function dbListar(tabela) {
  const { data, error } = await exigirClienteSupabase().from(tabela).select('*');
  if (error) {
    console.error(`Erro ao listar ${tabela}:`, error);
    throw error;
  }
  return data || [];
}

async function dbBuscarPorId(tabela, id) {
  const { data, error } = await exigirClienteSupabase()
    .from(tabela)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error(`Erro ao buscar registro ${id} em ${tabela}:`, error);
    throw error;
  }
  return data;
}

async function dbInserir(tabela, registro) {
  const { data, error } = await exigirClienteSupabase()
    .from(tabela)
    .insert([registro])
    .select()
    .single();
  if (error) {
    console.error(`Erro ao inserir em ${tabela}:`, error);
    throw error;
  }
  notificarAtualizacaoBanco();
  return data;
}

async function dbAtualizar(tabela, id, dadosNovos) {
  const { data, error } = await exigirClienteSupabase()
    .from(tabela)
    .update(dadosNovos)
    .eq('id', id)
    .select()
    .maybeSingle();
  if (error) {
    console.error(`Erro ao atualizar ${id} em ${tabela}:`, error);
    throw error;
  }
  if (!data) {
    throw new Error(`Nenhum registro atualizado em ${tabela}. Verifique se existe e se há permissão.`);
  }
  notificarAtualizacaoBanco();
  return data;
}

async function dbRemover(tabela, id) {
  const { data, error } = await exigirClienteSupabase()
    .from(tabela)
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    console.error(`Erro ao remover ${id} de ${tabela}:`, error);
    throw error;
  }
  if (!data) {
    throw new Error(`Nenhum registro removido de ${tabela}. Verifique se existe e se há permissão.`);
  }
  notificarAtualizacaoBanco();
  return true;
}

function dbAoAtualizar(callback) {
  window.addEventListener('banco-atualizado', callback);
  ouvintesBanco.add(callback);
  garantirCanalRealtime();

  return () => {
    window.removeEventListener('banco-atualizado', callback);
    ouvintesBanco.delete(callback);
    if (ouvintesBanco.size === 0 && canalBanco) {
      supabaseClient.removeChannel(canalBanco);
      canalBanco = null;
    }
  };
}

function dbConfiguracaoValida() {
  return Boolean(supabaseClient);
}

window.supabaseClient = supabaseClient;
window.dbListar = dbListar;
window.dbBuscarPorId = dbBuscarPorId;
window.dbInserir = dbInserir;
window.dbAtualizar = dbAtualizar;
window.dbRemover = dbRemover;
window.dbAoAtualizar = dbAoAtualizar;
window.dbConfiguracaoValida = dbConfiguracaoValida;

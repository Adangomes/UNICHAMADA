// Importa a função de criação de cliente do SDK oficial do Supabase
import { createClient } from '@supabase/supabase-js';

// Recupera a URL do projeto Supabase armazenada nas variáveis de ambiente do Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

// Recupera a chave pública anônima (anon key) do Supabase nas variáveis de ambiente
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Bloco de segurança: valida se as chaves essenciais foram fornecidas no arquivo .env
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("⚠️ As chaves do Supabase não foram configuradas nas variáveis de ambiente!");
}

// Cria e exporta a instância pronta do cliente Supabase para comunicação com o banco de dados
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
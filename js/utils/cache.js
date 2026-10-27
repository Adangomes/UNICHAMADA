/**
 * js/utils/cache.js
 * Gerenciador de Cache Object em memória e sessionStorage para o Supabase
 */
window.UNICHAMADA_CACHE = {
  store: new Map(),

  // Define um valor no cache com tempo de vida em segundos (padrão: 5 minutos)
  set(key, data, ttlSeconds = 300) {
    const expiry = Date.now() + ttlSeconds * 1000;
    const item = { data, expiry };
    
    // Salva na memória RAM da aplicação
    this.store.set(key, item);
    
    // Opcional: Salva também no sessionStorage para persistir se trocar de aba/recarregar
    try {
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (e) {
      console.warn("Não foi possível salvar no sessionStorage", e);
    }
  },

  // Busca um valor do cache se ainda estiver válido
  get(key) {
    let item = this.store.get(key);

    // Se não estiver na memória RAM, tenta buscar do sessionStorage
    if (!item) {
      try {
        const cachedStr = sessionStorage.getItem(`cache_${key}`);
        if (cachedStr) {
          item = JSON.parse(cachedStr);
          this.store.set(key, item); // Restaura na RAM
        }
      } catch (e) {
        console.warn("Erro ao ler do sessionStorage", e);
      }
    }

    if (!item) return null;

    // Verifica se o cache expirou
    if (Date.now() > item.expiry) {
      this.remove(key);
      return null;
    }

    return item.data;
  },

  // Remove um item do cache
  remove(key) {
    this.store.delete(key);
    sessionStorage.removeItem(`cache_${key}`);
  },

  // Limpa todo o cache
  clear() {
    this.store.clear();
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('cache_')) sessionStorage.removeItem(key);
    });
  }
};

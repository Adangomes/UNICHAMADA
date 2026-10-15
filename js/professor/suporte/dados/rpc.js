/**
 * dados/rpc.js — a chamada genérica ao Supabase. As tabelas ti_ são fechadas para o site; professor e
 * coordenador só falam com o banco pelas funções (RPC) de banco-de-dados/suporte/.
 * Os arquivos chamados.js e comentarios.js (nesta pasta) usam esta função.
 */
window.Suporte = window.Suporte || {};
window.Suporte.dados = window.Suporte.dados || {};

(function () {
  const S = window.Suporte;

  /** Traduz o erro do Supabase para uma frase que a pessoa entende. */
  function traduzir(erro) {
    const e = erro || {};
    if (e.code === 'PGRST202' || e.code === '42883') {
      return 'O Suporte ainda não foi instalado no banco de dados. Avise a coordenação de TI.';
    }
    return e.message || 'Não foi possível falar com o servidor agora. Tente de novo em instantes.';
  }

  /**
   * @param {string} nome        nome da função no banco (ex.: 'ti_abrir_chamado')
   * @param {Object} parametros  parâmetros nomeados (p_tipo, p_id...)
   * @returns {Promise<*>} o que a função devolve
   */
  S.dados.rpc = async function (nome, parametros) {
    const cfg = S.config || {};

    // opção B: cliente supabase-js que o site já tem
    const cliente = typeof cfg.cliente === 'function' ? cfg.cliente() : cfg.cliente;
    if (cliente && typeof cliente.rpc === 'function') {
      const { data, error } = await cliente.rpc(nome, parametros);
      if (error) throw new Error(traduzir(error));
      return data;
    }

    // opção A: chamada direta pela URL e chave pública
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error('A aba Suporte ainda não está ligada ao Supabase. Preencha o config.js da pasta suporte/.');
    }
    let resposta;
    try {
      resposta = await fetch(String(cfg.supabaseUrl).replace(/\/+$/, '') + '/rest/v1/rpc/' + nome, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.supabaseAnonKey, Authorization: 'Bearer ' + cfg.supabaseAnonKey },
        body: JSON.stringify(parametros || {})
      });
    } catch (e) {
      throw new Error(traduzir({}));
    }
    let corpo = null;
    try { corpo = await resposta.json(); } catch (e) { /* resposta sem JSON */ }
    if (!resposta.ok) throw new Error(traduzir(corpo));
    return corpo;
  };
})();

/** comentarios.js — tabela ti_chamados_comentarios */
window.TI = window.TI || {};

TI.dados.comentarios = {
  async listarDoChamado(chamadoId) {
    const d = TI.dados.tratar(await TI.db.from('ti_chamados_comentarios').select('*').eq('chamado_id', chamadoId).order('criado_em', { ascending: true }));
    
    // Garante que tanto 'texto', 'mensagem' quanto 'conteudo' existam em cada objeto retornado
    return (d || []).map(item => ({
      ...item,
      texto: item.texto || item.mensagem || item.conteudo,
      mensagem: item.mensagem || item.texto || item.conteudo,
      conteudo: item.conteudo || item.texto || item.mensagem
    }));
  },

  async criar({ chamado_id, texto, interno }) {
    const f = TI.sessao.funcionario;
    return TI.dados.tratar(await TI.db.from('ti_chamados_comentarios').insert({
      chamado_id, 
      texto, 
      mensagem: texto, // Grava ambos para compatibilidade total
      interno: !!interno,
      autor_tipo: 'ti', 
      autor_id: f.id, 
      autor_nome: f.nome
    }).select().single());
  }
};

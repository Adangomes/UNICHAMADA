/* =========================================================
   UniChamada - Chat: excluir mensagem e excluir conversa
   - Mensagem: some do banco (conteúdo e arquivo), fica "Mensagem apagada" para os dois.
   - Conversa: apagada por inteiro do banco (mensagens + arquivos), para os dois.
   - Menu: botão direito (PC) ou segurar (celular) na mensagem / no contato da lista.
   Estilo: css/chat/config/excluir.css
   ========================================================= */
(function () {
  'use strict';
  if (window.ChatExcluir) return;   // a pasta irmã tem uma cópia idêntica deste arquivo

  const TEXTO_APAGADA = 'Mensagem apagada';

  // Janela de confirmação (Promise<boolean>)
  function confirmar({ titulo, texto, confirmar: rotuloSim = 'Sim, apagar', cancelar: rotuloNao = 'Cancelar' }) {
    return new Promise((resolve) => {
      const fundo = document.createElement('div');
      fundo.className = 'chat-confirm-fundo';
      const caixa = document.createElement('div');
      caixa.className = 'chat-confirm-caixa';
      caixa.setAttribute('role', 'alertdialog');

      const h = document.createElement('h3'); h.textContent = titulo;
      const p = document.createElement('p'); p.textContent = texto;
      const acoes = document.createElement('div'); acoes.className = 'chat-confirm-acoes';
      const nao = document.createElement('button'); nao.type = 'button'; nao.className = 'chat-confirm-nao'; nao.textContent = rotuloNao;
      const sim = document.createElement('button'); sim.type = 'button'; sim.className = 'chat-confirm-sim'; sim.textContent = rotuloSim;
      acoes.append(nao, sim);
      caixa.append(h, p, acoes);
      fundo.appendChild(caixa);
      document.body.appendChild(fundo);
      nao.focus();

      function fechar(resposta) {
        document.removeEventListener('keydown', teclas);
        fundo.remove();
        resolve(resposta);
      }
      function teclas(e) { if (e.key === 'Escape') fechar(false); }
      document.addEventListener('keydown', teclas);
      nao.addEventListener('click', () => fechar(false));
      sim.addEventListener('click', () => fechar(true));
      fundo.addEventListener('click', (e) => { if (e.target === fundo) fechar(false); });
    });
  }

  function podeApagarMensagem(msg, papel) {
    return !!msg && !msg.apagada && msg.remetente_tipo === papel;
  }

  function itemMenuMensagem(msg, papel, aoEscolher) {
    return podeApagarMensagem(msg, papel)
      ? { icone: '🗑️', rotulo: 'Excluir', perigo: true, acao: aoEscolher }
      : null;
  }

  function itemMenuConversa(contato, aoEscolher) {
    return contato && contato.conversa
      ? { icone: '🗑️', rotulo: 'Apagar conversa', perigo: true, acao: aoEscolher }
      : null;
  }

  // Pergunta e apaga. Resolve com a mensagem atualizada (apagada) ou null.
  async function apagarMensagem(msg, papel) {
    const sim = await confirmar({
      titulo: 'Apagar mensagem?',
      texto: 'Ela será apagada para os dois. Não dá para desfazer.'
    });
    if (!sim) return null;
    return window.ChatDados.apagarMensagem(msg, papel);
  }

  // Pergunta e apaga a conversa toda. Resolve com true/false.
  async function apagarConversa(contato) {
    const sim = await confirmar({
      titulo: 'Apagar conversa?',
      texto: `Todas as mensagens e arquivos da conversa com ${contato.nome} serão apagados para vocês dois. Não dá para desfazer.`
    });
    if (!sim) return false;
    return window.ChatDados.apagarConversa(contato.conversa.id);
  }

  window.ChatExcluir = {
    TEXTO_APAGADA, confirmar, podeApagarMensagem,
    itemMenuMensagem, itemMenuConversa, apagarMensagem, apagarConversa
  };
})();

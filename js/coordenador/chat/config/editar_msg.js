/* =========================================================
   UniChamada - Chat: editar mensagem enviada
   - Aparece como "Editar" no menu (botão direito / segurar) das SUAS mensagens de texto.
   - Edição direta no balão (Enter salva, Esc cancela).
   - Grava no banco (chat_mensagens.conteudo + editada_em); o outro lado vê "editada".
   Estilo: css/chat/config/editar_msg.css
   ========================================================= */
(function () {
  'use strict';
  if (window.ChatEditar) return;   // a pasta irmã tem uma cópia idêntica deste arquivo

  const CFG = {
    LIMITE_CARACTERES: 2000,
    LIMITE_MINUTOS: 0            // 0 = pode editar a qualquer momento; ex.: 15 = só até 15 min depois
  };

  // eu = { id, papel }
  function podeEditar(msg, eu) {
    if (!msg || msg.apagada || msg.tipo !== 'texto' || !window.ChatDados.ehMinha(msg, eu)) return false;
    if (CFG.LIMITE_MINUTOS > 0) {
      const minutos = (Date.now() - new Date(msg.created_at).getTime()) / 60000;
      if (minutos > CFG.LIMITE_MINUTOS) return false;
    }
    return true;
  }

  // Item para o menu de contexto (ou null se não puder editar)
  function itemMenu(msg, eu, aoEscolher) {
    return podeEditar(msg, eu) ? { icone: '', rotulo: 'Editar', acao: aoEscolher } : null;
  }

  // Abre a edição dentro do balão. Resolve com a mensagem atualizada, ou null se cancelou.
  function iniciar(balao, msg, eu) {
    return new Promise((resolve) => {
      const guardado = document.createDocumentFragment();
      while (balao.firstChild) guardado.appendChild(balao.firstChild);
      balao.classList.add('editando');

      const campo = document.createElement('textarea');
      campo.className = 'chat-editar-campo';
      campo.value = msg.conteudo;
      campo.maxLength = CFG.LIMITE_CARACTERES;
      campo.rows = 1;

      const erro = document.createElement('div');
      erro.className = 'chat-editar-erro';

      const acoes = document.createElement('div');
      acoes.className = 'chat-editar-acoes';
      const cancelar = document.createElement('button');
      cancelar.type = 'button'; cancelar.className = 'chat-editar-cancelar'; cancelar.textContent = 'Cancelar';
      const salvar = document.createElement('button');
      salvar.type = 'button'; salvar.className = 'chat-editar-salvar'; salvar.textContent = 'Salvar';
      acoes.append(cancelar, salvar);

      balao.append(campo, erro, acoes);

      const ajustarAltura = () => { campo.style.height = 'auto'; campo.style.height = campo.scrollHeight + 'px'; };
      campo.addEventListener('input', ajustarAltura);

      function restaurar() {
        balao.classList.remove('editando');
        balao.textContent = '';
        balao.appendChild(guardado);
      }

      function sair(resultado) {
        if (!resultado) restaurar();   // se salvou, a tela troca o balão pela versão nova
        resolve(resultado);
      }

      async function gravar() {
        const novo = campo.value.trim();
        erro.textContent = '';
        if (!novo) { erro.textContent = 'A mensagem não pode ficar vazia.'; campo.focus(); return; }
        if (novo === msg.conteudo) return sair(null);
        salvar.disabled = true; cancelar.disabled = true; salvar.textContent = 'Salvando...';
        const atualizada = await window.ChatDados.editarMensagem(msg.id, eu, novo);
        if (!atualizada) {
          salvar.disabled = false; cancelar.disabled = false; salvar.textContent = 'Salvar';
          erro.textContent = 'Não foi possível salvar. Tente de novo.';
          return;
        }
        sair(atualizada);
      }

      cancelar.addEventListener('click', () => sair(null));
      salvar.addEventListener('click', gravar);
      campo.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); sair(null); }
        else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gravar(); }
      });

      ajustarAltura();
      campo.focus();
      campo.setSelectionRange(campo.value.length, campo.value.length);
    });
  }

  window.ChatEditar = { CFG, podeEditar, itemMenu, iniciar };
})();

/**
 * primeiro-acesso.js — o funcionário novo (ou quem pediu "esqueci minha senha") define a senha.
 * Chega aqui pelo link do e-mail. Usa a mesma moldura visual do login.
 */
window.TI = window.TI || {};

TI.telas.primeiroAcesso = {
  /** @param {HTMLElement} raiz  @param {{aoConcluir:Function}} opcoes */
  render(raiz, opcoes) {
    const { el } = TI.dom;

    const erro = el('div', { class: 'ti-login-erro', role: 'alert' });
    erro.hidden = true;
    const mostrarErro = (t) => { erro.textContent = t; erro.hidden = !t; };

    const nova = el('input', { class: 'ti-lg-input', type: 'password', autocomplete: 'new-password', placeholder: 'Nova senha (mínimo 8 caracteres)', 'aria-label': 'Nova senha' });
    const confirma = el('input', { class: 'ti-lg-input', type: 'password', autocomplete: 'new-password', placeholder: 'Repita a senha', 'aria-label': 'Confirmar senha' });
    const botao = el('button', { class: 'ti-lg-botao', type: 'submit' }, ['Salvar senha e entrar']);

    const form = el('form', { class: 'ti-lg-form', novalidate: true, onSubmit: async (e) => {
      e.preventDefault();
      mostrarErro('');
      if (nova.value.length < 8) { mostrarErro('A senha precisa ter pelo menos 8 caracteres.'); return; }
      if (nova.value !== confirma.value) { mostrarErro('As duas senhas não são iguais.'); return; }
      botao.disabled = true;
      try {
        await TI.sessao.definirSenha(nova.value);
        await opcoes.aoConcluir();
      } catch (err) {
        mostrarErro(err.message);
        botao.disabled = false;
      }
    } }, [
      erro,
      el('div', { class: 'ti-lg-campo' }, [nova]),
      el('div', { class: 'ti-lg-campo' }, [confirma]),
      botao
    ]);

    raiz.replaceChildren(TI.moldura.montar({
      titulo: 'Bem-vindo(a)!',
      subtitulo: 'Crie a sua senha para começar',
      conteudo: [form]
    }));
    nova.focus();
  }
};

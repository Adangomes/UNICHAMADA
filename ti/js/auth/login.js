/**
 * login.js — tela de login do TI (e-mail + senha). Diferente do login de professor e coordenador.
 * O visual (painel animado, cartão) vem de moldura.js; os textos, de TI.K.login.
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes) {
    const { el } = TI.dom;
    const { ui } = TI;
    const L = TI.K.login;

    const erro = el('div', { class: 'ti-login-erro', role: 'alert' }, [opcoes.mensagem || '']);
    erro.hidden = !opcoes.mensagem;
    const mostrarErro = (texto) => { erro.textContent = texto; erro.hidden = !texto; };

    const email = el('input', { class: 'ti-lg-input', type: 'email', autocomplete: 'username', placeholder: 'E-mail', 'aria-label': 'E-mail' });
    const senha = el('input', { class: 'ti-lg-input', type: 'password', autocomplete: 'current-password', placeholder: 'Senha', 'aria-label': 'Senha' });
    const olho = el('button', { class: 'ti-lg-olho', type: 'button', 'aria-label': 'Mostrar senha', 'aria-pressed': 'false', onClick: () => {
      const mostrar = senha.type === 'password';
      senha.type = mostrar ? 'text' : 'password';
      olho.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      olho.setAttribute('aria-pressed', String(mostrar));
      olho.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    } }, ['Mostrar']);
    const botao = el('button', { class: 'ti-lg-botao', type: 'submit' }, ['Entrar']);

    const esqueci = el('button', { class: 'ti-lg-link', type: 'button', onClick: async () => {
      mostrarErro('');
      if (!email.value.trim()) { mostrarErro('Digite o e-mail acima e clique de novo em "Esqueci minha senha".'); return; }
      try {
        await TI.sessao.enviarRedefinicao(email.value);
        ui.toast('Se o e-mail estiver cadastrado, você receberá o link para criar uma nova senha.');
      } catch (err) { mostrarErro(err.message); }
    } }, ['Esqueci minha senha']);

    const form = el('form', { class: 'ti-lg-form', novalidate: true, onSubmit: async (e) => {
      e.preventDefault();
      mostrarErro('');
      if (!email.value.trim() || !senha.value) { mostrarErro('Preencha o e-mail e a senha.'); return; }
      botao.disabled = true;
      botao.textContent = 'Entrando…';
      try {
        await TI.sessao.entrar(email.value, senha.value);
        await opcoes.aoEntrar();
      } catch (err) {
        mostrarErro(err.message);
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    } }, [
      erro,
      el('div', { class: 'ti-lg-campo' }, [email]),
      el('div', { class: 'ti-lg-campo' }, [senha, olho]),
      el('div', { class: 'ti-lg-linha-link' }, [esqueci]),
      botao
    ]);

    raiz.replaceChildren(TI.moldura.montar({
      titulo: L.titulo,
      subtitulo: L.subtitulo,
      conteudo: [form],
      rodape: [el('p', { class: 'ti-lg-ajuda' }, [L.ajuda])]
    }));
    email.focus();
  }
};

/**
 * login.js — tela de login do TI (E-mail + Senha para funcionários e Coordenador).
 * O visual (painel animado, cartão) vem de moldura.js; os textos, de TI.K.login.
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes) {
    const { el } = TI.dom;
    const L = TI.K.login;

    const erro = el('div', { class: 'ti-login-erro', role: 'alert' }, [opcoes.mensagem || '']);
    erro.hidden = !opcoes.mensagem;
    const mostrarErro = (texto) => { erro.textContent = texto; erro.hidden = !texto; };

    const email = el('input', { class: 'ti-lg-input', type: 'email', autocomplete: 'username', placeholder: 'E-mail profissional', 'aria-label': 'E-mail' });
    const senha = el('input', { class: 'ti-lg-input', type: 'password', autocomplete: 'current-password', placeholder: 'Senha de acesso', 'aria-label': 'Senha' });
    
    const olho = el('button', { class: 'ti-lg-olho', type: 'button', 'aria-label': 'Mostrar senha', 'aria-pressed': 'false', onClick: () => {
      const mostrar = senha.type === 'password';
      senha.type = mostrar ? 'text' : 'password';
      olho.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      olho.setAttribute('aria-pressed', String(mostrar));
      olho.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    } }, ['Mostrar']);

    const botao = el('button', { class: 'ti-lg-botao', type: 'submit' }, ['Entrar']);

    const form = el('form', { class: 'ti-lg-form', novalidate: true, onSubmit: async (e) => {
      e.preventDefault();
      mostrarErro('');
      const valEmail = email.value.trim().toLowerCase();
      const valSenha = senha.value.trim();

      if (!valEmail || !valSenha) { 
        mostrarErro('Preencha o e-mail e a senha.'); 
        return; 
      }

      botao.disabled = true;
      botao.textContent = 'Entrando…';

      try {
        // 1. Tenta autenticar como Coordenador (via Supabase Auth - E-mail e Senha)
        try {
          await TI.sessao.entrar(valEmail, valSenha);
          await opcoes.aoEntrar();
          return;
        } catch (authErr) {
          // Se falhou no Auth, tenta autenticar o funcionário comum cadastrado na tabela ti_funcionarios
        }

        // 2. Valida se é um funcionário cadastrado na tabela ti_funcionarios via E-mail + Senha
        const resp = await TI.db
          .from('ti_funcionarios')
          .select('*')
          .eq('email', valEmail)
          .eq('senha', valSenha)
          .eq('ativo', true)
          .maybeSingle();

        const funcionario = TI.dados.tratar(resp);

        if (!funcionario) {
          throw new Error('E-mail ou senha incorretos (ou conta inativa).');
        }

        // Define o funcionário na sessão local ativa
        TI.sessao.funcionario = funcionario;
        await opcoes.aoEntrar();

      } catch (err) {
        mostrarErro(err.message || 'Erro ao efetuar login.');
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    } }, [
      erro,
      el('div', { class: 'ti-lg-campo' }, [email]),
      el('div', { class: 'ti-lg-campo' }, [senha, olho]),
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

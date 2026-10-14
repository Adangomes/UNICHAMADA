/**
 * js/login/login.js
 * Componente da Tela de Login do TI (Mantido exatamente no padrão original)
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes) {
    const { el } = TI.dom;
    const L = TI.K?.login || { titulo: 'Painel TI', subtitulo: 'Acesso Geral', ajuda: 'Precisa de ajuda? Contacte a coordenação.' };

    const erro = el('div', { class: 'ti-login-erro aviso-login', role: 'alert' }, [opcoes.mensagem || '']);
    if (!opcoes.mensagem) erro.classList.add('oculto');

    const mostrarErro = (texto) => { 
      erro.textContent = texto; 
      if (texto) erro.classList.remove('oculto');
      else erro.classList.add('oculto');
    };

    const email = el('input', { class: 'ti-lg-input', type: 'email', autocomplete: 'username', placeholder: 'E-mail profissional', 'aria-label': 'E-mail' });
    const senha = el('input', { class: 'ti-lg-input', type: 'password', autocomplete: 'current-password', placeholder: 'Senha de acesso', 'aria-label': 'Senha' });
    
    const olho = el('button', { class: 'ti-lg-olho', type: 'button', 'aria-label': 'Mostrar senha', 'aria-pressed': 'false', onClick: () => {
      const mostrar = senha.type === 'password';
      senha.type = mostrar ? 'text' : 'password';
      olho.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      olho.setAttribute('aria-pressed', String(mostrar));
    } }, ['Mostrar']);

    const botao = el('button', { class: 'ti-lg-botao btn-primario', type: 'submit' }, ['Entrar']);

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
        let logouComoCoordenador = false;

        // 1. Tenta autenticar primeiro como Coordenador no Supabase Auth
        try {
          await TI.sessao.entrar(valEmail, valSenha);
          logouComoCoordenador = true;
        } catch (authErr) {
          // Se falhou no Auth, prossegue para verificar se é funcionário na tabela
        }

        if (logouComoCoordenador) {
          await opcoes.aoEntrar();
          return;
        }

        // 2. Valida se é um funcionário cadastrado chamando a função segura RPC no Supabase
        const { data: funcionarios, error: dbErr } = await TI.db
          .rpc('verificar_login_funcionario', {
            p_email: valEmail,
            p_senha: valSenha
          });

        const funcionario = funcionarios && funcionarios.length > 0 ? funcionarios[0] : null;

        if (dbErr || !funcionario) {
          throw new Error('E-mail ou senha incorretos (ou conta inativa).');
        }

        // Define o funcionário na sessão local
        TI.sessao.funcionario = funcionario;
        await opcoes.aoEntrar();

      } catch (err) {
        mostrarErro(err.message || 'Erro ao efetuar login.');
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    } }, [
      erro,
      el('div', { class: 'ti-lg-campo campo' }, [email]),
      el('div', { class: 'ti-lg-campo campo', style: 'position: relative;' }, [senha, olho]),
      botao
    ]);

    // Caso o objeto moldura exista no teu projeto, usa-o; senão, desenha o HTML limpo padrão
    if (TI.moldura && typeof TI.moldura.montar === 'function') {
      raiz.replaceChildren(TI.moldura.montar({
        titulo: L.titulo,
        subtitulo: L.subtitulo,
        conteudo: [form],
        rodape: [el('p', { class: 'ti-lg-ajuda' }, [L.ajuda])]
      }));
    } else {
      // Fallback direto limpo
      const wrapper = el('div', { id: 'tela-login' }, [
        el('div', { class: 'login-wrapper' }, [
          el('div', { class: 'carteirinha-login' }, [
            el('div', { class: 'carteirinha-topo' }, [
              el('span', { class: 'selo' }, ['Painel TI']),
              el('h1', {}, [L.titulo])
            ]),
            el('div', { class: 'carteirinha-corpo' }, [
              el('p', { class: 'instrucao' }, [L.subtitulo]),
              form
            ])
          ])
        ])
      ]);
      raiz.replaceChildren(wrapper);
    }

    email.focus();
  }
};

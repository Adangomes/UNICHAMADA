/**
 * js/login/login.js
 * Componente da Tela de Login do TI (Com ícone de olho integrado e padrão Split Screen)
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes) {
    const { el } = TI.dom;
    const L = TI.K?.login || { 
      titulo: 'Painel TI', 
      subtitulo: 'Informe suas credenciais para acessar o painel.', 
      ajuda: 'Precisa de ajuda? Contacte a coordenação.' 
    };

    const aviso = el('div', { class: 'aviso-login ' + (opcoes.mensagem ? '' : 'oculto'), role: 'alert' }, [opcoes.mensagem || '']);
    const mostrarErro = (texto) => {
      aviso.textContent = texto;
      if (texto) {
        aviso.classList.remove('oculto');
      } else {
        aviso.classList.add('oculto');
      }
    };

    const email = el('input', { 
      id: 'input-email',
      name: 'email',
      type: 'email', 
      autocomplete: 'username', 
      placeholder: 'seu.email@unichamada.edu.br', 
      required: true 
    });

    const senha = el('input', { 
      id: 'input-senha',
      name: 'senha',
      type: 'password', 
      autocomplete: 'current-password', 
      placeholder: '••••••••', 
      required: true 
    });
    
    // Ícones SVG para o olho (Mostrar / Ocultar)
    const iconeOlhoFechado = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
    const iconeOlhoAberto = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

    const btnOlho = el('button', { 
      type: 'button', 
      class: 'btn-olho-senha',
      'aria-label': 'Mostrar senha',
      innerHTML: iconeOlhoFechado,
      onClick: () => {
        const mostrar = senha.type === 'password';
        senha.type = mostrar ? 'text' : 'password';
        btnOlho.innerHTML = mostrar ? iconeOlhoAberto : iconeOlhoFechado;
      } 
    });

    const botao = el('button', { type: 'submit', class: 'btn-primario' }, ['Entrar']);

    const form = el('form', { 
      id: 'form-login', 
      novalidate: true, 
      onSubmit: async (e) => {
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

          try {
            await TI.sessao.entrar(valEmail, valSenha);
            logouComoCoordenador = true;
          } catch (authErr) {
            // Ignora erro do Auth e tenta RPC
          }

          if (logouComoCoordenador) {
            await opcoes.aoEntrar();
            return;
          }

          const { data: funcionarios, error: dbErr } = await TI.db
            .rpc('verificar_login_funcionario', {
              p_email: valEmail,
              p_senha: valSenha
            });

          const funcionario = funcionarios && funcionarios.length > 0 ? funcionarios[0] : null;

          if (dbErr || !funcionario) {
            throw new Error('E-mail ou incorretos (ou conta inativa).');
          }

          TI.sessao.funcionario = funcionario;
          await opcoes.aoEntrar();

        } catch (err) {
          mostrarErro(err.message || 'Erro ao efetuar login.');
          botao.disabled = false;
          botao.textContent = 'Entrar';
        }
      } 
    }, [
      el('div', { class: 'campo' }, [
        el('label', { for: 'input-email' }, ['E-mail']),
        email
      ]),
      el('div', { class: 'campo' }, [
        el('label', { for: 'input-senha' }, ['Senha']),
        senha,
        btnOlho
      ]),
      botao,
      aviso
    ]);

    const estruturaHTML = el('div', { id: 'tela-login' }, [
      el('div', { class: 'login-wrapper' }, [
        el('div', { class: 'login-banner' }, [
          el('div', { class: 'arco-decorativo arco-topo' }),
          el('div', { class: 'login-brand' }, [
            el('h1', { class: 'logo-uni' }, ['UNI']),
            el('span', { class: 'logo-sub' }, ['CHAMADAS'])
          ]),
          el('div', { class: 'arco-decorativo arco-base' })
        ]),
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

    raiz.replaceChildren(estruturaHTML);
    email.focus();
  }
};

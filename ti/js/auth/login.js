/**
 * login.js — tela de login do TI (Coordenação via Auth, Funcionários via tabela ti_funcionarios).
 * Utiliza o visual Split Screen idêntico ao restante do sistema UniChamadas.
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes) {
    const { el } = TI.dom;

    // Elemento de aviso/erro
    const aviso = el('div', { class: 'aviso-login ' + (opcoes.mensagem ? '' : 'oculto'), role: 'alert' }, [opcoes.mensagem || '']);
    const mostrarAviso = (texto) => {
      aviso.textContent = texto;
      if (texto) {
        aviso.classList.remove('oculto');
      } else {
        aviso.classList.add('oculto');
      }
    };

    // Campos do formulário (E-mail e Senha exigidos pela lógica de TI)
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

    const botao = el('button', { type: 'submit', class: 'btn-primario' }, ['Entrar']);

    // Formulário com submissão tratada via lógica de TI
    const form = el('form', { 
      id: 'form-login', 
      novalidate: true, 
      onSubmit: async (e) => {
        e.preventDefault();
        mostrarAviso('');
        const valEmail = email.value.trim().toLowerCase();
        const valSenha = senha.value.trim();

        if (!valEmail || !valSenha) { 
          mostrarAviso('Informe o e-mail e a senha de acesso.'); 
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

          // 2. Valida se é um funcionário cadastrado chamando a função RPC no Supabase
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
          mostrarAviso(err.message || 'Erro ao efetuar login.');
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
        senha
      ]),
      botao,
      aviso
    ]);

    // Montagem exata da estrutura Split Screen visual ("UNI CHAMADAS")
    const wrapper = el('div', { id: 'tela-login' }, [
      el('div', { class: 'login-wrapper' }, [
        
        // Lado Esquerdo: Banner animado com os arcos e marca
        el('div', { class: 'login-banner' }, [
          el('div', { class: 'arco-decorativo arco-topo' }),
          el('div', { class: 'login-brand' }, [
            el('h1', { class: 'logo-uni' }, ['UNI']),
            el('span', { class: 'logo-sub' }, ['CHAMADAS'])
          ]),
          el('div', { class: 'arco-decorativo arco-base' })
        ]),

        // Lado Direito: Cartão de Acesso ("Painel TI")
        el('div', { class: 'carteirinha-login' }, [
          el('div', { class: 'carteirinha-topo' }, [
            el('span', { class: 'selo' }, ['Painel TI']),
            el('h1', {}, [''])
          ]),
          el('div', { class: 'carteirinha-corpo' }, [
            el('p', { class: 'instrucao' }, ['']),
            form
          ])
        ])

      ])
    ]);

    raiz.replaceChildren(wrapper);
    email.focus();
  }
};

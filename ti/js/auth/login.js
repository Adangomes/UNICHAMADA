/**
 * login.js — tela de login do TI (Coordenação via Auth, Funcionários via tabela ti_funcionarios).
 * Visual idêntico ao login padrão do UniChamada.
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes) {
    const { el } = TI.dom;

    // Elemento de erro/alerta
    const erro = el('div', { class: 'aviso-login ' + (opcoes.mensagem ? '' : 'oculto'), role: 'alert' }, [opcoes.mensagem || '']);
    const mostrarErro = (texto) => {
      erro.textContent = texto;
      if (texto) {
        erro.classList.remove('oculto');
      } else {
        erro.classList.add('oculto');
      }
    };

    // Campos do formulário
    const email = el('input', { 
      id: 'input-email',
      type: 'email', 
      autocomplete: 'username', 
      placeholder: 'seu.email@unichamada.edu.br', 
      required: true 
    });

    const senha = el('input', { 
      id: 'input-senha',
      type: 'password', 
      autocomplete: 'current-password', 
      placeholder: '••••••••', 
      required: true
    });

    const olho = el('button', { 
      type: 'button', 
      class: 'btn-mostrar-senha',
      style: 'background: none; border: none; font-size: 0.85rem; color: #1b313a; cursor: pointer; font-weight: 600; padding: 0 4px;',
      onClick: () => {
        const mostrar = senha.type === 'password';
        senha.type = mostrar ? 'text' : 'password';
        olho.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      } 
    }, ['Mostrar']);

    // Agrupando o campo de senha com o botão "Mostrar" dentro do wrapper para o CSS alinhar
    const wrapperSenha = el('div', { style: 'display: flex; align-items: center; position: relative;' }, [
      senha,
      el('div', { style: 'position: absolute; right: 12px;' }, [olho])
    ]);

    const botao = el('button', { type: 'submit', class: 'btn-primario' }, ['Entrar']);

    // Formulário
    const form = el('form', { 
      id: 'form-login', 
      novalidate: true, 
      onSubmit: async (e) => {
        e.preventDefault();
        mostrarErro('');
        const valEmail = email.value.trim().toLowerCase();
        const valSenha = senha.value.trim();

        if (!valEmail || !valSenha) { 
          mostrarErro('Informe o e-mail e a senha de acesso.'); 
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

          // 2. Valida se é um funcionário cadastrado chamando a RPC no Supabase
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
      } 
    }, [
      el('div', { class: 'campo' }, [
        el('label', { for: 'input-email' }, ['E-mail']),
        email
      ]),
      el('div', { class: 'campo' }, [
        el('label', { for: 'input-senha' }, ['Senha']),
        wrapperSenha
      ]),
      botao
    ]);

    // Montagem da Estrutura Split Screen alinhada com o CSS global de login
    const estruturaHTML = el('div', { id: 'tela-login' }, [
      el('div', { class: 'login-wrapper' }, [
        
        // LADO ESQUERDO: BANNER E MARCA COM ANIMAÇÃO ROTATIVA
        el('div', { class: 'login-banner' }, [
          el('div', { class: 'arco-decorativo arco-topo' }),
          el('div', { class: 'login-brand' }, [
            el('h1', { class: 'logo-uni' }, ['UNI']),
            el('span', { class: 'logo-sub' }, ['CHAMADAS'])
          ]),
          el('div', { class: 'arco-decorativo arco-base' })
        ]),

        // LADO DIREITO: CARTEIRINHA DE ACESSO TI
        el('div', { class: 'carteirinha-login' }, [
          el('div', { class: 'carteirinha-topo' }, [
            el('span', { class: 'selo' }, ['Painel TI']),
            el('h1', {}, ['Acesso Geral'])
          ]),
          el('div', { class: 'carteirinha-corpo' }, [
            el('p', { class: 'instrucao' }, ['Credenciais para equipe técnica e coordenação.']),
            form,
            erro
          ])
        ])

      ])
    ]);

    raiz.replaceChildren(estruturaHTML);
    email.focus();
  }
};

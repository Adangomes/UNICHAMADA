/**
 * js/login/login.js
 * Componente da Tela de Login do TI (Split Screen idêntico ao padrão do sistema)
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

    // Elemento de aviso/erro formatado com a classe do sistema (.aviso-login)
    const aviso = el('div', { class: 'aviso-login ' + (opcoes.mensagem ? '' : 'oculto'), role: 'alert' }, [opcoes.mensagem || '']);
    const mostrarErro = (texto) => {
      aviso.textContent = texto;
      if (texto) {
        aviso.classList.remove('oculto');
      } else {
        aviso.classList.add('oculto');
      }
    };

    // Campos do formulário de TI
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
    
    // Botão de mostrar/ocultar senha integrado no estilo de campos
    const olho = el('button', { 
      type: 'button', 
      style: 'background: none; border: none; font-size: 0.75rem; color: #1b313a; cursor: pointer; font-weight: 600; float: right; margin-top: 4px;',
      onClick: () => {
        const mostrar = senha.type === 'password';
        senha.type = mostrar ? 'text' : 'password';
        olho.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      } 
    }, ['Mostrar']);

    const botao = el('button', { type: 'submit', class: 'btn-primario' }, ['Entrar']);

    // Formulário de submissão com a lógica de autenticação original do TI
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

          // Define o funcionário comum na sessão local ativa
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
        olho
      ]),
      botao,
      aviso
    ]);

    // Montagem exata da estrutura Split Screen visual ("UNI CHAMADAS") idêntica à outra tela
    const estruturaHTML = el('div', { id: 'tela-login' }, [
      el('div', { class: 'login-wrapper' }, [
        
        // Lado Esquerdo: Banner com a marca e os arcos decorativos rotativos
        el('div', { class: 'login-banner' }, [
          el('div', { class: 'arco-decorativo arco-topo' }),
          el('div', { class: 'login-brand' }, [
            el('h1', { class: 'logo-uni' }, ['UNI']),
            el('span', { class: 'logo-sub' }, ['CHAMADAS'])
          ]),
          el('div', { class: 'arco-decorativo arco-base' })
        ]),

        // Lado Direito: Carteirinha de Acesso com o topo decorado e identificação do Painel TI
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

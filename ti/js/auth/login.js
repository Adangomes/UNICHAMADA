/**
 * login.js — tela de login do TI (Coordenação via Auth, Funcionários via tabela ti_funcionarios).
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
        console.log('A tentar procurar via RPC:', { email: valEmail });

        const { data: funcionarios, error: dbErr } = await TI.db
          .rpc('verificar_login_funcionario', {
            p_email: valEmail,
            p_senha: valSenha
          });

        console.log('Resultado do RPC:', { funcionarios, dbErr });

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

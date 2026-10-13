/**
 * login.js — tela de login do TI (E-mail + RA para funcionários, ou E-mail + Senha para o Coordenador).
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

    const email = el('input', { class: 'ti-lg-input', type: 'email', autocomplete: 'username', placeholder: 'E-mail profissional', 'aria-label': 'E-mail' });
    const raOuSenha = el('input', { class: 'ti-lg-input', type: 'text', autocomplete: 'current-password', placeholder: 'RA / Matrícula ou Senha', 'aria-label': 'RA ou Senha' });
    
    const botao = el('button', { class: 'ti-lg-botao', type: 'submit' }, ['Entrar']);

    const form = el('form', { class: 'ti-lg-form', novalidate: true, onSubmit: async (e) => {
      e.preventDefault();
      mostrarErro('');
      const valEmail = email.value.trim().toLowerCase();
      const valChave = raOuSenha.value.trim();

      if (!valEmail || !valChave) { 
        mostrarErro('Preencha o e-mail e o RA/matrícula (ou senha para coordenador).'); 
        return; 
      }

      botao.disabled = true;
      botao.textContent = 'A a entrar…';

      try {
        // 1. Tenta autenticar como Coordenador (via Supabase Auth - E-mail e Senha)
        try {
          await TI.sessao.entrar(valEmail, valChave);
          await opcoes.aoEntrar();
          return;
        } catch (authErr) {
          // Se falhou no Auth, pode ser um funcionário comum autenticando por E-mail + RA
        }

        // 2. Se não for Auth, valida se é um funcionário cadastrado na tabela ti_funcionarios via E-mail + RA
        const resp = await TI.db
          .from('ti_funcionarios')
          .select('*')
          .eq('email', valEmail)
          .eq('ra', valChave)
          .eq('ativo', true)
          .maybeSingle();

        const funcionario = TI.dados.tratar(resp);

        if (!funcionario) {
          throw new Error('E-mail ou RA incorretos (ou conta inativa).');
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
      el('div', { class: 'ti-lg-campo' }, [raOuSenha]),
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

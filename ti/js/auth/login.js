/**
 * js/login/login.js
 * Componente da Tela de Login do TI (Espelhado exatamente no formato do professor)
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} container  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(container, opcoes) {
    if (!container) return;

    // Monta o HTML idêntico ao do professor, adaptado para os campos e textos de TI
    container.innerHTML = `
      <div class="login-wrapper">
        
        <!-- LADO ESQUERDO: BANNER E MARCA -->
        <div class="login-banner">
          <div class="arco-decorativo arco-topo"></div>
          <div class="login-brand">
            <h1 class="logo-uni">UNI</h1>
            <span class="logo-sub">CHAMADAS</span>
          </div>
          <div class="arco-decorativo arco-base"></div>
        </div>

        <!-- LADO DIREITO: CARD DE LOGIN -->
        <div class="carteirinha-login">
          <div class="carteirinha-topo">
            <span class="selo">Painel TI</span>
            <h1>Acesso</h1>
          </div>
          <div class="carteirinha-corpo">
            <p class="instrucao">Informe suas credenciais para acessar o painel.</p>
            
            <form id="form-login" onsubmit="return false;" novalidate>
              <div class="campo">
                <label for="input-email">E-mail</label>
                <input 
                  id="input-email" 
                  name="email" 
                  type="email" 
                  autocomplete="username" 
                  required 
                />
              </div>
              
              <div class="campo" style="position: relative;">
                <label for="input-senha">Senha</label>
                <input 
                  id="input-senha" 
                  name="senha" 
                  type="password" 
                  autocomplete="current-password" 
                  required 
                />
                <button 
                  type="button" 
                  id="btn-mostrar-senha"
                  style="position: absolute; right: 12px; top: 36px; background: none; border: none; font-size: 0.75rem; color: #1b313a; cursor: pointer; font-weight: 600;"
                >Mostrar</button>
              </div>
              
              <button type="submit" class="btn-primario">Entrar</button>
            </form>
            
            <p id="aviso-login" class="aviso-login oculto">${opcoes.mensagem || ''}</p>
          </div>
        </div>

      </div>
    `;

    // Se houver mensagem inicial passada pelas opções, exibe o aviso
    const aviso = container.querySelector('#aviso-login');
    if (opcoes.mensagem && aviso) {
      aviso.classList.remove('oculto');
    }

    const form = container.querySelector('#form-login');
    const inputSenha = container.querySelector('#input-senha');
    const btnMostrarSenha = container.querySelector('#btn-mostrar-senha');

    if (!form) return;

    // Funcionalidade de alternar visibilidade da senha
    if (btnMostrarSenha && inputSenha) {
      btnMostrarSenha.addEventListener('click', () => {
        const mostrar = inputSenha.type === 'password';
        inputSenha.type = mostrar ? 'text' : 'password';
        btnMostrarSenha.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      });
    }

    // Associa o evento de envio (Submit) com a lógica híbrida do TI
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      
      const email = form.email ? form.email.value.trim().toLowerCase() : '';
      const senha = form.senha ? form.senha.value.trim() : '';
      const botao = form.querySelector('button[type="submit"]');

      if (!email || !senha) {
        exibirAvisoLogin(aviso, 'Informe o e-mail e a senha de acesso.');
        return;
      }

      if (botao) {
        botao.disabled = true;
        botao.textContent = 'Entrando…';
      }

      try {
        let logouComoCoordenador = false;

        // 1. Tenta autenticar primeiro como Coordenador no Supabase Auth
        try {
          await TI.sessao.entrar(email, senha);
          logouComoCoordenador = true;
        } catch (authErr) {
          // Se falhou no Auth, prossegue para verificar se é funcionário na tabela
        }

        if (logouComoCoordenador) {
          if (typeof opcoes.aoEntrar === 'function') {
            await opcoes.aoEntrar();
          }
          return;
        }

        // 2. Valida se é um funcionário cadastrado chamando a função segura RPC no Supabase
        const { data: funcionarios, error: dbErr } = await TI.db
          .rpc('verificar_login_funcionario', {
            p_email: email,
            p_senha: senha
          });

        const funcionario = funcionarios && funcionarios.length > 0 ? funcionarios[0] : null;

        if (dbErr || !funcionario) {
          throw new Error('E-mail ou senha incorretos (ou conta inativa).');
        }

        // Define o funcionário na sessão local
        TI.sessao.funcionario = funcionario;

        if (aviso) aviso.classList.add('oculto');

        // Executa a navegação via callback
        if (typeof opcoes.aoEntrar === 'function') {
          await opcoes.aoEntrar(funcionario);
        }

      } catch (err) {
        exibirAvisoLogin(aviso, err.message || 'Erro ao efetuar login.');
        if (botao) {
          botao.disabled = false;
          botao.textContent = 'Entrar';
        }
      }
    });

    const inputEmail = container.querySelector('#input-email');
    if (inputEmail) inputEmail.focus();
  }
};

/**
 * Exibe mensagens de alerta na interface de login
 */
function exibirAvisoLogin(aviso, mensagem) {
  if (!aviso) return;
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

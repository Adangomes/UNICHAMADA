/**
 * js/login/login.js
 * Componente da Tela de Login do TI (Split Screen "UNI CHAMADAS")
 */

/**
 * Renderiza a estrutura HTML da tela de login e configura a submissão.
 * @param {HTMLElement} container - O elemento #tela-login
 * @param {Function} callbackSucesso - Função executada quando o login for válido
 */
function renderizarTelaLogin(container, callbackSucesso) {
  if (!container) return;

  // Monta o HTML exato exigido pelo login.css com os textos corretos do Painel TI
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
          <span class="selo">PAINEL TI</span>
          <h1>Acesso Geral</h1>
        </div>
        <div class="carteirinha-corpo">
          <p class="instrucao">Credenciais para equipe técnica e coordenação.</p>
          
          <form id="form-login" onsubmit="return false;" novalidate>
            <div class="campo">
              <label for="input-email">E-mail</label>
              <input 
                id="input-email" 
                name="email" 
                type="email" 
                placeholder="seu.email@unichamada.edu.br" 
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
                placeholder="••••••••" 
                autocomplete="current-password" 
                required 
              />
              <button 
                type="button" 
                id="btn-mostrar-senha"
                style="position: absolute; right: 12px; top: 38px; background: none; border: none; font-size: 0.8rem; color: #1b313a; cursor: pointer; font-weight: 600;"
              >Mostrar</button>
            </div>
            
            <button type="submit" class="btn-primario">Entrar</button>
          </form>
          
          <p id="aviso-login" class="aviso-login oculto"></p>
        </div>
      </div>

    </div>
  `;

  // Captura os elementos diretamente após a renderização
  const form = container.querySelector('#form-login');
  const aviso = container.querySelector('#aviso-login');
  const inputSenha = container.querySelector('#input-senha');
  const btnMostrarSenha = container.querySelector('#btn-mostrar-senha');

  if (!form) return;

  // Funcionalidade do botão Mostrar/Ocultar Senha
  if (btnMostrarSenha && inputSenha) {
    btnMostrarSenha.addEventListener('click', () => {
      const mostrar = inputSenha.type === 'password';
      inputSenha.type = mostrar ? 'text' : 'password';
      btnMostrarSenha.textContent = mostrar ? 'Ocultar' : 'Mostrar';
    });
  }

  // Associa o evento de envio (Submit) com a validação do Supabase/RPC
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
        if (typeof callbackSucesso === 'function') {
          callbackSucesso();
        }
        return;
      }

      // 2. Valida se é um funcionário cadastrado chamando a RPC no Supabase
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

      // Executa a navegação via callback para o main.js
      if (typeof callbackSucesso === 'function') {
        callbackSucesso(funcionario);
      }

    } catch (err) {
      exibirAvisoLogin(aviso, err.message || 'Erro ao efetuar login.');
      if (botao) {
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    }
  });
}

/**
 * Exibe mensagens de alerta na interface de login
 */
function exibirAvisoLogin(aviso, mensagem) {
  if (!aviso) return;
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

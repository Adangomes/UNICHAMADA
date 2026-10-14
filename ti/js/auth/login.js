/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS" com autenticação TI)
 */

window.TI = window.TI || {};

/**
 * Renderiza a estrutura HTML da tela de login do TI e configura a submissão.
 * 
 * @param {HTMLElement} container O elemento #tela-login ou raiz
 * @param {Object} opcoes Objeto contendo { aoEntrar: Function, mensagem?: string }
 */
function renderizarTelaLogin(container, opcoes = {}) {
  if (!container) return;

  const mensagemInicial = opcoes.mensagem || '';

  // Monta o HTML combinando o layout Split Screen original com os campos de E-mail e Senha do TI
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
          <span class="selo">Painel de TI</span>
          <h1>Acesso</h1>
        </div>
        <div class="carteirinha-corpo">
          <p class="instrucao">Informe suas credenciais profissionais para acessar o painel.</p>
          
          <form id="form-login" novalidate>
            <div class="campo">
              <label for="input-email">E-mail</label>
              <input 
                id="input-email" 
                name="email" 
                type="email" 
                autocomplete="username" 
                placeholder="seu.email@uni.edu.br"
                required 
              />
            </div>
            
            <div class="campo campo-senha">
              <label for="input-senha">Senha</label>
              <div class="senha-wrapper" style="position: relative; display: flex; align-items: center;">
                <input 
                  id="input-senha" 
                  name="senha" 
                  type="password" 
                  autocomplete="current-password" 
                  placeholder="Sua senha de acesso"
                  required 
                  style="width: 100%;"
                />
                <button 
                  type="button" 
                  id="btn-toggle-senha" 
                  class="ti-lg-olho" 
                  aria-label="Mostrar senha" 
                  aria-pressed="false"
                  style="position: absolute; right: 10px; background: none; border: none; cursor: pointer; font-size: 0.85rem;"
                >Mostrar</button>
              </div>
            </div>
            
            <button type="submit" id="btn-submit" class="btn-primario">Entrar</button>
          </form>
          
          <p id="aviso-login" class="aviso-login ${mensagemInicial ? '' : 'oculto'}">${mensagemInicial}</p>
        </div>
      </div>

    </div>
  `;

  // Captura os elementos diretamente após a renderização
  const form = container.querySelector('#form-login');
  const inputEmail = container.querySelector('#input-email');
  const inputSenha = container.querySelector('#input-senha');
  const btnToggleSenha = container.querySelector('#btn-toggle-senha');
  const botao = container.querySelector('#btn-submit');
  const aviso = container.querySelector('#aviso-login');

  if (!form) return;

  // Comportamento do botão para mostrar/ocultar senha
  if (btnToggleSenha && inputSenha) {
    btnToggleSenha.addEventListener('click', () => {
      const mostrar = inputSenha.type === 'password';
      inputSenha.type = mostrar ? 'text' : 'password';
      btnToggleSenha.textContent = mostrar ? 'Ocultar' : 'Mostrar';
      btnToggleSenha.setAttribute('aria-pressed', String(mostrar));
      btnToggleSenha.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    });
  }

  // Função auxiliar para exibir avisos
  const exibirAviso = (mensagem) => {
    if (!aviso) return;
    aviso.textContent = mensagem;
    aviso.classList.remove('oculto');
  };

  // Associa o evento de envio (Submit) com a lógica de autenticação do TI
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    aviso.classList.add('oculto');

    const valEmail = inputEmail ? inputEmail.value.trim().toLowerCase() : '';
    const valSenha = inputSenha ? inputSenha.value.trim() : '';

    if (!valEmail || !valSenha) {
      exibirAviso('Preencha o e-mail e a senha.');
      return;
    }

    botao.disabled = true;
    botao.textContent = 'Entrando…';

    try {
      let logouComoCoordenador = false;

      // 1. Tenta autenticar primeiro como Coordenador no Supabase Auth
      try {
        if (TI.sessao && typeof TI.sessao.entrar === 'function') {
          await TI.sessao.entrar(valEmail, valSenha);
          logouComoCoordenador = true;
        }
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
      
      if (typeof opcoes.aoEntrar === 'function') {
        await opcoes.aoEntrar();
      }

    } catch (err) {
      exibirAviso(err.message || 'Erro ao efetuar login.');
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  });

  // Foca no campo de e-mail ao carregar
  if (inputEmail) {
    inputEmail.focus();
  }
}

// Compatibilidade caso o sistema chame via TI.telas.login.render
window.TI.telas = window.TI.telas || {};
window.TI.telas.login = {
  render(raiz, opcoes) {
    renderizarTelaLogin(raiz, opcoes);
  }
};

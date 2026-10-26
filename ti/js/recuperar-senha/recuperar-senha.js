/**
 * js/recuperar-senha/recuperar-senha.js
 * Módulo de Recuperação de Senha via Supabase
 */

/**
 * Renderiza a estrutura HTML da tela de recuperação de senha e configura o envio.
 * 
 * @param {HTMLElement} container - O elemento DOM container onde a tela será injetada.
 */
function renderizarTelaRecuperacao(container) {
  if (!container) return;

  // Monta o HTML seguindo exatamente o design system do login.css
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

      <!-- LADO DIREITO: CARD DE RECUPERAÇÃO -->
      <div class="carteirinha-login">
        <div class="carteirinha-topo">
          <span class="selo">Segurança</span>
          <h1>Recuperar Senha</h1>
        </div>
        <div class="carteirinha-corpo">
          <p class="instrucao">Informe seu e-mail cadastrado para receber o link de redefinição de senha.</p>
          
          <form id="form-recuperacao" novalidate>
            <div class="campo">
              <label for="input-recupera-email">E-mail</label>
              <input 
                id="input-recupera-email" 
                name="email" 
                type="email" 
                placeholder="Digite seu e-mail" 
                autocomplete="off" 
                required 
              />
            </div>
            
            <button type="submit" id="btn-enviar" class="btn-primario">Enviar instruções</button>
          </form>

          <!-- Link para retornar à tela de login -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="#" id="link-voltar" style="color: #0284c7; font-size: 14px; text-decoration: none; font-weight: 500;">
              ← Voltar para o Login
            </a>
          </div>

          <!-- Mensagem de feedback (sucesso ou erro) -->
          <p id="aviso-recuperacao" class="aviso-login oculto"></p>
        </div>
      </div>

    </div>
  `;

  // Captura os elementos do DOM gerados
  const formRecuperacao = container.querySelector('#form-recuperacao');
  const inputEmail = container.querySelector('#input-recupera-email');
  const btnEnviar = container.querySelector('#btn-enviar');
  const aviso = container.querySelector('#aviso-recuperacao');
  const linkVoltar = container.querySelector('#link-voltar');

  // Função auxiliar para exibir mensagens de aviso/sucesso na tela
  const mostrarMensagem = (texto, tipo = 'erro') => {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.classList.remove('oculto');
    aviso.style.color = tipo === 'sucesso' ? '#16a34a' : '#dc2626'; // Verde para sucesso, vermelho para erro
  };

  // Evento de submissão do formulário de recuperação
  if (formRecuperacao) {
    formRecuperacao.addEventListener('submit', async (e) => {
      e.preventDefault();
      aviso.classList.add('oculto');

      const email = inputEmail.value.trim().toLowerCase();

      if (!email) {
        mostrarMensagem('Por favor, informe seu e-mail.');
        return;
      }

      btnEnviar.disabled = true;
      btnEnviar.textContent = 'Enviando...';

      try {
        // Integração nativa com a API de recuperação do Supabase Auth
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + window.location.pathname, // Redireciona de volta após clicar no link do e-mail
        });

        if (error) throw error;

        mostrarMensagem('E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.', 'sucesso');
        inputEmail.value = '';
      } catch (err) {
        mostrarMensagem(err.message || 'Erro ao tentar enviar o e-mail de recuperação.');
      } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = 'Enviar instruções';
      }
    });
  }

  // Ação para o botão de voltar ao login (caso use roteador SPA)
  if (linkVoltar) {
    linkVoltar.addEventListener('click', (e) => {
      e.preventDefault();
      // Aqui você chama a função que renderiza o login novamente (ex: renderizarTelaLogin(container))
      if (typeof renderizarTelaLogin === 'function') {
        renderizarTelaLogin(container);
      }
    });
  }
}

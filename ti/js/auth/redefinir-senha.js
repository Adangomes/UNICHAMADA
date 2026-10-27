/**
 * js/auth/redefinir-senha.js
 * Módulo de Redefinição de Senha (após clicar no link do e-mail)
 */

function renderizarTelaRedefinirSenha(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="login-wrapper">
      
      <!-- LADO ESQUERDO: BANNER E MARCA -->
      <div class="login-banner">
        <div class="arco-decorativo arco-topo"></div>
        <div class="login-brand">
          <h1 class="logo-uni"><span class="u-destaque">U</span>NI</h1>
          <span class="logo-sub">CHAMADAS</span>
        </div>
        <div class="arco-decorativo arco-base"></div>
      </div>

      <!-- LADO DIREITO: CARD DE NOVA SENHA -->
      <div class="carteirinha-login">
        <div class="carteirinha-topo">
          <span class="selo">Segurança</span>
          <h1>Nova Senha</h1>
        </div>
        <div class="carteirinha-corpo">
          <p class="instrucao">Digite sua nova senha de acesso ao sistema.</p>
          
          <form id="form-redefinir" novalidate>
            <div class="campo">
              <label for="input-nova-senha">Nova Senha:</label>
              <div class="input-wrapper-flex">
                <input 
                  id="input-nova-senha" 
                  name="nova-senha" 
                  type="password" 
                  placeholder="Mínimo de 6 caracteres" 
                  autocomplete="new-password" 
                  required 
                />
                <button type="button" id="btn-toggle-senha" class="ti-lg-olho" aria-pressed="false" aria-label="Mostrar senha">
                  <svg id="icone-olho-senha" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            <button type="submit" id="btn-salvar-senha" class="btn-primario">Salvar nova senha</button>
          </form>

          <!-- Mensagem de feedback -->
          <p id="aviso-redefinir" class="aviso-login oculto"></p>
        </div>
      </div>

    </div>
  `;

  const formRedefinir = container.querySelector('#form-redefinir');
  const inputNovaSenha = container.querySelector('#input-nova-senha');
  const btnToggleSenha = container.querySelector('#btn-toggle-senha');
  const iconeOlhoSenha = container.querySelector('#icone-olho-senha');
  const btnSalvar = container.querySelector('#btn-salvar-senha');
  const aviso = container.querySelector('#aviso-redefinir');

  const mostrarMensagem = (texto, tipo = 'erro') => {
    if (!aviso) return;
    aviso.textContent = texto;
    aviso.classList.remove('oculto', 'sucesso', 'erro');
    aviso.classList.add(tipo);
  };

  // Botão do olho para ver/esconder a senha
  if (btnToggleSenha && inputNovaSenha && iconeOlhoSenha) {
    btnToggleSenha.addEventListener('click', (e) => {
      e.preventDefault();
      const mostrar = inputNovaSenha.type === 'password';
      inputNovaSenha.type = mostrar ? 'text' : 'password';
      btnToggleSenha.setAttribute('aria-pressed', String(mostrar));

      if (mostrar) {
        iconeOlhoSenha.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        btnToggleSenha.style.color = '#0284c7';
      } else {
        iconeOlhoSenha.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        btnToggleSenha.style.color = '#64748b';
      }
    });
  }

  // Submissão da nova senha para o Supabase
  if (formRedefinir) {
    formRedefinir.addEventListener('submit', async (e) => {
      e.preventDefault();
      aviso.classList.add('oculto');

      const novaSenha = inputNovaSenha.value.trim();

      if (!novaSenha || novaSenha.length < 6) {
        mostrarMensagem('A senha deve ter pelo menos 6 caracteres.', 'erro');
        return;
      }

      btnSalvar.disabled = true;
      btnSalvar.textContent = 'Atualizando...';

      try {
        // Atualiza a senha do usuário autenticado pelo token de recuperação
        const { error } = await TI.db.auth.updateUser({ password: novaSenha });

        if (error) throw error;

        mostrarMensagem('Senha alterada com sucesso! Redirecionando para o login...', 'sucesso');
        inputNovaSenha.value = '';

        setTimeout(() => {
          if (window.TI && window.TI.telas && typeof window.TI.telas.login.render === 'function') {
            window.TI.telas.login.render(container);
          } else {
            window.location.href = './';
          }
        }, 2000);

      } catch (err) {
        mostrarMensagem(err.message || 'Erro ao atualizar a senha. O link pode ter expirado.', 'erro');
        btnSalvar.disabled = false;
        btnSalvar.textContent = 'Salvar nova senha';
      }
    });
  }
}

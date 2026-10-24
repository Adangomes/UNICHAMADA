/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS")
 */

/**
 * Renderiza a estrutura HTML da tela de login e configura a submissão.
 * @param {HTMLElement} container - O elemento #tela-login
 */
function renderizarTelaLogin(container) {
  if (!container) return;

  // Monta o HTML exato exigido pelo login.css
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
          <span class="selo">Sistema Acadêmico</span>
          <h1>Acesso</h1>
        </div>
        <div class="carteirinha-corpo">
          <p class="instrucao"></p>
          
          <form id="form-login" novalidate>
            <div class="campo">
              <label for="input-ra">RA</label>
              <input 
                id="input-ra" 
                name="ra" 
                type="text" 
                data-mono="true" 
                autocomplete="off" 
                required 
              />
            </div>
            
            <div class="campo">
              <label for="input-email">E-mail</label>
              <input 
                id="input-email" 
                name="email" 
                type="email" 
                autocomplete="off" 
                required 
              />
            </div>
            
            <button type="submit" class="btn-primario">Entrar</button>
          </form>

          <p id="aviso-login" class="aviso-login oculto"></p>
        </div>
      </div>

    </div>
  `;

}

/**
 * Exibe mensagens de alerta na interface de login
 */
function exibirAvisoLogin(aviso, mensagem) {
  if (!aviso) return;
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

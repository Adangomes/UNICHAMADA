/**
 * js/login/login.js
 * Componente da Tela de Login
 */
function renderizarTelaLogin(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="login-wrapper">
      <!-- Lado Esquerdo: Marca, Cores e Formas Geométricas -->
      <div class="login-banner">
        <div class="arco-decorativo arco-topo"></div>
        <div class="login-brand">
          <h1 class="logo-uni">UNI</h1>
          <span class="logo-sub">CHAMADAS</span>
        </div>
        <div class="arco-decorativo arco-base"></div>
      </div>

      <!-- Lado Direito: Formulário de Acesso -->
      <div class="carteirinha-login">
        <div class="carteirinha-topo">
          <span class="selo">Sistema Acadêmico</span>
          <h1>Acesso</h1>
        </div>
        <div class="carteirinha-corpo">
          <p class="instrucao"></p>
          <form id="form-login" onsubmit="return false;" novalidate>
            <div class="campo">
              <label for="input-ra">RA</label>
              <input id="input-ra" name="ra" type="text" data-mono="true" autocomplete="off" required />
            </div>
            <div class="campo">
              <label for="input-email">E-mail</label>
              <input id="input-email" name="email" type="email" autocomplete="off" required />
            </div>
            <button type="submit" class="btn-primario">Entrar</button>
          </form>
          <p id="aviso-login" class="aviso-login oculto"></p>
        </div>
      </div>
    </div>
  `;
}

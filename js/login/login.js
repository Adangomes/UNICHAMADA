/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS")
 */

/**
 * Renderiza a estrutura HTML da tela de login e configura a submissão.
 * 
 * @param {HTMLElement} container O elemento #tela-login
 */
function renderizarTelaLogin(container) {
  if (!container) return;

  // Monta o HTML exato exigido pelo login.css com placeholders e alternância de visualização do RA
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
          <p class="instrucao">Informe suas credenciais para acessar o painel.</p>
          
          <form id="form-login" novalidate>
            <div class="campo">
              <label for="input-ra">RA</label>
              <div style="position: relative; display: flex; align-items: center; width: 100%;">
                <input 
                  id="input-ra" 
                  name="ra" 
                  type="password" 
                  placeholder="Digite seu RA" 
                  data-mono="true" 
                  autocomplete="off" 
                  required 
                  style="width: 100%; padding-right: 40px;"
                />
                <button type="button" id="btn-toggle-ra" aria-label="Mostrar/Esconder RA" style="position: absolute; right: 12px; background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center;">
                  <!-- Ícone de Olho (SVG) -->
                  <svg id="icone-olho-ra" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #666;">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="campo">
              <label for="input-email">E-mail</label>
              <input 
                id="input-email" 
                name="email" 
                type="email" 
                placeholder="Digite seu e-mail" 
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

  // Configura a lógica de esconder/mostrar o RA ao clicar no ícone do olho de forma segura
  const inputRa = container.querySelector('#input-ra');
  const btnToggleRa = container.querySelector('#btn-toggle-ra');

  if (btnToggleRa && inputRa) {
    btnToggleRa.addEventListener('click', (e) => {
      e.preventDefault(); // Evita qualquer comportamento padrão de submit
      const tipoAtual = inputRa.getAttribute('type');
      if (tipoAtual === 'password') {
        inputRa.setAttribute('type', 'text');
      } else {
        inputRa.setAttribute('type', 'password');
      }
    });
  }
}

/**
 * Exibe mensagens de alerta na interface de login
 */
function exibirAvisoLogin(aviso, mensagem) {
  if (!aviso) return;
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

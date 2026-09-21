/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS")
 */

/**
 * Renderiza a estrutura HTML da tela de login e configura a submissão.
 * @param {HTMLElement} container - O elemento #tela-login
 * @param {Function} callbackSucesso - Função executada quando o login for válido
 */
function renderizarTelaLogin(container, callbackSucesso) {
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
          <p class="instrucao">Informe suas credenciais para acessar o painel.</p>
          
          <form id="form-login" onsubmit="return false;" novalidate>
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

  // Captura o formulário diretamente após a renderização
  const form = container.querySelector('#form-login');
  const aviso = container.querySelector('#aviso-login');

  if (!form) return;

  // Associa o evento de envio (Submit)
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    
    const ra = form.ra ? form.ra.value.trim() : '';
    const email = form.email ? form.email.value.trim() : '';

    if (!campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
      exibirAvisoLogin(aviso, 'Informe RA e e-mail.');
      return;
    }

    const resultado = await autenticar(ra, email);

    if (!resultado) {
      exibirAvisoLogin(aviso, 'RA ou e-mail não encontrados. Nada foi aberto — confira os dados com a coordenação.');
      return;
    }

    if (aviso) aviso.classList.add('oculto');

    // Executa a navegação via callback para o main.js
    if (typeof callbackSucesso === 'function') {
      callbackSucesso(resultado);
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

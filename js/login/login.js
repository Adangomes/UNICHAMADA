/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS")
 * 
 * Este arquivo é responsável por renderizar a interface de autenticação acadêmica,
 * gerenciar a interatividade de exibição de credenciais (olho mágico do RA) e 
 * fornecer o redirecionamento rápido para o painel de colaboradores (TI).
 */

/**
 * Renderiza a estrutura HTML da tela de login e configura a submissão e interatividade.
 * 
 * @param {HTMLElement} container - O elemento DOM container onde a tela de login será injetada (#tela-login).
 */
function renderizarTelaLogin(container) {
  // Verificação de segurança: se o container não existir na página, interrompe a execução para evitar erros no console.
  if (!container) return;

  // Injeta a estrutura HTML exata exigida pelo 'login.css', contendo o layout split-screen,
  // os inputs com placeholders, o ícone interativo do olho e o link de acesso para colaboradores.
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
          <!-- Texto de instrução para guiar o usuário na tela de acesso -->
          <p class="instrucao"></p>
          
          <!-- Formulário principal de autenticação do aluno -->
          <form id="form-login" novalidate>
            
            <!-- Campo de RA com suporte a mascaramento de senha e botão de alternância -->
            <div class="campo">
              <label for="input-ra">RA</label>
              <!-- Wrapper relativo para posicionar o botão do olho absoluto dentro do input sem quebrar o CSS -->
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
                <!-- Botão do ícone do olho para mostrar/esconder o RA digitado -->
                <button type="button" id="btn-toggle-ra" aria-label="Mostrar/Esconder RA" style="position: absolute; right: 12px; background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center;">
                  <!-- Ícone de Olho SVG (Padrão inicial: Fechado/Oculto) -->
                  <svg id="icone-olho-ra" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #666;">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- Campo de E-mail do aluno -->
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
            
            <!-- Botão de submissão do formulário -->
            <button type="submit" class="btn-primario">Entrar</button>
          </form>

          <!-- Link de acesso rápido para o painel de colaboradores (TI) -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://adangomes.github.io/UNICHAMADA/ti/" style="color: #0284c7; font-size: 14px; text-decoration: none; font-weight: 500;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
              Acesso UNICHAMADAS Colaboradores
            </a>
          </div>

          <!-- Elemento de aviso/feedback de erro de login (controlado via JS) -->
          <p id="aviso-login" class="aviso-login oculto"></p>
        </div>
      </div>

    </div>
  `;

  // Seleciona os elementos recém-criados no DOM para adicionar os comportamentos interativos
  const inputRa = container.querySelector('#input-ra');
  const btnToggleRa = container.querySelector('#btn-toggle-ra');

  // Configura o evento de clique no botão do olho para alternar a visibilidade do RA com segurança
  if (btnToggleRa && inputRa) {
    btnToggleRa.addEventListener('click', (e) => {
      // e.preventDefault() é fundamental aqui para garantir que o clique no botão 
      // dentro do form nunca dispare o evento de submit acidentalmente.
      e.preventDefault(); 
      
      const tipoAtual = inputRa.getAttribute('type');
      
      // Alterna o tipo do input entre 'password' (oculto) e 'text' (visível)
      if (tipoAtual === 'password') {
        inputRa.setAttribute('type', 'text');
      } else {
        inputRa.setAttribute('type', 'password');
      }
    });
  }
}

/**
 * Exibe mensagens de alerta ou erro na interface de login.
 * 
 * @param {HTMLElement} aviso - O elemento DOM da mensagem de aviso (#aviso-login).
 * @param {string} mensagem - O texto descritivo do erro ou aviso a ser exibido.
 */
function exibirAvisoLogin(aviso, mensagem) {
  // Valida se o elemento de aviso existe para evitar quebras
  if (!aviso) return;
  
  // Atribui o texto da mensagem e remove a classe 'oculto' para torná-la visível ao usuário
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS")
 * Integrado com a autenticação de alunos via tabela 'alunos'
 */

function renderizarTelaLogin(container) {
  if (!container) return;

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
          <h1>Acesso do Aluno</h1>
        </div>
        <div class="carteirinha-corpo">
          <p class="instrucao"></p>
          
          <!-- Formulário principal de autenticação do aluno -->
          <form id="form-login" novalidate>
            
            <!-- Campo de RA com suporte a alternância de visibilidade -->
            <div class="campo">
              <label for="input-ra">RA:</label>
              <div class="input-wrapper-flex">
                <input 
                  id="input-ra" 
                  name="ra" 
                  type="password" 
                  placeholder="Digite seu RA" 
                  data-mono="true" 
                  autocomplete="off" 
                  required 
                />
                <button type="button" id="btn-toggle-ra" class="ti-lg-olho" aria-pressed="false" aria-label="Mostrar RA">
                  <!-- Ícone padrão: Olho Fechado / Oculto -->
                  <svg id="icone-olho-ra" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                </button>
              </div>
            </div>
            
            <!-- Campo de E-mail do aluno -->
            <div class="campo">
              <label for="input-email">E-mail:</label>
              <input 
                id="input-email" 
                name="email" 
                type="email" 
                placeholder="Digite seu e-mail" 
                autocomplete="off" 
                required 
              />
            </div>
            
            <!-- Botão de submissão -->
            <button type="submit" id="btn-entrar" class="btn-primario">Entrar</button>
          </form>

          <!-- Link de acesso rápido para colaboradores (TI) com transição suave -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://adangomes.github.io/UNICHAMADA/ti/" id="link-colaboradores" style="color: #0284c7; font-size: 14px; text-decoration: none; font-weight: 500;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
              Acesso UNICHAMADAS Colaboradores
            </a>
          </div>

          <!-- Elemento de aviso/feedback de erro -->
          <p id="aviso-login" class="aviso-login oculto"></p>
        </div>
      </div>

    </div>
  `;

  // Seleciona os elementos do DOM
  const inputRa = container.querySelector('#input-ra');
  const inputEmail = container.querySelector('#input-email');
  const btnToggleRa = container.querySelector('#btn-toggle-ra');
  const iconeOlhoRa = container.querySelector('#icone-olho-ra');
  const formLogin = container.querySelector('#form-login');
  const avisoLogin = container.querySelector('#aviso-login');
  const btnEntrar = container.querySelector('#btn-entrar');
  const linkColaboradores = container.querySelector('#link-colaboradores');

  // Alternar visibilidade do RA (olho mágico com troca de SVG e cores)
  if (btnToggleRa && inputRa && iconeOlhoRa) {
    btnToggleRa.addEventListener('click', (e) => {
      e.preventDefault(); 
      const mostrar = inputRa.type === 'password';
      inputRa.type = mostrar ? 'text' : 'password';
      btnToggleRa.setAttribute('aria-pressed', String(mostrar));
      btnToggleRa.setAttribute('aria-label', mostrar ? 'Ocultar RA' : 'Mostrar RA');

      if (mostrar) {
        iconeOlhoRa.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        btnToggleRa.style.color = '#0284c7';
      } else {
        iconeOlhoRa.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        btnToggleRa.style.color = '#64748b';
      }
    });
  }

  // Efeito de transição suave e loading ao clicar no link de colaboradores (TI)
  if (linkColaboradores) {
    linkColaboradores.addEventListener('click', (e) => {
      e.preventDefault();
      const destinoUrl = linkColaboradores.getAttribute('href');
      const carteirinhaDireita = container.querySelector('.carteirinha-login');
      
      if (!carteirinhaDireita) {
        window.location.href = destinoUrl;
        return;
      }

      carteirinhaDireita.classList.add('fade-out');

      setTimeout(() => {
        carteirinhaDireita.innerHTML = `
          <div class="spinner-container" style="text-align: center; padding: 40px 0;">
            <div class="spinner-circular"></div>
            <span class="spinner-texto" style="display: block; margin-top: 15px; color: #666;">Carregando painel...</span>
          </div>
        `;
        carteirinhaDireita.classList.remove('fade-out');

        setTimeout(() => {
          carteirinhaDireita.classList.add('fade-out');
          setTimeout(() => {
            window.location.href = destinoUrl;
          }, 200);
        }, 500);

      }, 350);
    });
  }

  // Lógica de submissão do formulário consultando a tabela de alunos
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      avisoLogin.classList.add('oculto');

      const raVal = inputRa.value.trim();
      const emailVal = inputEmail.value.trim();

      if (!raVal || !emailVal) {
        exibirAvisoLogin(avisoLogin, 'Por favor, informe seu RA e e-mail.');
        return;
      }

      btnEntrar.disabled = true;
      btnEntrar.textContent = 'Validando...';

      try {
        if (!window.PainelAluno || typeof window.PainelAluno.entrar !== 'function') {
          throw new Error('Módulo do painel do aluno não carregado.');
        }

        const sucesso = await window.PainelAluno.entrar(raVal, emailVal);

        if (!sucesso) {
          exibirAvisoLogin(avisoLogin, 'Aluno não encontrado. Verifique o RA e o e-mail informados.');
        }

      } catch (err) {
        console.error('Erro na autenticação do aluno:', err);
        exibirAvisoLogin(avisoLogin, 'Erro ao conectar com o banco de dados. Tente novamente.');
      } finally {
        btnEntrar.disabled = false;
        btnEntrar.textContent = 'Entrar';
      }
    });
  }
}

function exibirAvisoLogin(aviso, mensagem) {
  if (!aviso) return;
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

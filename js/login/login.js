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
          <p class="instrucao">Digite seu RA e e-mail cadastrados para acessar suas chamadas e frequências.</p>
          
          <!-- Formulário principal de autenticação do aluno -->
          <form id="form-login" novalidate>
            
            <!-- Campo de RA com suporte a alternância de visibilidade -->
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
            
            <!-- Botão de submissão -->
            <button type="submit" id="btn-entrar" class="btn-primario">Entrar</button>
          </form>

          <!-- Link de acesso rápido para colaboradores (TI) -->
          <div style="text-align: center; margin-top: 20px;">
            <a href="https://adangomes.github.io/UNICHAMADA/ti/" style="color: #0284c7; font-size: 14px; text-decoration: none; font-weight: 500;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">
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
  const formLogin = container.querySelector('#form-login');
  const avisoLogin = container.querySelector('#aviso-login');
  const btnEntrar = container.querySelector('#btn-entrar');

  // Alternar visibilidade do RA (olho mágico)
  if (btnToggleRa && inputRa) {
    btnToggleRa.addEventListener('click', (e) => {
      e.preventDefault(); 
      const tipoAtual = inputRa.getAttribute('type');
      inputRa.setAttribute('type', tipoAtual === 'password' ? 'text' : 'password');
    });
  }

  // Lógica de submissão do formulário consultando a tabela de alunos
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      avisoLogin.classList.add('oculto');

      const raVal = inputRa.value.trim();
      const emailVal = inputEmail.value.trim();

      if (!raVal && !emailVal) {
        exibirAvisoLogin(avisoLogin, 'Por favor, informe seu RA ou e-mail.');
        return;
      }

      btnEntrar.disabled = true;
      btnEntrar.textContent = 'Validando...';

      try {
        // Valida se o módulo DadosAluno carregou corretamente
        if (!window.DadosAluno || typeof window.DadosAluno.autenticar !== 'function') {
          throw new Error('Módulo de dados do aluno não carregado.');
        }

        // Consulta a tabela 'alunos' usando a função do seu script anterior
        const alunoEncontrado = await window.DadosAluno.autenticar(raVal, emailVal);

        if (!alunoEncontrado) {
          exibirAvisoLogin(avisoLogin, 'Aluno não encontrado. Verifique os dados informados.');
          return;
        }

        // Salva os dados do aluno autenticado na sessão do navegador
        sessionStorage.setItem('unichamada_aluno_atual', JSON.stringify(alunoEncontrado));

        // Redireciona ou carrega o painel do aluno para ele ver as presenças
        if (typeof window.carregarPainelAluno === 'function') {
          window.carregarPainelAluno(alunoEncontrado);
        } else {
          // Fallback: recarrega a página ou redireciona para a view do aluno
          window.location.reload();
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

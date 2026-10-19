/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS")
 */

function renderizarTelaLogin(container, callbackSucesso) {
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

      <!-- LADO DIREITO: CARD DE LOGIN -->
      <div class="carteirinha-login">
        <div class="carteirinha-topo">
          <h1>Acesso</h1>
        </div>
        <div class="carteirinha-corpo">
          
          <form id="form-login" onsubmit="return false;" novalidate>
            <div class="campo">
              <label for="input-ra">RA</label>
              <input 
                id="input-ra" 
                name="ra" 
                type="text" 
                data-mono="true" 
                autocomplete="off" 
                placeholder="Número do RA" 
                required 
              />
            </div>
            
            <div class="campo" style="position: relative;">
              <label for="input-email">E-mail</label>
              <input 
                id="input-email" 
                name="email" 
                type="password" 
                autocomplete="off" 
                placeholder="E-mail acadêmico" 
                required 
                style="padding-right: 45px;"
              />
              <button type="button" id="btn-olho-email" class="ti-lg-olho" aria-pressed="false" aria-label="Mostrar e-mail" style="position: absolute; right: 12px; top: 38px; border: 0; background: transparent; cursor: pointer; color: #64748b; display: flex; align-items: center; justify-content: center; padding: 4px;">
                <svg id="icone-olho-email" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
            
            <button type="submit" id="btn-submit" class="btn-primario" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>Entrar</span>
            </button>
          </form>

          <!-- DIVISOR "OU" & ACESSO COLABORADORES (SUPORTE / TI) -->
          <div class="divisor-login">
            <span>ou</span>
          </div>

          <button type="button" id="btn-colaboradores" class="btn-colaborador">
            Acessar UniChamada Colaboradores
          </button>
          
          <p id="aviso-login" class="aviso-login oculto"></p>
        </div>
      </div>

    </div>
  `;

  const form = container.querySelector('#form-login');
  const emailInput = container.querySelector('#input-email');
  const olhoBtn = container.querySelector('#btn-olho-email');
  const iconeOlho = container.querySelector('#icone-olho-email');
  const aviso = container.querySelector('#aviso-login');
  const btnColaboradores = container.querySelector('#btn-colaboradores');
  const btnSubmit = container.querySelector('#btn-submit');

  if (!form) return;

  if (olhoBtn && emailInput && iconeOlho) {
    olhoBtn.addEventListener('click', () => {
      const mostrar = emailInput.type === 'password';
      emailInput.type = mostrar ? 'text' : 'password';
      olhoBtn.setAttribute('aria-pressed', String(mostrar));
      olhoBtn.setAttribute('aria-label', mostrar ? 'Ocultar e-mail' : 'Mostrar e-mail');

      if (mostrar) {
        iconeOlho.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        olhoBtn.style.color = '#0284c7';
      } else {
        iconeOlho.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        olhoBtn.style.color = '#64748b';
      }
    });
  }

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    
    const ra = form.ra ? form.ra.value.trim() : '';
    const email = form.email ? form.email.value.trim() : '';

    if (!campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
      if (aviso) {
        aviso.textContent = 'Informe RA e e-mail.';
        aviso.className = 'aviso-login'; // Remove 'oculto' e força aparecer
      }
      return;
    }

    // FORÇA O AVISO A SUMIR TOTALMENTE (limpa o texto e esconde a classe)
    if (aviso) {
      aviso.textContent = '';
      aviso.className = 'aviso-login oculto';
    }

    // Transforma o botão em estado de carregamento com spinner
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
      </svg>
      <span>Verificando...</span>
    `;

    if (!document.getElementById('spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }

    try {
      let resultado = null;

      // 1. Tenta autenticar como Professor ou Coordenador
      if (typeof autenticar === 'function') {
        resultado = await autenticar(ra, email).catch(() => null);
      }

      // 2. Se não for colaborador, tenta autenticar como Aluno no Supabase
      if (!resultado && typeof PainelAluno !== 'undefined') {
        const alunoLogado = await PainelAluno.entrar(ra, email).catch(() => null);
        if (alunoLogado) {
          resultado = { tipo: 'aluno', dados: alunoLogado };
        }
      }

      // 3. Se falhou em absoluto, aí sim exibe o erro
      if (!resultado) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = `<span>Entrar</span>`;
        if (aviso) {
          aviso.textContent = 'RA ou e-mail não encontrados. Confira os dados informados.';
          aviso.className = 'aviso-login'; // Mostra o aviso de erro real
        }
        return;
      }

      // Se deu certo, garante que o aviso continua oculto antes de chamar o sucesso
      if (aviso) {
        aviso.textContent = '';
        aviso.className = 'aviso-login oculto';
      }

      if (typeof callbackSucesso === 'function') {
        callbackSucesso(resultado);
      }
    } catch (e) {
      console.error(e);
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `<span>Entrar</span>`;
      if (aviso) {
        aviso.textContent = 'Ocorreu um erro ao conectar com o servidor.';
        aviso.className = 'aviso-login';
      }
    }
  });
  if (btnColaboradores) {
    btnColaboradores.addEventListener('click', () => {
      window.location.href = 'https://adangomes.github.io/UNICHAMADA/ti/';
    });
  }
}

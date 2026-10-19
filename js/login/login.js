/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS")
 */

/**
 * Renderiza a estrutura HTML da tela de login e configura a submissão.
 * @param {HTMLElement} container O elemento #tela-login
 * @param {Function} callbackSucesso Função executada quando o login for válido
 */
function renderizarTelaLogin(container, callbackSucesso) {
  if (!container) return;

  // Monta o HTML com o campo de e-mail adaptado para receber o botão de olho funcional
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
            
            <button type="submit" class="btn-primario">Entrar</button>
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

  // Captura os elementos diretamente após a renderização
  const form = container.querySelector('#form-login');
  const emailInput = container.querySelector('#input-email');
  const olhoBtn = container.querySelector('#btn-olho-email');
  const iconeOlho = container.querySelector('#icone-olho-email');
  const aviso = container.querySelector('#aviso-login');
  const btnColaboradores = container.querySelector('#btn-colaboradores');

  if (!form) return;

  // Comportamento interativo do ícone de olho no campo de e-mail
  if (olhoBtn && emailInput && iconeOlho) {
    olhoBtn.addEventListener('click', () => {
      // Como o input começa como type="password" para ocultar, alternamos para "text" para mostrar
      const mostrar = emailInput.type === 'password';
      emailInput.type = mostrar ? 'text' : 'password';
      olhoBtn.setAttribute('aria-pressed', String(mostrar));
      olhoBtn.setAttribute('aria-label', mostrar ? 'Ocultar e-mail' : 'Mostrar e-mail');

      if (mostrar) {
        // Olho aberto (mostrando o texto)
        iconeOlho.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
        olhoBtn.style.color = '#0284c7';
      } else {
        // Olho fechado/cortado (ocultando o texto)
        iconeOlho.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
        olhoBtn.style.color = '#64748b';
      }
    });
  }

  // Associa o evento de envio (Submit unificado: Professor, Coordenador ou Aluno)
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    
    const ra = form.ra ? form.ra.value.trim() : '';
    const email = form.email ? form.email.value.trim() : '';

    if (!campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
      exibirAvisoLogin(aviso, 'Informe RA e e-mail.');
      return;
    }

    // 1. Tenta autenticar como Professor ou Coordenador
    let resultado = await autenticar(ra, email);

    // 2. Se não for colaborador, tenta autenticar diretamente na tabela de alunos do Supabase
    if (!resultado && typeof PainelAluno !== 'undefined') {
      const alunoLogado = await PainelAluno.entrar(ra, email);
      if (alunoLogado) {
        resultado = { tipo: 'aluno', dados: alunoLogado };
      }
    }

    if (!resultado) {
      exibirAvisoLogin(aviso, 'RA ou e-mail não encontrados. Nada foi aberto — confira os dados com a coordenação.');
      return;
    }

    if (aviso) aviso.classList.add('oculto');

    if (typeof callbackSucesso === 'function') {
      callbackSucesso(resultado);
    }
  });

  // Associa o clique do Acesso Colaboradores redirecionando para a página de TI
  if (btnColaboradores) {
    btnColaboradores.addEventListener('click', () => {
      window.location.href = 'https://adangomes.github.io/UNICHAMADA/ti/';
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

/**
 * login.js — tela de login do TI (Coordenação via Auth, Funcionários via tabela ti_funcionarios).
 * Usa a estrutura Split-Screen idêntica ao design principal do UniChamadas.
 */
window.TI = window.TI || {};

TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes) {

    raiz.innerHTML = `
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
            <h1>Acesso Restrito</h1>
          </div>
          <div class="carteirinha-corpo">
            
            <form id="form-login" novalidate>
              <div class="campo">
                <label for="input-email">E-mail:</label>
                <input 
                  id="input-email" 
                  name="email" 
                  type="email" 
                  autocomplete="username" 
                  placeholder="Digite seu e-mail" 
                  required 
                />
              </div>
              
              <!-- Campo de senha com alinhamento flex centralizado -->
              <div class="campo">
                <label for="input-senha">Senha:</label>
                <div class="input-wrapper-flex">
                  <input 
                    id="input-senha" 
                    name="senha" 
                    type="password" 
                    autocomplete="current-password" 
                    placeholder="Digite sua senha" 
                    required 
                  />
                  <button type="button" id="btn-olho-senha" class="ti-lg-olho" aria-pressed="false" aria-label="Mostrar senha">
                    <!-- Ícone padrão: Olho Fechado / Oculto -->
                    <svg id="icone-olho" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Link "Esqueci minha senha" -->
              <div style="margin-bottom: 15px;">
                <a href="#" id="link-esqueci-senha" style="color: #0284c7; font-size: 14px; text-decoration: none; font-weight: 500;">
                  Esqueci minha senha
                </a>
              </div>
              
              <button type="submit" id="btn-entrar" class="btn-primario">Entrar</button>
            </form>

            <p id="aviso-login" class="aviso-login oculto" role="alert"></p>
          </div>
        </div>

      </div>
    `;

    const form = raiz.querySelector('#form-login');
    const emailInput = raiz.querySelector('#input-email');
    const senhaInput = raiz.querySelector('#input-senha');
    const olhoBtn = raiz.querySelector('#btn-olho-senha');
    const iconeOlho = raiz.querySelector('#icone-olho');
    const botao = raiz.querySelector('#btn-entrar');
    const aviso = raiz.querySelector('#aviso-login');
    const linkEsqueciSenha = raiz.querySelector('#link-esqueci-senha');

    if (linkEsqueciSenha) {
      linkEsqueciSenha.addEventListener('click', (e) => {
        e.preventDefault();
        const carteirinhaDireita = raiz.querySelector('.carteirinha-login');
        if (!carteirinhaDireita) return;

        carteirinhaDireita.classList.add('fade-out');

        setTimeout(() => {
          carteirinhaDireita.innerHTML = `
            <div class="spinner-container">
              <div class="spinner-circular"></div>
              <span class="spinner-texto">Carregando...</span>
            </div>
          `;
          carteirinhaDireita.classList.remove('fade-out');

          setTimeout(() => {
            carteirinhaDireita.classList.add('fade-out');
            setTimeout(() => {
              if (typeof renderizarTelaRecuperacao === 'function') {
                renderizarTelaRecuperacao(raiz);
              } else {
                console.error("A função renderizarTelaRecuperacao não foi encontrada.");
              }
            }, 200);
          }, 400);
        }, 250);
      });
    }

    const mostrarErro = (texto) => {
      if (!aviso) return;
      aviso.textContent = texto;
      if (texto) {
        aviso.classList.remove('oculto');
      } else {
        aviso.classList.add('oculto');
      }
    };

    if (opcoes && opcoes.mensagem) {
      mostrarErro(opcoes.mensagem);
    }

    if (olhoBtn && senhaInput && iconeOlho) {
      olhoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const mostrar = senhaInput.type === 'password';
        senhaInput.type = mostrar ? 'text' : 'password';
        olhoBtn.setAttribute('aria-pressed', String(mostrar));
        olhoBtn.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');

        if (mostrar) {
          iconeOlho.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
          olhoBtn.style.color = '#0284c7';
        } else {
          iconeOlho.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
          olhoBtn.style.color = '#64748b';
        }
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        mostrarErro('');
        
        const valEmail = emailInput.value.trim().toLowerCase();
        const valSenha = senhaInput.value.trim();

        if (!valEmail || !valSenha) { 
          mostrarErro('Preencha o e-mail e a senha.'); 
          return; 
        }

        botao.disabled = true;
        botao.textContent = 'Entrando…';

        try {
          let logouComoCoordenador = false;

          try {
            await TI.sessao.entrar(valEmail, valSenha);
            logouComoCoordenador = true;
          } catch (authErr) {}

          if (logouComoCoordenador) {
            await opcoes.aoEntrar();
            return;
          }

          const { data: funcionarios, error: dbErr } = await TI.db
            .rpc('verificar_login_funcionario', {
              p_email: valEmail,
              p_senha: valSenha
            });

          const funcionario = funcionarios && funcionarios.length > 0 ? funcionarios[0] : null;

          if (dbErr || !funcionario) {
            throw new Error('E-mail ou senha incorretos (ou conta inativa).');
          }

          TI.sessao.funcionario = funcionario;
          await opcoes.aoEntrar();

        } catch (err) {
          mostrarErro(err.message || 'Erro ao efetuar login.');
          botao.disabled = false;
          botao.textContent = 'Entrar';
        }
      });
    }

    if (emailInput) {
      emailInput.focus();
    }
  }
};

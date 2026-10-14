/**
 * js/login/login.js
 * Componente da Tela de Login (Split Screen "UNI CHAMADAS" — TI)
 */

window.TI = window.TI || {};
window.TI.telas = window.TI.telas || {};

window.TI.telas.login = {
  /** @param {HTMLElement} raiz  @param {{aoEntrar:Function, mensagem?:string}} opcoes */
  render(raiz, opcoes = {}) {
    if (!raiz) return;

    const mensagemInicial = opcoes.mensagem || '';

    // Monta o HTML usando exatamente as classes do seu login.css original
    raiz.innerHTML = `
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
            <span class="selo">Painel de TI</span>
            <h1>Acesso</h1>
          </div>
          <div class="carteirinha-corpo">
            <p class="instrucao">Informe suas credenciais profissionais para acessar o painel.</p>
            
            <form id="form-login" novalidate>
              <div class="campo">
                <label for="input-email">E-mail</label>
                <input 
                  id="input-email" 
                  name="email" 
                  type="email" 
                  autocomplete="username" 
                  placeholder="seu.email@uni.edu.br"
                  required 
                />
              </div>
              
              <div class="campo">
                <label for="input-senha">Senha</label>
                <div style="position: relative; display: flex; align-items: center; width: 100%;">
                  <input 
                    id="input-senha" 
                    name="senha" 
                    type="password" 
                    autocomplete="current-password" 
                    placeholder="Sua senha de acesso"
                    required 
                    style="padding-right: 65px;"
                  />
                  <button 
                    type="button" 
                    id="btn-toggle-senha" 
                    aria-label="Mostrar senha" 
                    aria-pressed="false"
                    style="position: absolute; right: 12px; background: none; border: none; cursor: pointer; font-size: 0.8rem; color: #555; font-weight: 600;"
                  >Mostrar</button>
                </div>
              </div>
              
              <button type="submit" id="btn-submit" class="btn-primario">Entrar</button>
            </form>
            
            <p id="aviso-login" class="aviso-login ${mensagemInicial ? '' : 'oculto'}">${mensagemInicial}</p>
          </div>
        </div>

      </div>
    `;

    const form = raiz.querySelector('#form-login');
    const inputEmail = raiz.querySelector('#input-email');
    const inputSenha = raiz.querySelector('#input-senha');
    const btnToggleSenha = raiz.querySelector('#btn-toggle-senha');
    const botao = raiz.querySelector('#btn-submit');
    const aviso = raiz.querySelector('#aviso-login');

    if (!form) return;

    // Comportamento do botão para alternar entre Mostrar e Ocultar dentro da senha
    if (btnToggleSenha && inputSenha) {
      btnToggleSenha.addEventListener('click', () => {
        const mostrar = inputSenha.type === 'password';
        inputSenha.type = mostrar ? 'text' : 'password';
        btnToggleSenha.textContent = mostrar ? 'Ocultar' : 'Mostrar';
        btnToggleSenha.setAttribute('aria-pressed', String(mostrar));
        btnToggleSenha.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
      });
    }

    const exibirAviso = (mensagem) => {
      if (!aviso) return;
      aviso.textContent = mensagem;
      aviso.classList.remove('oculto');
    };

    // Submissão e lógica de autenticação do TI
    form.addEventListener('submit', async (evento) => {
      evento.preventDefault();
      aviso.classList.add('oculto');

      const valEmail = inputEmail ? inputEmail.value.trim().toLowerCase() : '';
      const valSenha = inputSenha ? inputSenha.value.trim() : '';

      if (!valEmail || !valSenha) {
        exibirAviso('Preencha o e-mail e a senha.');
        return;
      }

      botao.disabled = true;
      botao.textContent = 'Entrando…';

      try {
        let logouComoCoordenador = false;

        // 1. Tenta autenticar primeiro como Coordenador no Supabase Auth
        try {
          if (TI.sessao && typeof TI.sessao.entrar === 'function') {
            await TI.sessao.entrar(valEmail, valSenha);
            logouComoCoordenador = true;
          }
        } catch (authErr) {
          // Se falhar no Auth, prossegue para verificar funcionário na tabela
        }

        if (logouComoCoordenador) {
          if (typeof opcoes.aoEntrar === 'function') {
            await opcoes.aoEntrar();
          }
          return;
        }

        // 2. Valida funcionário via função RPC no Supabase
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
        
        if (typeof opcoes.aoEntrar === 'function') {
          await opcoes.aoEntrar();
        }

      } catch (err) {
        exibirAviso(err.message || 'Erro ao efetuar login.');
        botao.disabled = false;
        botao.textContent = 'Entrar';
      }
    });

    if (inputEmail) {
      inputEmail.focus();
    }
  }
};

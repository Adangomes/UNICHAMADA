/**
 * main.js — Ponto de entrada. Valida RA + e-mail e abre o painel correspondente.
 */

async function iniciarAplicacao() {
  const idChamadaTelao = obterIdDaUrl('telao');
  if (idChamadaTelao) {
    $('#tela-login').classList.add('oculto');
    $('#tela-telao').classList.remove('oculto');
    montarTelaTelao(idChamadaTelao);
    return;
  }

  const idChamadaNaUrl = obterIdDaUrl('presenca');
  if (idChamadaNaUrl) {
    $('#tela-login').classList.add('oculto');
    $('#tela-confirmar-presenca').classList.remove('oculto');
    montarTelaConfirmarPresenca(idChamadaNaUrl);
    return;
  }

  // 1. Injeta dinamicamente o HTML do login dentro da section #tela-login
  const containerLogin = $('#tela-login');
  if (containerLogin && typeof renderizarTelaLogin === 'function') {
    renderizarTelaLogin(containerLogin);
  }

  // 2. Configura os ouvintes de evento no formulário recém-injetado
  configurarFormularioLogin();

  if (!dbConfiguracaoValida()) {
    exibirAvisoLogin(
      $('#aviso-login'),
      'Supabase não configurado. Preencha URL e chave anon pública em js/data/config.js.'
    );
    return;
  }

  try {
    const sessaoExistente = obterSessao();
    if (sessaoExistente) abrirPainel(sessaoExistente);
  } catch (erro) {
    console.error('Não foi possível recuperar a sessão do usuário:', erro);
    exibirAvisoLogin($('#aviso-login'), 'Não foi possível verificar sua sessão. Confira a conexão e as permissões do Supabase.');
  }
}

function obterIdDaUrl(prefixo) {
  const hash = window.location.hash || '';
  const correspondencia = hash.match(new RegExp(`^#${prefixo}\\/(.+)$`));
  return correspondencia ? decodeURIComponent(correspondencia[1]) : null;
}

function configurarFormularioLogin() {
  const form = $('#form-login');
  const aviso = $('#aviso-login');

  if (!form) return;

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const ra = form.ra.value.trim();
    const email = form.email.value.trim();

    if (!campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
      exibirAvisoLogin(aviso, 'Informe RA e e-mail.');
      return;
    }

    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const perfil = await autenticar(ra, email);
      if (!perfil) {
        exibirAvisoLogin(aviso, 'RA ou e-mail não encontrados. Confira os dados com a coordenação.');
        return;
      }

      aviso.classList.add('oculto');
      salvarSessao(perfil);
      abrirPainel(perfil);
    } catch (erro) {
      console.error('Falha ao validar RA e e-mail:', erro);
      exibirAvisoLogin(aviso, 'Não foi possível validar o acesso. Confira a conexão e as permissões do Supabase.');
    } finally {
      botao.disabled = false;
    }
  });
}

function exibirAvisoLogin(aviso, mensagem) {
  if (!aviso) return;
  aviso.textContent = mensagem;
  aviso.classList.remove('oculto');
}

function abrirPainel(sessao) {
  $('#tela-login').classList.add('oculto');

  if (sessao.tipo === 'coordenador') {
    $('#tela-professor').classList.add('oculto');
    $('#tela-coordenador').classList.remove('oculto');
    montarPainelCoordenador(sessao);
  } else {
    $('#tela-coordenador').classList.add('oculto');
    $('#tela-professor').classList.remove('oculto');
    montarPainelProfessor(sessao);
  }
}

document.addEventListener('DOMContentLoaded', iniciarAplicacao);

window.addEventListener('unhandledrejection', (evento) => {
  console.error('Falha não tratada na aplicação:', evento.reason);
  if (typeof mostrarToast === 'function') {
    mostrarToast('A operação falhou. Confira a conexão, as permissões e o console do navegador.', 'erro');
  }
});

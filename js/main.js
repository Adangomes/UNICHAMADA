/**
 * main.js — Ponto de entrada. Confirma o código Supabase Auth e associa
 * RA + e-mail ao perfil do coordenador ou do professor.
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
    const sessaoExistente = await obterSessao();
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
  const formCodigo = $('#form-codigo-acesso');
  const aviso = $('#aviso-login');

  if (!form || !formCodigo) return;

  let credenciaisEmConfirmacao = null;

  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const ra = form.ra.value.trim();
    const email = form.email.value.trim();

    if (!campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
      exibirAvisoLogin(aviso, 'Informe RA e e-mail.');
      return;
    }

    if (!emailValido(email)) {
      exibirAvisoLogin(aviso, 'Informe um e-mail válido.');
      return;
    }

    const botao = form.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      await solicitarCodigoAcesso(email);
      credenciaisEmConfirmacao = { ra, email };
      form.classList.add('oculto');
      formCodigo.classList.remove('oculto');
      $('#input-codigo-acesso').focus();
      exibirAvisoLogin(aviso, 'Enviamos um código de acesso para o e-mail informado. Confira também a caixa de spam.');
    } catch (erro) {
      console.error('Falha ao solicitar código de acesso:', erro);
      exibirAvisoLogin(aviso, 'Não foi possível enviar o código. Confira o e-mail e a configuração do Supabase Auth.');
    } finally {
      botao.disabled = false;
    }
  });

  formCodigo.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!credenciaisEmConfirmacao) {
      formCodigo.classList.add('oculto');
      form.classList.remove('oculto');
      return;
    }

    const codigo = formCodigo.codigo.value.trim();
    if (!codigo) {
      exibirAvisoLogin(aviso, 'Informe o código enviado por e-mail.');
      return;
    }

    const botao = formCodigo.querySelector('button[type="submit"]');
    botao.disabled = true;
    try {
      const perfil = await confirmarCodigoAcesso(
        credenciaisEmConfirmacao.ra,
        credenciaisEmConfirmacao.email,
        codigo
      );
      if (!perfil) {
        exibirAvisoLogin(aviso, 'Esse e-mail não está cadastrado com o RA informado. Procure a coordenação.');
        return;
      }

      aviso.classList.add('oculto');
      credenciaisEmConfirmacao = null;
      abrirPainel(perfil);
    } catch (erro) {
      console.error('Falha ao confirmar código de acesso:', erro);
      exibirAvisoLogin(aviso, 'Código inválido/expirado ou acesso negado pelo Supabase. Solicite um novo código.');
    } finally {
      botao.disabled = false;
    }
  });

  $('#btn-reenviar-codigo').addEventListener('click', async () => {
    if (!credenciaisEmConfirmacao) return;
    const botao = $('#btn-reenviar-codigo');
    botao.disabled = true;
    try {
      await solicitarCodigoAcesso(credenciaisEmConfirmacao.email);
      exibirAvisoLogin(aviso, 'Enviamos um novo código para o seu e-mail.');
    } catch (erro) {
      console.error('Falha ao reenviar código de acesso:', erro);
      exibirAvisoLogin(aviso, 'Não foi possível reenviar o código. Tente novamente.');
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

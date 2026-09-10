/**
 * main.js — Ponto de entrada. Controla a tela de login e decide, com base
 * em RA + e-mail, se abre o painel do coordenador ou o do professor.
 * Se as credenciais não baterem com nenhum cadastro, nada é aberto.
 */

function iniciarAplicacao() {
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

  const sessaoExistente = obterSessao();
  if (sessaoExistente) {
    abrirPainel(sessaoExistente);
    return;
  }
  configurarFormularioLogin();
}

function obterIdDaUrl(prefixo) {
  const hash = window.location.hash || '';
  const correspondencia = hash.match(new RegExp(`^#${prefixo}\\/(.+)$`));
  return correspondencia ? decodeURIComponent(correspondencia[1]) : null;
}

function configurarFormularioLogin() {
  const form = $('#form-login');
  const aviso = $('#aviso-login');

  // Adicionado 'async' aqui no evento de submit
  form.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const ra = form.ra.value.trim();
    const email = form.email.value.trim();

    if (!campoObrigatorioPreenchido(ra) || !campoObrigatorioPreenchido(email)) {
      exibirAvisoLogin(aviso, 'Informe RA e e-mail.');
      return;
    }

    // Adicionado 'await' aqui para o JavaScript esperar o Supabase responder de verdade
    const resultado = await autenticar(ra, email);

    if (!resultado) {
      exibirAvisoLogin(aviso, 'RA ou e-mail não encontrados. Nada foi aberto — confira os dados com a coordenação.');
      return;
    }

    aviso.classList.add('oculto');
    salvarSessao(resultado);
    abrirPainel(resultado);
  });
}

function exibirAvisoLogin(aviso, mensagem) {
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

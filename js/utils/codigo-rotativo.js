/**
 * codigo-rotativo.js — gera o código curto (ex.: "92C53D") mostrado
 * no telão/modal durante a chamada, e troca automaticamente a cada
 * INTERVALO_ROTACAO_MS.
 */

const INTERVALO_ROTACAO_MS = 45 * 1000;
const ALFABETO_CODIGO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem 0/O/1/I pra não confundir

function gerarCodigoChamada() {
  let codigo = '';
  for (let i = 0; i < 6; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return codigo;
}

window.INTERVALO_ROTACAO_MS = INTERVALO_ROTACAO_MS;
window.gerarCodigoChamada = gerarCodigoChamada;

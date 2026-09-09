/**
 * helpers.js — funções utilitárias reaproveitadas em todo o front-end.
 */

function $(seletor, contexto = document) {
  return contexto.querySelector(seletor);
}

function $all(seletor, contexto = document) {
  return Array.from(contexto.querySelectorAll(seletor));
}

function criarElemento(tag, propriedades = {}, filhos = []) {
  const el = document.createElement(tag);
  Object.entries(propriedades).forEach(([chave, valor]) => {
    if (chave === 'class') el.className = valor;
    else if (chave === 'html') el.innerHTML = valor;
    else if (chave.startsWith('on') && typeof valor === 'function') {
      el.addEventListener(chave.slice(2).toLowerCase(), valor);
    } else {
      el.setAttribute(chave, valor);
    }
  });
  filhos.forEach((filho) => {
    if (filho) el.appendChild(typeof filho === 'string' ? document.createTextNode(filho) : filho);
  });
  return el;
}

function mostrarToast(mensagem, tipo = 'info') {
  let container = $('.toast-container');
  if (!container) {
    container = criarElemento('div', { class: 'toast-container' });
    document.body.appendChild(container);
  }
  const toast = criarElemento('div', { class: `toast ${tipo}` }, [mensagem]);
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function iniciaisDoNome(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function formatarData(iso) {
  if (!iso) return '—';
  const data = new Date(iso);
  return data.toLocaleDateString('pt-BR');
}

function emailValido(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function campoObrigatorioPreenchido(valor) {
  return typeof valor === 'string' && valor.trim().length > 0;
}

function confirmarAcao(mensagem) {
  return window.confirm(mensagem);
}

const TURNOS = ['Matutino', 'Vespertino', 'Noturno'];

window.$ = $;
window.$all = $all;
window.criarElemento = criarElemento;
window.mostrarToast = mostrarToast;
window.iniciaisDoNome = iniciaisDoNome;
window.formatarData = formatarData;
window.emailValido = emailValido;
window.campoObrigatorioPreenchido = campoObrigatorioPreenchido;
window.confirmarAcao = confirmarAcao;
window.TURNOS = TURNOS;

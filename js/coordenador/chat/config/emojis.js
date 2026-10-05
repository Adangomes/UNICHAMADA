/* =========================================================
   UniChamada - Chat: emojis
   Para mudar/adicionar emojis, edite só a lista CATEGORIAS abaixo.
   Uso: ChatEmojis.abrir(botao, (emoji) => ...)
        ChatEmojis.inserirNoCampo(input, emoji)
   Estilo: css/chat/config/emojis.css
   ========================================================= */
(function () {
  'use strict';
  if (window.ChatEmojis) return;   // a pasta irmã tem uma cópia idêntica deste arquivo

  // >>> EDITE AQUI <<<
  const CATEGORIAS = [
    { id: 'rostos',  icone: '😀', nome: 'Rostos', emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '🙂', '😉', '😍',
      '😘', '😋', '😎', '🤔', '😐', '😴', '😢', '😭', '😡', '😱', '🤯', '🥳'] },
    { id: 'gestos',  icone: '👍', nome: 'Gestos', emojis: [
      '👍', '👎', '👏', '🙌', '🙏', '💪', '👋', '✌️', '🤝', '👌', '🤞', '👀',
      '☝️', '👊', '✍️', '🤙'] },
    { id: 'simbolos', icone: '❤️', nome: 'Símbolos', emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '💔', '💯', '✨', '🔥', '⭐',
      '🎉', '🎊', '✅', '❌', '⚠️', '❓', '❗', '💡'] },
    { id: 'escola',  icone: '📚', nome: 'Escola', emojis: [
      '📚', '📖', '📝', '✏️', '📅', '⏰', '🎓', '🏫', '💻', '📱', '📎', '📌',
      '📊', '📈', '🔔', '📢', '✉️', '🗂️', '🧾', '🔍'] },
    { id: 'dia',     icone: '☕', nome: 'Dia a dia', emojis: [
      '☕', '🍎', '🍕', '🍔', '🎂', '🍫', '🥤', '🌞', '🌧️', '🌈', '🐶', '🐱',
      '🌸', '🌳', '⚽', '🎵', '🚗', '✈️', '🏠', '🌎'] }
  ];
  const MAX_RECENTES = 16;
  const CHAVE_RECENTES = 'unichamada-chat-emojis-recentes';
  // >>> FIM DA ÁREA DE EDIÇÃO <<<

  let popup = null;

  function lerRecentes() {
    try { return JSON.parse(localStorage.getItem(CHAVE_RECENTES) || '[]'); } catch (e) { return []; }
  }
  function guardarRecente(emoji) {
    try {
      const lista = [emoji, ...lerRecentes().filter((e) => e !== emoji)].slice(0, MAX_RECENTES);
      localStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista));
    } catch (e) { /* sem armazenamento: ignora */ }
  }

  function fechar() {
    if (popup) { popup.remove(); popup = null; }
    document.removeEventListener('pointerdown', foraDoPopup, true);
    document.removeEventListener('keydown', teclas);
  }
  function foraDoPopup(e) {
    if (popup && !popup.contains(e.target) && !(popup._ancora && popup._ancora.contains(e.target))) fechar();
  }
  function teclas(e) { if (e.key === 'Escape') fechar(); }

  // Abre (ou fecha, se já estiver aberto) o seletor acima do botão
  function abrir(ancora, aoEscolher) {
    if (popup) { fechar(); return; }

    const categorias = [];
    const recentes = lerRecentes();
    if (recentes.length) categorias.push({ id: 'recentes', icone: '🕘', nome: 'Recentes', emojis: recentes });
    categorias.push(...CATEGORIAS);

    popup = document.createElement('div');
    popup.className = 'chat-emoji-popup';
    popup._ancora = ancora;

    const abas = document.createElement('div');
    abas.className = 'chat-emoji-abas';
    const grade = document.createElement('div');
    grade.className = 'chat-emoji-grade';

    function mostrar(cat) {
      abas.querySelectorAll('button').forEach((b) => b.classList.toggle('ativa', b.dataset.id === cat.id));
      grade.textContent = '';
      cat.emojis.forEach((emoji) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chat-emoji-item';
        b.textContent = emoji;
        b.addEventListener('click', () => { guardarRecente(emoji); aoEscolher(emoji); });
        grade.appendChild(b);
      });
    }

    categorias.forEach((cat) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chat-emoji-aba';
      b.dataset.id = cat.id;
      b.title = cat.nome;
      b.textContent = cat.icone;
      b.addEventListener('click', () => mostrar(cat));
      abas.appendChild(b);
    });

    popup.append(abas, grade);
    document.body.appendChild(popup);
    mostrar(categorias[0]);

    // posiciona acima do botão, sem sair da tela
    const r = ancora.getBoundingClientRect();
    const w = popup.offsetWidth;
    popup.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    popup.style.bottom = (window.innerHeight - r.top + 8) + 'px';

    document.addEventListener('pointerdown', foraDoPopup, true);
    document.addEventListener('keydown', teclas);
  }

  // Coloca o emoji na posição do cursor do campo de texto
  function inserirNoCampo(campo, emoji) {
    const ini = campo.selectionStart ?? campo.value.length;
    const fim = campo.selectionEnd ?? campo.value.length;
    campo.value = campo.value.slice(0, ini) + emoji + campo.value.slice(fim);
    const pos = ini + emoji.length;
    campo.focus();
    campo.setSelectionRange(pos, pos);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
  }

  window.ChatEmojis = { CATEGORIAS, abrir, fechar, inserirNoCampo };
})();

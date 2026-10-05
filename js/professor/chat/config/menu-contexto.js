/* =========================================================
   UniChamada - Chat: menu de contexto
   Abre um menu pequeno com botão direito (PC) ou ao segurar
   o dedo (celular/tablet) sobre um elemento.
   Uso: ChatMenu.vincular(elemento, () => [{ rotulo, icone, perigo, acao }])
   Estilo: css/chat/config/menu-contexto.css
   ========================================================= */
(function () {
  'use strict';
  if (window.ChatMenu) return;   // a pasta irmã tem uma cópia idêntica deste arquivo

  const TEMPO_SEGURAR = 450;     // ms para considerar "segurar"
  let menuAberto = null;
  let ultimaAbertura = 0;

  function fechar() {
    if (menuAberto) { menuAberto.remove(); menuAberto = null; }
  }

  function abrir(x, y, itens) {
    fechar();
    const lista = (itens || []).filter(Boolean);
    if (!lista.length) return;

    const menu = document.createElement('div');
    menu.className = 'chat-menu-ctx';
    menu.setAttribute('role', 'menu');
    lista.forEach((item) => {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.className = 'chat-menu-item' + (item.perigo ? ' perigo' : '');
      botao.setAttribute('role', 'menuitem');
      botao.textContent = (item.icone ? item.icone + '  ' : '') + item.rotulo;
      botao.addEventListener('click', (e) => { e.stopPropagation(); fechar(); item.acao(); });
      menu.appendChild(botao);
    });
    document.body.appendChild(menu);

    // mantém o menu inteiro dentro da tela
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + 'px';
    menu.style.top = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
    menuAberto = menu;
    ultimaAbertura = Date.now();
  }

  // Liga o menu a um elemento. obterItens() é chamado na hora de abrir (itens sempre atuais).
  function vincular(el, obterItens) {
    let timer = null, x = 0, y = 0, abriuPorToque = false;

    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      clearTimeout(timer);
      if (abriuPorToque) return;                 // o toque longo já abriu
      abrir(e.clientX, e.clientY, obterItens());
    });

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      x = t.clientX; y = t.clientY; abriuPorToque = false;
      clearTimeout(timer);
      timer = setTimeout(() => {
        abriuPorToque = true;
        abrir(x + 6, y + 14, obterItens());      // um pouco abaixo do dedo
        if (navigator.vibrate) navigator.vibrate(15);
      }, TEMPO_SEGURAR);
    }, { passive: true });

    el.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      if (Math.abs(t.clientX - x) > 10 || Math.abs(t.clientY - y) > 10) clearTimeout(timer);
    }, { passive: true });

    el.addEventListener('touchend', (e) => {
      clearTimeout(timer);
      if (abriuPorToque) {
        e.preventDefault();                      // evita o "clique" ao soltar o dedo
        setTimeout(() => { abriuPorToque = false; }, 600);
      }
    });
    el.addEventListener('touchcancel', () => clearTimeout(timer));
  }

  // true logo depois de um menu abrir (use para ignorar o clique ao soltar o dedo)
  function recemAberto() { return Date.now() - ultimaAbertura < 700; }

  document.addEventListener('pointerdown', (e) => {
    if (menuAberto && !menuAberto.contains(e.target)) fechar();
  }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
  window.addEventListener('resize', fechar);
  window.addEventListener('scroll', fechar, true);

  window.ChatMenu = { vincular, abrir, fechar, recemAberto };
})();

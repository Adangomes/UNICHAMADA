/**
 * Módulo Receptor do Trackpad Remoto (Modo Apresentação)
 * Comunicação em tempo real via Supabase Broadcast
 */
(function() {
  // Verifica se o Supabase já está carregado
  if (typeof supabase === 'undefined') {
    console.warn('Supabase SDK não encontrado para o trackpad.');
    return;
  }

  // Usa a mesma instância de cliente já configurada no projeto (ex: em db.js ou config.js)
  // Caso use uma instância global, basta conectá-la. Aqui criamos o canal de escuta:
  const channel = supabase.channel('unichamadas_trackpad');

  // Cria o cursor virtual estético na tela
  const cursor = document.createElement('div');
  cursor.id = 'virtual-trackpad-cursor';
  cursor.style.cssText = `
    position: fixed; width: 22px; height: 22px; background: #00f0ff;
    border-radius: 50%; box-shadow: 0 0 15px #00f0ff, 0 0 30px #00f0ff;
    pointer-events: none; z-index: 999999; transform: translate(-50%, -50%);
    display: none; transition: transform 0.05s linear;
  `;
  document.body.appendChild(cursor);

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;

  channel.on('broadcast', { event: 'trackpad_move' }, ({ payload }) => {
    cursor.style.display = 'block';
    mouseX += payload.deltaX * 1.8;
    mouseY += payload.deltaY * 1.8;
    mouseX = Math.max(0, Math.min(window.innerWidth, mouseX));
    mouseY = Math.max(0, Math.min(window.innerHeight, mouseY));
    cursor.style.left = `${mouseX}px`;
    cursor.style.top = `${mouseY}px`;
  });

  channel.on('broadcast', { event: 'trackpad_scroll' }, ({ payload }) => {
    window.scrollBy({ top: payload.deltaY * 2, behavior: 'smooth' });
  });

  channel.on('broadcast', { event: 'trackpad_click' }, () => {
    const target = document.elementFromPoint(mouseX, mouseY);
    if (target) {
      target.click();
      target.focus();
    }
  });

  channel.subscribe();
  console.log('[Trackpad] Receptor ativo e escutando comandos do mobile.');
})();

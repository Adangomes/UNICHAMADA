/**
 * Módulo Receptor do Trackpad Remoto (Modo Apresentação)
 * Comunicação em tempo real via Supabase Broadcast
 */
(function() {
  // Aguarda o carregamento dos scripts e do cliente Supabase
  window.addEventListener('DOMContentLoaded', () => {
    // Tenta encontrar o cliente ativo do Supabase (_supabase global do UniChamadas)
    const client = window._supabase || (typeof supabase !== 'undefined' && typeof supabase.channel === 'function' ? supabase : null);

    if (!client) {
      console.warn('[Trackpad] Instância do Supabase não encontrada.');
      return;
    }

    // Cria o canal de comunicação em tempo real
    const channel = client.channel('unichamadas_trackpad');

    // Cria o cursor virtual estético na tela do Mac/Telão
    const cursor = document.createElement('div');
    cursor.id = 'virtual-trackpad-cursor';
    cursor.style.cssText = `
      position: fixed; width: 22px; height: 22px; background: #00f0ff;
      border-radius: 50%; box-shadow: 0 0 15px #00f0ff, 0 0 30px #00f0ff;
      pointer-events: none; z-index: 999999; transform: translate(-50%, -50%);
      display: none; transition: left 0.04s linear, top 0.04s linear;
    `;
    document.body.appendChild(cursor);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    // Escuta movimento
    channel.on('broadcast', { event: 'trackpad_move' }, ({ payload }) => {
      cursor.style.display = 'block';
      mouseX += (payload.deltaX || 0) * 2.2;
      mouseY += (payload.deltaY || 0) * 2.2;

      // Mantém o cursor dentro dos limites da tela
      mouseX = Math.max(10, Math.min(window.innerWidth - 10, mouseX));
      mouseY = Math.max(10, Math.min(window.innerHeight - 10, mouseY));

      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
    });

    // Escuta rolagem (scroll)
    channel.on('broadcast', { event: 'trackpad_scroll' }, ({ payload }) => {
      window.scrollBy({ top: (payload.deltaY || 0) * 2.5, behavior: 'smooth' });
    });

    // Escuta clique
    channel.on('broadcast', { event: 'trackpad_click' }, () => {
      const target = document.elementFromPoint(mouseX, mouseY);
      if (target) {
        // Efeito visual rápido de clique
        cursor.style.transform = 'translate(-50%, -50%) scale(1.6)';
        setTimeout(() => cursor.style.transform = 'translate(-50%, -50%) scale(1)', 150);
        
        target.click();
        if (typeof target.focus === 'function') target.focus();
      }
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ [Trackpad Receptor] Conectado e escutando comandos mobile!');
      }
    });
  });
})();

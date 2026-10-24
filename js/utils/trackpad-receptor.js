/**
 * Módulo Receptor do Trackpad Remoto (Modo Apresentação)
 * Comunicação em tempo real via Supabase Broadcast - Com Salas Isoladas
 */
(function() {
  window.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_URL = 'https://xultvypwxwyxhxfzwqdw.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY';

    if (!window.supabase || !window.supabase.createClient) {
      console.warn('[Trackpad] SDK do Supabase não encontrado.');
      return;
    }

    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Cria ou recupera um ID de sala único persistente para este navegador
    let roomId = localStorage.getItem('unichamadas_room');
    if (!roomId) {
      roomId = 'sessao_' + Math.random().toString(36).substring(2, 8);
      localStorage.setItem('unichamadas_room', roomId);
    }

    const channel = client.channel(`unichamadas_trackpad_${roomId}`);

    const cursor = document.createElement('div');
    cursor.id = 'virtual-trackpad-cursor';
    cursor.style.cssText = `
      position: fixed; width: 22px; height: 22px; background: #00f0ff;
      border-radius: 50%; box-shadow: 0 0 15px #00f0ff, 0 0 30px #00f0ff;
      pointer-events: none; z-index: 999999; transform: translate(-50%, -50%);
      display: none; transition: none;
    `;
    document.body.appendChild(cursor);

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    channel.on('broadcast', { event: 'trackpad_move' }, ({ payload }) => {
      cursor.style.display = 'block';
      mouseX += (payload.deltaX || 0) * 1.5;
      mouseY += (payload.deltaY || 0) * 1.5;

      mouseX = Math.max(10, Math.min(window.innerWidth - 10, mouseX));
      mouseY = Math.max(10, Math.min(window.innerHeight - 10, mouseY));

      cursor.style.left = `${mouseX}px`;
      cursor.style.top = `${mouseY}px`;
    });

    channel.on('broadcast', { event: 'trackpad_scroll' }, ({ payload }) => {
      window.scrollBy({ top: (payload.deltaY || 0) * 2, behavior: 'instant' });
    });

    channel.on('broadcast', { event: 'trackpad_click' }, () => {
      const target = document.elementFromPoint(mouseX, mouseY);
      if (target) {
        cursor.style.transform = 'translate(-50%, -50%) scale(1.6)';
        setTimeout(() => cursor.style.transform = 'translate(-50%, -50%) scale(1)', 100);
        
        target.click();
        if (typeof target.focus === 'function') target.focus();
      }
    });

    channel.on('broadcast', { event: 'trackpad_disconnect' }, () => {
      cursor.style.display = 'none';
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`✅ [Trackpad Receptor] Conectado na Sala: ${roomId}`);
        console.log(`📱 Link para o seu celular: https://adangomes.github.io/UNICHAMADA/mousepad/?room=${roomId}`);
      }
    });
  });
})();

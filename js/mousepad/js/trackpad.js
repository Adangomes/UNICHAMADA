(function() {
  const SUPABASE_URL = 'https://xultvypwxwyxhxfzwqdw.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY';

  if (!window.supabase) return;

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const channel = client.channel('unichamadas_trackpad');
  channel.subscribe();

  const canvas = document.getElementById('canvas');
  const trackpadEl = document.getElementById('trackpad');
  const powerToggle = document.getElementById('power-toggle');
  
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  let isDisconnected = false;

  function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor(x, y) {
      this.x = x; this.y = y;
      this.size = Math.random() * 5 + 2;
      this.color = Math.random() > 0.5 ? '#00f0ff' : '#7000ff';
      this.alpha = 1;
    }
    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.restore();
    }
    update() {
      this.alpha -= 0.05;
      this.size *= 0.92;
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, index) => {
      p.update(); p.draw();
      if (p.alpha <= 0) particles.splice(index, 1);
    });
    requestAnimationFrame(animate);
  }
  animate();

  // Controle do Switch On/Off
  powerToggle.addEventListener('change', () => {
    isDisconnected = !powerToggle.checked;
    
    if (isDisconnected) {
      trackpadEl.classList.add('inactive');
      channel.send({ type: 'broadcast', event: 'trackpad_disconnect' });
    } else {
      trackpadEl.classList.remove('inactive');
      channel.send({ type: 'broadcast', event: 'trackpad_connect' });
    }
  });

  let lastX = 0, lastY = 0, touchStartTime = 0, touchCount = 0;
  let accumulatedDeltaX = 0;
  let accumulatedDeltaY = 0;
  let isSending = false;

  function flushMovement() {
    if (isDisconnected) return;
    if ((accumulatedDeltaX !== 0 || accumulatedDeltaY !== 0) && channel) {
      channel.send({
        type: 'broadcast',
        event: 'trackpad_move',
        payload: { deltaX: accumulatedDeltaX, deltaY: accumulatedDeltaY }
      });
      accumulatedDeltaX = 0;
      accumulatedDeltaY = 0;
    }
    isSending = false;
  }

  canvas.addEventListener('touchstart', (e) => {
    if (isDisconnected) return;
    touchCount = e.touches.length;
    touchStartTime = Date.now();
    if (touchCount === 1) {
      lastX = e.touches[0].clientX;
      lastY = e.touches[0].clientY;
    } else if (touchCount === 2) {
      lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  });

  canvas.addEventListener('touchmove', (e) => {
    if (isDisconnected) return;
    if (touchCount === 1 && e.touches.length === 1) {
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const deltaX = x - lastX;
      const deltaY = y - lastY;

      accumulatedDeltaX += deltaX;
      accumulatedDeltaY += deltaY;

      const rect = canvas.getBoundingClientRect();
      particles.push(new Particle(x - rect.left, y - rect.top));

      if (!isSending) {
        isSending = true;
        requestAnimationFrame(flushMovement);
      }

      lastX = x;
      lastY = y;
    } else if (touchCount === 2 && e.touches.length === 2) {
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const deltaY = lastY - currentY;

      channel.send({
        type: 'broadcast',
        event: 'trackpad_scroll',
        payload: { deltaY }
      });

      lastY = currentY;
    }
  });

  canvas.addEventListener('touchend', (e) => {
    if (isDisconnected) return;
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration < 200 && e.touches.length === 0) {
      channel.send({ type: 'broadcast', event: 'trackpad_click' });
    }
  });
})();

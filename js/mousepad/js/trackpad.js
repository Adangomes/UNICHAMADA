// Substitua pelas suas chaves do Supabase
const SUPABASE_URL = 'https://xultvypwxwyxhxfzwqdw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1bHR2eXB3eHd5eGh4Znp3cWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMDMyNDIsImV4cCI6MjEwNDU3OTI0Mn0.Ossrm1Iv0LzHnkWsKSbBUNAft4Aov8Z8bRbhC9vQMEY';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const channel = supabase.channel('unichamadas_trackpad');
channel.subscribe();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let width, height, particles = [];

function resize() {
  width = canvas.width = canvas.offsetWidth;
  height = canvas.height = canvas.offsetHeight;
}
window.addEventListener('resize', resize);
resize();

// Efeito Visual de Partículas Neon no Celular
class Particle {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.size = Math.random() * 7 + 3;
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
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.restore();
  }
  update() {
    this.alpha -= 0.035;
    this.size *= 0.94;
  }
}

function animate() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach((p, index) => {
    p.update(); p.draw();
    if (p.alpha <= 0) particles.splice(index, 1);
  });
  requestAnimationFrame(animate);
}
animate();

// Captura dos gestos Touch no Celular
let lastX = 0, lastY = 0, touchStartTime = 0, touchCount = 0;

canvas.addEventListener('touchstart', (e) => {
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
  if (touchCount === 1 && e.touches.length === 1) {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const deltaX = x - lastX;
    const deltaY = y - lastY;

    const rect = canvas.getBoundingClientRect();
    particles.push(new Particle(x - rect.left, y - rect.top));

    channel.send({
      type: 'broadcast', event: 'trackpad_move',
      payload: { deltaX, deltaY }
    });

    lastX = x; lastY = y;
  } else if (touchCount === 2 && e.touches.length === 2) {
    const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    const deltaY = lastY - currentY;

    channel.send({
      type: 'broadcast', event: 'trackpad_scroll',
      payload: { deltaY }
    });

    lastY = currentY;
  }
});

canvas.addEventListener('touchend', (e) => {
  const touchDuration = Date.now() - touchStartTime;
  if (touchDuration < 200 && e.touches.length === 0) {
    channel.send({ type: 'broadcast', event: 'trackpad_click' });
  }
});
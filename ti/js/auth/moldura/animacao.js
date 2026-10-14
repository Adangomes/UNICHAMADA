/**
 * animacao.js — o fundo animado do login (canvas): faixas diagonais em movimento, riscos de velocidade,
 * estrelas e um brilho que flutua. Parte da moldura do login (veja moldura.js).
 * As CORES e a velocidade estão no bloco "CORES" no começo da função.
 */
window.TI = window.TI || {};
TI.moldura = TI.moldura || {};

/** Desenha o fundo animado: faixas diagonais em movimento, riscos de velocidade, estrelas e um brilho que flutua. */
TI.moldura._animar = function (canvas, arte) {
  const ctx = canvas.getContext('2d');
  const reduzido = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- CORES (mude aqui) ----
  const COR_FUNDO_1 = '#070b22';
  const COR_FUNDO_2 = '#111b47';
  const FAIXAS = [                       // vao/esp são frações da diagonal do painel
    { vao: 0.16, esp: 0.07, cor: '#2f55c4' },
    { vao: 0.07, esp: 0.15, cor: '#f2e8d5' },
    { vao: 0.09, esp: 0.04, cor: '#7f98e6' }
  ];
  const ANGULO = 58 * Math.PI / 180;     // inclinação das faixas
  const VELOCIDADE = 0.018;              // quanto as faixas andam (fração da diagonal por segundo)

  const periodo = FAIXAS.reduce((s, f) => s + f.vao + f.esp, 0);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const riscos = Array.from({ length: 28 }, () => ({ q: rnd(-0.6, 0.6), s: Math.random(), vel: rnd(0.05, 0.16), len: rnd(0.05, 0.2), a: rnd(0.15, 0.55), e: rnd(0.6, 1.6) }));
  const estrelas = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), r: rnd(0.5, 1.5), f: rnd(0.6, 2.2), p: rnd(0, 6.28) }));
  const mouse = { x: 0, y: 0, ax: 0, ay: 0 };
  let w = 0, h = 0;

  arte.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.ax = (e.clientX - r.left) / r.width - 0.5;
    mouse.ay = (e.clientY - r.top) / r.height - 0.5;
  });

  function ajustar() {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return false;              // painel escondido (celular)
    if (cw !== w || ch !== h) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cw; h = ch;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    return true;
  }

  function desenhar(t) {
    mouse.x += (mouse.ax - mouse.x) * 0.05;
    mouse.y += (mouse.ay - mouse.y) * 0.05;
    const diag = Math.hypot(w, h);

    const fundo = ctx.createLinearGradient(0, 0, w, h);
    fundo.addColorStop(0, COR_FUNDO_1); fundo.addColorStop(1, COR_FUNDO_2);
    ctx.fillStyle = fundo; ctx.fillRect(0, 0, w, h);

    estrelas.forEach((s) => {
      ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * s.f + s.p));
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.2832); ctx.fill();
    });
    ctx.globalAlpha = 1;

    // faixas e riscos desenhados num espaço girado (as faixas ficam diagonais)
    ctx.save();
    ctx.translate(w / 2 + mouse.x * 18, h / 2 + mouse.y * 18);
    ctx.rotate(-ANGULO);
    const P = periodo * diag;
    const deriva = (t * diag * VELOCIDADE) % P;
    for (let base = -diag - P; base < diag + P; base += P) {
      let y = base + deriva;
      FAIXAS.forEach((f) => {
        y += f.vao * diag;
        ctx.fillStyle = f.cor;
        ctx.fillRect(-diag, y, diag * 2, f.esp * diag);
        y += f.esp * diag;
      });
    }
    riscos.forEach((r) => {
      const x = (((r.s + t * r.vel) % 1) - 0.5) * diag * 1.5;
      const y = r.q * diag * 0.6;
      const g = ctx.createLinearGradient(x - r.len * diag, y, x, y);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,' + r.a + ')');
      ctx.strokeStyle = g; ctx.lineWidth = r.e;
      ctx.beginPath(); ctx.moveTo(x - r.len * diag, y); ctx.lineTo(x, y); ctx.stroke();
    });
    ctx.restore();

    // brilho que flutua
    const ox = w * 0.74 + Math.sin(t * 0.35) * 22 - mouse.x * 26;
    const oy = h * 0.28 + Math.cos(t * 0.28) * 18 - mouse.y * 20;
    const orb = ctx.createRadialGradient(ox, oy, 0, ox, oy, w * 0.2);
    orb.addColorStop(0, 'rgba(242,232,213,0.85)'); orb.addColorStop(0.35, 'rgba(127,152,230,0.35)'); orb.addColorStop(1, 'rgba(127,152,230,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = orb; ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    // canto superior esquerdo escuro (como no desenho de referência)
    const apagar = ctx.createLinearGradient(0, 0, w * 0.85, h * 0.9);
    apagar.addColorStop(0, 'rgba(7,11,34,1)'); apagar.addColorStop(0.35, 'rgba(7,11,34,0.9)'); apagar.addColorStop(0.75, 'rgba(7,11,34,0)');
    ctx.fillStyle = apagar; ctx.fillRect(0, 0, w, h);
  }

  function quadro(ms) {
    if (!canvas.isConnected) return;           // a tela de login saiu: para de animar
    if (ajustar()) desenhar(ms / 1000);
    if (!reduzido) requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
  // quem pediu "reduzir movimento" vê um quadro parado (redesenhado só se a janela mudar)
  if (reduzido) window.addEventListener('resize', () => { if (canvas.isConnected && ajustar()) desenhar(3); });
};
